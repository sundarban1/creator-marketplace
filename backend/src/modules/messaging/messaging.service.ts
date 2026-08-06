import { ConversationStatus, Role } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { toConversationDto, toMessageDto } from './messaging.dto';
import { CreatorRepository } from '../creator/creator.repository';
import { BusinessRepository } from '../business/business.repository';
import { MessagingRepository } from './messaging.repository';
import { AdminRepository } from '../admin/admin.repository';
import { notificationService, sendExpoPush } from '../notifications/notification.service';
import { analyticsService } from '../analytics/analytics.service';
import { logActivity } from '../logging/activity.service';
import { ActivityAction, EntityType } from '../logging/logging.constants';
import { emitToUser } from '../../socket';
import prisma from '../../prisma';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'crypto';
import { uploadImage as uploadToCloudinary, uploadRawFile, generateVideoUploadSignature, videoThumbnailUrl, videoPlaybackUrl, deleteVideo, MAX_VIDEO_SIZE_BYTES, type VideoUploadSignature } from '../../utils/cloudinary';

// MP4 (H.264/AAC) is the preferred format; MOV is accepted and delivered as
// MP4 via videoPlaybackUrl. Legacy/poorly-supported formats (AVI, MKV, FLV,
// WMV, 3GP, ...) are rejected even if a client bypasses the mobile-side
// picker validation and uploads directly to Cloudinary.
const ALLOWED_VIDEO_FORMATS = new Set(['mp4', 'mov', 'qt']);
// Voice messages are also uploaded direct-to-Cloudinary (same signed-upload
// pattern as video, resource_type 'video' since Cloudinary has no separate
// "audio" resource type) — expo-audio's HIGH_QUALITY preset outputs .m4a on
// both platforms; the rest cover what a client-side re-encode or a stray
// Android device might actually produce.
const ALLOWED_VOICE_FORMATS = new Set(['m4a', 'mp4', 'aac', 'mp3', 'wav', 'webm', '3gp']);
const MAX_VOICE_SIZE_BYTES = 15 * 1024 * 1024;
import type { StartConversationInput, SendMessageInput } from './messaging.schema';
import type { DeliverableVideo } from '../campaign/campaign.dto';

const ATTACHMENT_IMAGE_TRANSFORMATION = [{ width: 1600, crop: 'limit' }];

// Per-user messages-per-minute tracker, module-level (not a class field) so
// it's shared across every MessagingService instance in this process —
// socket.ts and messaging.controller.ts each construct their own instance.
// Applies inside persistAndBroadcast, the one choke point every message type
// (text/image/file/video, over both the REST route and the socket path) goes
// through, so a spammer can't dodge the REST-only express-rate-limit
// middleware (perUserMessageLimiter) by sending over the socket instead.
const recentSendTimestamps = new Map<string, number[]>();
const MESSAGE_RATE_WINDOW_MS = 60_000;

async function assertMessageRateOk(adminRepo: AdminRepository, userId: string): Promise<void> {
  if ((await adminRepo.getSetting('rateLimit.messages.enabled')) === false) return;
  const maxPerMinute = Number(await adminRepo.getSetting('rateLimit.messages.maxPerMinute')) || 20;

  const now = Date.now();
  const recent = (recentSendTimestamps.get(userId) ?? []).filter((t) => now - t < MESSAGE_RATE_WINDOW_MS);
  if (recent.length >= maxPerMinute) {
    throw new AppError('You are sending messages too quickly. Please slow down.', 429);
  }
  recent.push(now);
  recentSendTimestamps.set(userId, recent);
}

type Participant = { userId: string; name: string; badgeRole: 'CREATOR' | 'BUSINESS'; profileId: string };

type ConversationWithParties = {
  creatorId: string;
  creatorId2: string | null;
  businessId: string | null;
  creator: { userId: string; fullName: string | null };
  creator2?: { userId: string; fullName: string | null } | null;
  business?: { userId: string; businessName: string | null } | null;
};

export class MessagingService {
  private repo:         MessagingRepository;
  private creatorRepo:  CreatorRepository;
  private businessRepo: BusinessRepository;
  private adminRepo:    AdminRepository;

  constructor() {
    this.repo         = new MessagingRepository();
    this.creatorRepo  = new CreatorRepository();
    this.businessRepo = new BusinessRepository();
    this.adminRepo    = new AdminRepository();
  }

  private async assertMessagingEnabled(): Promise<void> {
    if ((await this.adminRepo.getSetting('messaging.enabled')) === false) {
      throw new AppError('Messaging is currently disabled by the platform.', 403);
    }
  }

  // ── Profile resolution ─────────────────────────────────────────────────────

  private async resolveCreator(userId: string) {
    const creator = await this.creatorRepo.findByUserId(userId);
    if (!creator) throw new AppError('Creator profile not found', 404);
    return creator;
  }

  private async resolveBusiness(userId: string) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) throw new AppError('Business profile not found', 404);
    return business;
  }

  private async verifyConversationAccess(
    conversation: { creatorId: string; creatorId2: string | null; businessId: string | null },
    userId: string,
    role: Role,
  ) {
    if (role === 'ADMIN') return;
    if (role === 'CREATOR') {
      const creator = await this.resolveCreator(userId);
      if (creator.id !== conversation.creatorId && creator.id !== conversation.creatorId2) throw new AppError('Access denied', 403);
    } else if (role === 'BUSINESS') {
      const business = await this.resolveBusiness(userId);
      if (business.id !== conversation.businessId) throw new AppError('Access denied', 403);
    }
  }

  // Resolves the two participants of a conversation regardless of shape —
  // creator<->business (businessId set) or creator<->creator (creatorId2 set).
  // Replaces direct access to conversation.creator/conversation.business, which
  // would throw on a creator<->creator row since business is null there.
  private participantsOf(conversation: ConversationWithParties): [Participant, Participant] {
    const a: Participant = {
      userId: conversation.creator.userId,
      name: conversation.creator.fullName ?? 'Creator',
      badgeRole: 'CREATOR',
      profileId: conversation.creatorId,
    };
    const b: Participant = conversation.creatorId2 != null
      ? {
          userId: conversation.creator2!.userId,
          name: conversation.creator2!.fullName ?? 'Creator',
          badgeRole: 'CREATOR',
          profileId: conversation.creatorId2,
        }
      : {
          userId: conversation.business!.userId,
          name: conversation.business!.businessName ?? 'Business',
          badgeRole: 'BUSINESS',
          profileId: conversation.businessId!,
        };
    return [a, b];
  }

  // Resolves the correct per-side "hidden for me" field. For pre-existing
  // creator<->business rows (creator2 always undefined/null) this collapses
  // to the original two-way ternary — zero behavior change.
  private hiddenFieldFor(
    conversation: { creator2?: { userId: string } | null },
    userId: string,
    role: Role,
  ): 'hiddenForCreator' | 'hiddenForBusiness' | 'hiddenForCreator2' {
    if (role === 'CREATOR' && userId === conversation.creator2?.userId) return 'hiddenForCreator2';
    return role === 'CREATOR' ? 'hiddenForCreator' : 'hiddenForBusiness';
  }

  // Resolves the correct per-side "seen at" field — same zero-change guarantee
  // for existing rows as hiddenFieldFor above.
  private seenFieldFor(
    conversation: { creator2?: { userId: string } | null },
    userId: string,
    role: Role,
  ): 'businessSeenAt' | 'creatorSeenAt' | 'creator2SeenAt' {
    if (role === 'BUSINESS') return 'businessSeenAt';
    return userId === conversation.creator2?.userId ? 'creator2SeenAt' : 'creatorSeenAt';
  }

  private async assertNotBlocked(userIdA: string, userIdB: string): Promise<void> {
    const block = await this.repo.findBlockBetween(userIdA, userIdB);
    if (block) throw new AppError('You cannot message this user.', 403);
  }

  // Boolean, non-throwing variant of verifyConversationAccess — lets the socket
  // layer (join:conversation) decide up front whether to let a client into a
  // conversation's room, instead of joining first and never checking at all
  // (that room fans out typing events to everyone in it).
  async canAccessConversation(conversationId: string, userId: string, role: Role): Promise<boolean> {
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) return false;
    try {
      await this.verifyConversationAccess(conversation, userId, role);
      return true;
    } catch {
      return false;
    }
  }

  // Presence visibility: anyone can see an admin's online status (support-facing),
  // and any two users who share a conversation can see each other's — otherwise
  // any authenticated user could enumerate any other user's online/last-seen
  // state via presence:subscribe regardless of whether they've ever talked.
  async canViewPresence(viewerId: string, viewerRole: Role, targetUserId: string): Promise<boolean> {
    if (viewerRole === 'ADMIN' || viewerId === targetUserId) return true;

    const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { role: true } });
    if (!target) return false;
    if (target.role === 'ADMIN') return true;

    const [viewerCreator, viewerBusiness] = await Promise.all([
      viewerRole === 'CREATOR'  ? this.creatorRepo.findByUserId(viewerId)  : null,
      viewerRole === 'BUSINESS' ? this.businessRepo.findByUserId(viewerId) : null,
    ]);
    const viewerProfileId = viewerCreator?.id ?? viewerBusiness?.id;
    if (!viewerProfileId) return false;

    const [targetCreator, targetBusiness] = await Promise.all([
      target.role === 'CREATOR'  ? this.creatorRepo.findByUserId(targetUserId)  : null,
      target.role === 'BUSINESS' ? this.businessRepo.findByUserId(targetUserId) : null,
    ]);
    const targetProfileId = targetCreator?.id ?? targetBusiness?.id;
    if (!targetProfileId) return false;

    return this.repo.conversationExistsBetweenProfiles(viewerProfileId, targetProfileId);
  }

  // ── Conversation list ──────────────────────────────────────────────────────

  async listConversations(userId: string, role: Role, status?: ConversationStatus, page = 1, limit = 50) {
    if (role === 'CREATOR') {
      const creator = await this.resolveCreator(userId);
      const { conversations, total } = await this.repo.findConversationsByCreator(creator.id, status, page, limit);
      return { conversations: conversations.map((c) => toConversationDto(c, 'CREATOR', creator.id)), total };
    }
    if (role === 'BUSINESS') {
      const business = await this.resolveBusiness(userId);
      const { conversations, total } = await this.repo.findConversationsByBusiness(business.id, status, page, limit);
      return { conversations: conversations.map((c) => toConversationDto(c, 'BUSINESS')), total };
    }
    return { conversations: [], total: 0 };
  }

  // ── Start / find conversation ──────────────────────────────────────────────

  async startConversation(userId: string, role: Role, input: StartConversationInput) {
    await this.assertMessagingEnabled();

    if (role === 'BUSINESS') {
      const business     = await this.resolveBusiness(userId);
      const otherCreator = await this.creatorRepo.findByUserId(input.otherUserId);
      if (!otherCreator) throw new AppError('Creator not found', 404);
      const conv = await this.repo.findOrCreateConversation(
        otherCreator.id,
        business.id,
        input.campaignId,
        input.requestMessage,
      );
      // Notify creator of new pending message request
      emitToUser(otherCreator.userId, 'conversation:update', { conversationId: conv.id });
      return toConversationDto(conv, 'BUSINESS');
    }

    if (role === 'CREATOR') {
      const creator      = await this.resolveCreator(userId);
      const otherBusiness = await this.businessRepo.findByUserId(input.otherUserId);
      if (!otherBusiness) throw new AppError('Business not found', 404);
      // Direct-message-enabled businesses skip the request step entirely; others still require approval.
      const initialStatus: ConversationStatus = otherBusiness.allowDirectMessages ? 'ACCEPTED' : 'PENDING';
      const conv = await this.repo.findOrCreateConversation(
        creator.id,
        otherBusiness.id,
        input.campaignId,
        input.requestMessage,
        initialStatus,
        userId,
      );
      emitToUser(otherBusiness.userId, 'conversation:update', { conversationId: conv.id });
      return toConversationDto(conv, 'CREATOR', creator.id);
    }

    throw new AppError('Unauthorized', 403);
  }

  // Check if a conversation exists between the current user and the given counterpart profile
  async checkConversation(userId: string, role: Role, otherProfileId: string) {
    if (role === 'BUSINESS') {
      const business = await this.resolveBusiness(userId);
      return this.repo.findConversationBetween(otherProfileId, business.id);
    }
    if (role === 'CREATOR') {
      const creator = await this.resolveCreator(userId);
      return this.repo.findConversationBetween(creator.id, otherProfileId);
    }
    return null;
  }

  // ── Creator <-> creator (parallel to startConversation/checkConversation
  // above — kept separate rather than overloaded, so the existing
  // creator<->business code path is untouched) ───────────────────────────────

  async startCreatorConversation(userId: string, otherUserId: string, requestMessage?: string) {
    await this.assertMessagingEnabled();

    const creator      = await this.resolveCreator(userId);
    const otherCreator = await this.creatorRepo.findByUserId(otherUserId);
    if (!otherCreator) throw new AppError('Creator not found', 404);
    if (otherCreator.id === creator.id) throw new AppError('You cannot message yourself', 400);

    await this.assertNotBlocked(userId, otherUserId);

    const conv = await this.repo.findOrCreateCreatorConversation(creator.id, otherCreator.id, requestMessage, userId);
    emitToUser(otherCreator.userId, 'conversation:update', { conversationId: conv.id });
    return toConversationDto(conv, 'CREATOR', creator.id);
  }

  async checkCreatorConversation(userId: string, otherCreatorProfileId: string) {
    const creator = await this.resolveCreator(userId);
    return this.repo.findCreatorConversationBetween(creator.id, otherCreatorProfileId);
  }

  // ── Blocking (creator<->creator conversations only) ────────────────────────

  async blockInConversation(conversationId: string, userId: string, role: Role) {
    if (role !== 'CREATOR') throw new AppError('Access denied', 403);
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) throw new AppError('Conversation not found', 404);
    await this.verifyConversationAccess(conversation, userId, role);
    if (conversation.creatorId2 == null) throw new AppError('Blocking is only available for creator-to-creator conversations', 400);

    const [pA, pB] = this.participantsOf(conversation);
    const otherUserId = userId === pA.userId ? pB.userId : pA.userId;
    await this.repo.createBlock(userId, otherUserId);
    emitToUser(otherUserId, 'conversation:update', { conversationId });
    return { blocked: true };
  }

  async unblockInConversation(conversationId: string, userId: string, role: Role) {
    if (role !== 'CREATOR') throw new AppError('Access denied', 403);
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) throw new AppError('Conversation not found', 404);
    await this.verifyConversationAccess(conversation, userId, role);
    if (conversation.creatorId2 == null) throw new AppError('Blocking is only available for creator-to-creator conversations', 400);

    const [pA, pB] = this.participantsOf(conversation);
    const otherUserId = userId === pA.userId ? pB.userId : pA.userId;
    await this.repo.removeBlock(userId, otherUserId);
    return { blocked: false };
  }

  async getBlockStatus(conversationId: string, userId: string, role: Role) {
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) throw new AppError('Conversation not found', 404);
    await this.verifyConversationAccess(conversation, userId, role);
    if (conversation.creatorId2 == null) return { blockedByMe: false, blockedByOther: false };

    const [pA, pB] = this.participantsOf(conversation);
    const otherUserId = userId === pA.userId ? pB.userId : pA.userId;
    const [blockedByMe, blockedByOther] = await Promise.all([
      this.repo.isBlockedBy(userId, otherUserId),
      this.repo.isBlockedBy(otherUserId, userId),
    ]);
    return { blockedByMe, blockedByOther };
  }

  // ── Request accept / decline ───────────────────────────────────────────────

  async respondToRequest(conversationId: string, userId: string, role: Role, action: 'accept' | 'decline') {
    if (role !== 'CREATOR' && role !== 'BUSINESS') throw new AppError('Access denied', 403);

    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) throw new AppError('Conversation not found', 404);
    if (conversation.status !== 'PENDING') throw new AppError('Request is not pending', 400);

    // Whichever side (creator, creator2, or business) received the request may respond
    await this.verifyConversationAccess(conversation, userId, role);

    const newStatus: ConversationStatus = action === 'accept' ? 'ACCEPTED' : 'DECLINED';
    await this.repo.updateStatus(conversationId, newStatus);

    const [pA, pB] = this.participantsOf(conversation);
    const responder = userId === pA.userId ? pA : pB;
    const recipient = responder === pA ? pB : pA;

    if (action === 'accept') {
      notificationService.create({
        userId:  recipient.userId,
        type:    'message_request_accepted',
        title:   `${responder.name} accepted your message request`,
        body:    'You can now start chatting.',
        refId:   responder.profileId,
        refType: responder.badgeRole === 'CREATOR' ? 'creator_profile' : 'business_profile',
      }).catch(() => {});
    }

    // Notify both sides to refresh their conversation list
    emitToUser(pA.userId, 'conversation:update', { conversationId });
    emitToUser(pB.userId, 'conversation:update', { conversationId });

    return { status: newStatus };
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  async getMessages(conversationId: string, userId: string, role: Role, page: number, limit: number) {
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) throw new AppError('Conversation not found', 404);
    await this.verifyConversationAccess(conversation, userId, role);
    const hiddenField = role === 'ADMIN' ? null : this.hiddenFieldFor(conversation, userId, role);
    const { messages: raw, total } = await this.repo.findMessages(conversationId, page, Math.min(limit, 200), hiddenField);
    return { messages: raw.map(toMessageDto), total, page, limit };
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  /** "Delete for me" — hides one message from the caller's own view only. */
  async deleteMessageForMe(conversationId: string, messageId: string, userId: string, role: Role) {
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) throw new AppError('Conversation not found', 404);
    await this.verifyConversationAccess(conversation, userId, role);
    const message = await this.repo.findMessageById(messageId);
    if (!message || message.conversationId !== conversationId) throw new AppError('Message not found', 404);

    const field = this.hiddenFieldFor(conversation, userId, role);
    await this.repo.hideMessageForUser(messageId, field);
  }

  /** "Delete for everyone" — sender-only, tombstones the message for both sides. */
  async deleteMessageForEveryone(conversationId: string, messageId: string, userId: string, role: Role) {
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) throw new AppError('Conversation not found', 404);
    await this.verifyConversationAccess(conversation, userId, role);
    const message = await this.repo.findMessageById(messageId);
    if (!message || message.conversationId !== conversationId) throw new AppError('Message not found', 404);
    if (message.senderId !== userId) throw new AppError('You can only delete your own messages for everyone', 403);

    await this.repo.softDeleteMessage(messageId, userId);

    // Live-update whichever side didn't just perform the delete.
    const [pA, pB] = this.participantsOf(conversation);
    const recipientUserId = userId === pA.userId ? pB.userId : pA.userId;
    emitToUser(recipientUserId, 'message:deleted', { conversationId, messageId });
  }

  /** Sender-only edit — text messages only (an attachment's caption isn't
   *  editable here), no time limit, matching this app's "delete for everyone"
   *  precedent rather than a short edit window. */
  async editMessage(conversationId: string, messageId: string, userId: string, role: Role, content: string) {
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) throw new AppError('Conversation not found', 404);
    await this.verifyConversationAccess(conversation, userId, role);
    const message = await this.repo.findMessageById(messageId);
    if (!message || message.conversationId !== conversationId) throw new AppError('Message not found', 404);
    if (message.senderId !== userId) throw new AppError('You can only edit your own messages', 403);
    if (message.deletedAt) throw new AppError('Cannot edit a deleted message', 400);
    if (message.type !== 'TEXT') throw new AppError('Only text messages can be edited', 400);

    const updated = await this.repo.editMessage(messageId, content);
    const dto = toMessageDto(updated);

    const [pA, pB] = this.participantsOf(conversation);
    const recipientUserId = userId === pA.userId ? pB.userId : pA.userId;
    emitToUser(recipientUserId, 'message:edited', { conversationId, message: dto });

    return dto;
  }

  /** "Delete conversation" — per-side hide from the inbox; resets on the next new message. */
  async deleteConversationForMe(conversationId: string, userId: string, role: Role) {
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) throw new AppError('Conversation not found', 404);
    await this.verifyConversationAccess(conversation, userId, role);

    const field = this.hiddenFieldFor(conversation, userId, role);
    await this.repo.hideConversationForUser(conversationId, field);

    logActivity({ userId, action: ActivityAction.CONVERSATION_HIDDEN, entityType: EntityType.CONVERSATION, entityId: conversationId });
  }

  // Side-effect-free: conversation lookup + access/block/status checks only.
  // Shared by prepareSend (an actual message send) and requestVideoUploadSignature
  // (which only needs to know sending is *allowed* — no message exists yet, so
  // the response-time analytics below must not fire for it).
  private async assertConversationSendable(conversationId: string, userId: string, role: Role) {
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) throw new AppError('Conversation not found', 404);
    await this.verifyConversationAccess(conversation, userId, role);

    if (conversation.creatorId2 != null) {
      const [pA, pB] = this.participantsOf(conversation);
      const otherUserId = userId === pA.userId ? pB.userId : pA.userId;
      await this.assertNotBlocked(userId, otherUserId);
    }

    if (conversation.status === 'PENDING') {
      throw new AppError('Cannot send messages until the request is accepted', 403);
    }
    if (conversation.status === 'DECLINED') {
      throw new AppError('This conversation request was declined', 403);
    }

    return conversation;
  }

  private async prepareSend(conversationId: string, userId: string, role: Role) {
    await this.assertMessagingEnabled();
    const conversation = await this.assertConversationSendable(conversationId, userId, role);

    // Response-time analytics: only counts as a "response" if the immediately
    // preceding message came from the OTHER party — two consecutive messages
    // from the same sender aren't a reply to anything.
    const lastMessage = await this.repo.findLastMessage(conversationId);
    if (lastMessage && lastMessage.senderId !== userId && (role === 'CREATOR' || role === 'BUSINESS')) {
      const minutes = (Date.now() - lastMessage.createdAt.getTime()) / 60000;
      analyticsService.recordResponseTime(userId, role, minutes);
    }

    return conversation;
  }

  private async persistAndBroadcast(
    conversation: NonNullable<Awaited<ReturnType<MessagingRepository['findConversationById']>>>,
    userId: string,
    role: Role,
    data: {
      content: string;
      type?: 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO' | 'VOICE';
      attachmentUrl?: string;
      attachmentName?: string;
      attachmentThumbnailUrl?: string;
      attachmentDurationSec?: number;
      attachmentWidth?: number;
      attachmentHeight?: number;
      attachmentSize?: number;
      attachmentFormat?: string;
      attachmentStatus?: 'PROCESSING' | 'READY' | 'FAILED';
      attachmentWaveform?: string;
    },
    pushBody: string,
  ) {
    await assertMessageRateOk(this.adminRepo, userId);

    const conversationId = conversation.id;
    const raw     = await this.repo.createMessage({ conversationId, senderId: userId, ...data });
    const message = toMessageDto(raw);

    if (data.type === 'VOICE') {
      logActivity({ userId, action: ActivityAction.MESSAGE_VOICE_SENT, entityType: EntityType.CONVERSATION, entityId: conversationId, metadata: { durationSec: data.attachmentDurationSec } });
    }

    // Mark the conversation as seen for the sender immediately so their own
    // badge count stays at zero (prevents the flash caused by the race between
    // refreshChatBadge and markSeen on the client).
    const senderSeenField = this.seenFieldFor(conversation, userId, role);
    await this.repo.updateSeenAt(conversationId, senderSeenField);

    const [pA, pB] = this.participantsOf(conversation);
    const sender    = userId === pA.userId ? pA : pB;
    const recipient = sender === pA ? pB : pA;

    // Compute updated badge counts for both sides (after seenAt was updated above)
    const [senderBadge, recipientBadge] = await Promise.all([
      this.repo.getBadgeCount(sender.profileId, sender.badgeRole),
      this.repo.getBadgeCount(recipient.profileId, recipient.badgeRole),
    ]);

    // Push message + updated badge count to both participants in real-time
    emitToUser(sender.userId,    'message:new', { conversationId, message, chatBadgeCount: senderBadge.count });
    emitToUser(recipient.userId, 'message:new', { conversationId, message, chatBadgeCount: recipientBadge.count });

    // Push notification (no DB record — message notifications do not appear in the bell)
    sendExpoPush(recipient.userId, sender.name, pushBody.slice(0, 100), recipientBadge.count).catch(() => {});

    return message;
  }

  async sendMessage(conversationId: string, userId: string, role: Role, input: SendMessageInput) {
    const conversation = await this.prepareSend(conversationId, userId, role);

    if ((await this.adminRepo.getSetting('rateLimit.duplicateMessages.enabled')) !== false) {
      const content = input.content.trim();
      const lastOwn = await this.repo.findLastMessageBySender(conversationId, userId);
      if (lastOwn && lastOwn.content === content) {
        throw new AppError('You just sent this exact message — please wait before sending it again.', 429);
      }
    }

    return this.persistAndBroadcast(conversation, userId, role, { content: input.content }, input.content);
  }

  // Images/files are uploaded via multipart REST (not the socket) and stored on Cloudinary;
  // the resulting message is still broadcast over the socket like a normal text message.
  async sendAttachment(
    conversationId: string,
    userId: string,
    role: Role,
    file: Express.Multer.File,
    caption?: string,
  ) {
    const conversation = await this.prepareSend(conversationId, userId, role);

    const isImage  = file.mimetype.startsWith('image/');
    const type: 'IMAGE' | 'FILE' = isImage ? 'IMAGE' : 'FILE';
    const publicId = `${type.toLowerCase()}_${conversationId}_${Date.now()}`;
    const url = isImage
      ? await uploadToCloudinary(file.buffer, 'messages/attachments', publicId, ATTACHMENT_IMAGE_TRANSFORMATION)
      : await uploadRawFile(file.buffer, 'messages/attachments', publicId);

    const content  = caption?.trim() ?? '';
    const pushBody = content || (isImage ? 'Photo' : file.originalname);

    return this.persistAndBroadcast(conversation, userId, role, {
      content,
      type,
      attachmentUrl:  url,
      attachmentName: file.originalname,
    }, pushBody);
  }

  // Voice is uploaded directly from the mobile client to Cloudinary, same
  // signed-upload pattern as video (no proxy through this server) — this
  // method only issues the credentials; the message isn't created until
  // completeVoiceAttachment runs afterward. A single-shot upload (not the
  // chunked/background-survival machinery video uses) is enough since a clip
  // is capped at 15MB/2min, nowhere near video's 500MB ceiling.
  async requestVoiceUploadSignature(conversationId: string, userId: string, role: Role): Promise<VideoUploadSignature> {
    await this.assertMessagingEnabled();
    await this.assertConversationSendable(conversationId, userId, role);

    const publicId = `voice_${conversationId}_${Date.now()}_${randomUUID()}`;
    return generateVideoUploadSignature('messages/attachments', publicId);
  }

  // Called after the client's direct-to-Cloudinary upload succeeds. Mirrors
  // completeVideoAttachment's shape — publicId is validated against this
  // conversation, everything else (format/size/duration/url) is read back
  // from Cloudinary's own Admin API rather than trusted from the client.
  async completeVoiceAttachment(
    conversationId: string,
    userId: string,
    role: Role,
    publicId: string,
    clientDurationSec?: number,
    waveform?: string,
  ) {
    const conversation = await this.prepareSend(conversationId, userId, role);

    const expectedPrefix = 'messages/attachments/voice_';
    if (!publicId.startsWith(expectedPrefix) || !publicId.includes(`_${conversationId}_`)) {
      throw new AppError('Invalid upload reference', 400);
    }

    let resource;
    try {
      resource = await cloudinary.api.resource(publicId, { resource_type: 'video' });
    } catch {
      throw new AppError('Could not verify the uploaded voice message. Please try again.', 400);
    }

    if (!ALLOWED_VOICE_FORMATS.has((resource.format ?? '').toLowerCase())) {
      await deleteVideo(publicId);
      throw new AppError('Unsupported audio format', 400);
    }

    if ((resource.bytes ?? 0) > MAX_VOICE_SIZE_BYTES) {
      await deleteVideo(publicId);
      throw new AppError('Voice message exceeds the 15MB limit', 400);
    }

    // Cloudinary's own duration wins when present (occasionally not yet
    // populated immediately after upload, same race completeVideoAttachment
    // handles) — clamped to the 1-120s rule either way, since the server must
    // never trust an out-of-range value regardless of which source it came from.
    const rawDurationSec = resource.duration || clientDurationSec || 0;
    if (rawDurationSec < 1 || rawDurationSec > 120) {
      await deleteVideo(publicId);
      throw new AppError('Voice message must be between 1 and 120 seconds', 400);
    }

    // Defensive cap in case of a malformed client payload — 28 bars * ~5 chars
    // ("0.99,") is ~140 chars, so 500 leaves generous headroom without letting
    // an arbitrary string balloon the row.
    const safeWaveform = waveform?.slice(0, 500);

    return this.persistAndBroadcast(conversation, userId, role, {
      content:               '',
      type:                  'VOICE',
      attachmentUrl:         resource.secure_url,
      attachmentDurationSec: Math.round(rawDurationSec),
      attachmentSize:        resource.bytes,
      attachmentFormat:      resource.format,
      attachmentWaveform:    safeWaveform,
    }, 'Voice message');
  }

  // Video is uploaded directly from the mobile client to Cloudinary (never
  // through this server — avoids proxying up to 500MB through Render). This
  // method only issues the signed credentials the client needs to do that
  // upload itself; the actual message isn't created until completeVideoAttachment
  // runs afterward. No analytics here — nothing has been sent yet.
  async requestVideoUploadSignature(conversationId: string, userId: string, role: Role): Promise<VideoUploadSignature> {
    await this.assertMessagingEnabled();
    const conversation = await this.assertConversationSendable(conversationId, userId, role);
    // Video is only allowed in creator<->business conversations, not creator<->creator.
    if (conversation.creatorId2 != null) throw new AppError('Video is not available in creator-to-creator conversations', 403);

    const publicId = `video_${conversationId}_${Date.now()}_${randomUUID()}`;
    return generateVideoUploadSignature('messages/attachments', publicId);
  }

  // Called after the client's direct-to-Cloudinary upload succeeds. Mirrors
  // sendAttachment's shape but never trusts client-submitted metadata — the
  // publicId is the only thing taken on faith (and even that is validated
  // against this conversation below), everything else (duration/size/dimensions/
  // format/url) is read back from Cloudinary's own Admin API, the same "server
  // is the source of truth" principle the old disk-upload path used.
  async completeVideoAttachment(
    conversationId: string,
    userId: string,
    role: Role,
    publicId: string,
    caption?: string,
    clientDurationSec?: number,
  ) {
    const conversation = await this.prepareSend(conversationId, userId, role);
    // Video is only allowed in creator<->business conversations, not creator<->creator.
    if (conversation.creatorId2 != null) throw new AppError('Video is not available in creator-to-creator conversations', 403);

    const expectedPrefix = 'messages/attachments/video_';
    if (!publicId.startsWith(expectedPrefix) || !publicId.includes(`_${conversationId}_`)) {
      throw new AppError('Invalid upload reference', 400);
    }

    let resource;
    try {
      resource = await cloudinary.api.resource(publicId, { resource_type: 'video' });
    } catch {
      throw new AppError('Could not verify the uploaded video. Please try again.', 400);
    }

    if (!ALLOWED_VIDEO_FORMATS.has((resource.format ?? '').toLowerCase())) {
      await deleteVideo(publicId);
      throw new AppError('Unsupported video format. Please use MP4 or MOV.', 400);
    }

    // Client-side picker already caps size at 500MB, but that check is trivially
    // bypassable — the server is the only source of truth, same as the format check above.
    if ((resource.bytes ?? 0) > MAX_VIDEO_SIZE_BYTES) {
      await deleteVideo(publicId);
      throw new AppError('Video exceeds the 500MB limit', 400);
    }

    // Cloudinary's own duration wins when present — it's occasionally not
    // populated yet immediately after the last chunk lands (asset still being
    // indexed), in which case the client's own picker-measured duration is
    // the best available fallback rather than silently showing/validating 0.
    const durationSec = Math.round(resource.duration || clientDurationSec || 0);

    const content  = caption?.trim() ?? '';
    const pushBody = content || 'Video';
    // Always deliver as MP4/H.264+AAC for universal playback, even when the
    // source upload was MOV — see videoPlaybackUrl for how.
    const playbackUrl = videoPlaybackUrl(resource.secure_url);

    return this.persistAndBroadcast(conversation, userId, role, {
      content,
      type: 'VIDEO',
      attachmentUrl:          playbackUrl,
      attachmentName:         `${publicId.split('/').pop()}.mp4`,
      attachmentThumbnailUrl: videoThumbnailUrl(resource.secure_url),
      attachmentDurationSec:  durationSec,
      attachmentWidth:        resource.width,
      attachmentHeight:       resource.height,
      attachmentSize:         resource.bytes,
      attachmentFormat:       'mp4', // matches playbackUrl — always delivered as MP4 regardless of the source format
      // Set to READY synchronously here — the checks above (format/duration/size)
      // are all we verify today, no async job exists yet. See VideoAssetStatus's
      // schema comment for the future path.
      attachmentStatus:       'READY',
    }, pushBody);
  }

  // ── Automated proposal-accept / project-completion transitions ────────────

  // Called when a business accepts a creator's proposal — no message request/accept
  // step is needed, so the conversation is established as ACCEPTED directly (or left
  // as-is if the two were already genuinely chatting) and the greeting is always
  // sent on the business's behalf, so the creator gets a clear "let's talk" prompt
  // for this specific proposal even if they already had an open conversation.
  async sendProposalAcceptedMessage(
    creatorId: string,
    businessId: string,
    campaignId: string,
    businessUserId: string,
    content: string,
  ) {
    const { conversation } = await this.repo.findOrCreateAcceptedConversation(creatorId, businessId, campaignId);
    return this.persistAndBroadcast(conversation, businessUserId, 'BUSINESS', { content }, content);
  }

  // Called when a business requests a revision on submitted deliverables — the
  // note is sent verbatim as a real chat message (in addition to the in-app
  // notification/email) so it lands where the creator will actually read it.
  // `videos`, if given, are the creator's currently-submitted deliverable
  // videos — the caller is about to delete them from Cloudinary as part of
  // the same revision-request flow, so each is also forwarded here as its
  // own VIDEO attachment message (same shape completeVideoAttachment sends)
  // giving the creator a copy they can still open/download from chat.
  async sendRevisionRequestMessage(
    creatorId: string,
    businessId: string,
    campaignId: string,
    businessUserId: string,
    content: string,
    videos: DeliverableVideo[] = [],
  ) {
    const { conversation } = await this.repo.findOrCreateAcceptedConversation(creatorId, businessId, campaignId);
    const message = await this.persistAndBroadcast(conversation, businessUserId, 'BUSINESS', { content }, content);

    for (const v of videos) {
      await this.persistAndBroadcast(conversation, businessUserId, 'BUSINESS', {
        content: '',
        type: 'VIDEO',
        attachmentUrl:          v.url,
        attachmentName:         `${v.label}.mp4`,
        attachmentThumbnailUrl: v.thumbnailUrl,
        attachmentDurationSec:  v.durationSec,
      }, v.label);
    }

    return message;
  }

  // Called once a project is completed and its payment released — the conversation
  // reverts to PENDING so either side must send a fresh request before chatting again.
  async closeConversationAfterCompletion(
    creatorUserId: string,
    businessUserId: string,
    creatorId: string,
    businessId: string,
  ) {
    const conversationId = await this.repo.resetToPendingAfterCompletion(creatorId, businessId);
    if (conversationId) {
      emitToUser(creatorUserId,  'conversation:update', { conversationId });
      emitToUser(businessUserId, 'conversation:update', { conversationId });
    }
  }

  // ── Seen / badge ───────────────────────────────────────────────────────────

  async markSeen(conversationId: string, userId: string, role: Role) {
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) throw new AppError('Conversation not found', 404);
    await this.verifyConversationAccess(conversation, userId, role);

    const field = this.seenFieldFor(conversation, userId, role);
    await this.repo.updateSeenAt(conversationId, field);

    // Read receipt — tell the other participant their messages here have now
    // been seen. Conversation-level (matches the *SeenAt schema this reads/
    // writes above), not per-message — there's no per-message readAt column,
    // and this is the same granularity most chat apps expose as a "seen"
    // indicator. Previously this endpoint updated the DB and emitted nothing,
    // so the other party never learned their message had been read.
    const [pA, pB] = this.participantsOf(conversation);
    const otherUserId = userId === pA.userId ? pB.userId : pA.userId;
    emitToUser(otherUserId, 'message:read', { conversationId, seenAt: new Date().toISOString() });
  }

  async getBadgeCount(userId: string, role: Role) {
    if (role === 'CREATOR') {
      const creator = await this.resolveCreator(userId);
      return this.repo.getBadgeCount(creator.id, 'CREATOR');
    }
    if (role === 'BUSINESS') {
      const business = await this.resolveBusiness(userId);
      return this.repo.getBadgeCount(business.id, 'BUSINESS');
    }
    return { count: 0, pendingRequests: 0, unread: 0 };
  }
}
