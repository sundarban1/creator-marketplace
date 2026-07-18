import { ConversationStatus, Role } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { toConversationDto, toMessageDto } from './messaging.dto';
import { CreatorRepository } from '../creator/creator.repository';
import { BusinessRepository } from '../business/business.repository';
import { MessagingRepository } from './messaging.repository';
import { AdminRepository } from '../admin/admin.repository';
import { notificationService, sendExpoPush } from '../notifications/notification.service';
import { analyticsService } from '../analytics/analytics.service';
import { emitToUser } from '../../socket';
import { uploadImage as uploadToCloudinary, uploadRawFile, uploadVideo, videoThumbnailUrl, deleteVideo } from '../../utils/cloudinary';
import type { StartConversationInput, SendMessageInput } from './messaging.schema';

const ATTACHMENT_IMAGE_TRANSFORMATION = [{ width: 1600, crop: 'limit' }];

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
    conversation: { creatorId: string; businessId: string },
    userId: string,
    role: Role,
  ) {
    if (role === 'ADMIN') return;
    if (role === 'CREATOR') {
      const creator = await this.resolveCreator(userId);
      if (creator.id !== conversation.creatorId) throw new AppError('Access denied', 403);
    } else if (role === 'BUSINESS') {
      const business = await this.resolveBusiness(userId);
      if (business.id !== conversation.businessId) throw new AppError('Access denied', 403);
    }
  }

  // ── Conversation list ──────────────────────────────────────────────────────

  async listConversations(userId: string, role: Role, status?: ConversationStatus, page = 1, limit = 50) {
    if (role === 'CREATOR') {
      const creator = await this.resolveCreator(userId);
      const { conversations, total } = await this.repo.findConversationsByCreator(creator.id, status, page, limit);
      return { conversations: conversations.map((c) => toConversationDto(c, 'CREATOR')), total };
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
      return toConversationDto(conv);
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
      return toConversationDto(conv);
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

  // ── Request accept / decline ───────────────────────────────────────────────

  async respondToRequest(conversationId: string, userId: string, role: Role, action: 'accept' | 'decline') {
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) throw new AppError('Conversation not found', 404);
    if (conversation.status !== 'PENDING') throw new AppError('Request is not pending', 400);

    // Whichever side (creator or business) received the request may respond
    if (role === 'CREATOR') {
      const creator = await this.resolveCreator(userId);
      if (creator.id !== conversation.creatorId) throw new AppError('Access denied', 403);
    } else if (role === 'BUSINESS') {
      const business = await this.resolveBusiness(userId);
      if (business.id !== conversation.businessId) throw new AppError('Access denied', 403);
    } else {
      throw new AppError('Access denied', 403);
    }

    const newStatus: ConversationStatus = action === 'accept' ? 'ACCEPTED' : 'DECLINED';
    await this.repo.updateStatus(conversationId, newStatus);

    const [creator, business] = await Promise.all([
      this.creatorRepo.findById(conversation.creatorId),
      this.businessRepo.findById(conversation.businessId),
    ]);

    if (action === 'accept' && creator && business) {
      const responderName    = role === 'CREATOR' ? creator.fullName : business.businessName;
      const recipientUserId  = role === 'CREATOR' ? business.userId : creator.userId;
      notificationService.create({
        userId:  recipientUserId,
        type:    'message_request_accepted',
        title:   `${responderName} accepted your message request`,
        body:    'You can now start chatting.',
        refId:   role === 'CREATOR' ? creator.id : business.id,
        refType: role === 'CREATOR' ? 'creator_profile' : 'business_profile',
      }).catch(() => {});
    }

    // Notify both sides to refresh their conversation list
    if (business) emitToUser(business.userId, 'conversation:update', { conversationId });
    if (creator) emitToUser(creator.userId, 'conversation:update', { conversationId });

    return { status: newStatus };
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  async getMessages(conversationId: string, userId: string, role: Role, page: number, limit: number) {
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) throw new AppError('Conversation not found', 404);
    await this.verifyConversationAccess(conversation, userId, role);
    const { messages: raw, total } = await this.repo.findMessages(conversationId, page, Math.min(limit, 200), role);
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

    const field = role === 'CREATOR' ? 'hiddenForCreator' : 'hiddenForBusiness';
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
    const recipientUserId = userId === conversation.creator.userId
      ? conversation.business.userId
      : conversation.creator.userId;
    emitToUser(recipientUserId, 'message:deleted', { conversationId, messageId });
  }

  /** "Delete conversation" — per-side hide from the inbox; resets on the next new message. */
  async deleteConversationForMe(conversationId: string, userId: string, role: Role) {
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) throw new AppError('Conversation not found', 404);
    await this.verifyConversationAccess(conversation, userId, role);

    const field = role === 'CREATOR' ? 'hiddenForCreator' : 'hiddenForBusiness';
    await this.repo.hideConversationForUser(conversationId, field);
  }

  private async prepareSend(conversationId: string, userId: string, role: Role) {
    await this.assertMessagingEnabled();

    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) throw new AppError('Conversation not found', 404);
    await this.verifyConversationAccess(conversation, userId, role);

    if (conversation.status === 'PENDING') {
      throw new AppError('Cannot send messages until the request is accepted', 403);
    }
    if (conversation.status === 'DECLINED') {
      throw new AppError('This conversation request was declined', 403);
    }

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
      type?: 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO';
      attachmentUrl?: string;
      attachmentName?: string;
      attachmentThumbnailUrl?: string;
      attachmentDurationSec?: number;
      attachmentWidth?: number;
      attachmentHeight?: number;
      attachmentSize?: number;
      attachmentFormat?: string;
    },
    pushBody: string,
  ) {
    const conversationId = conversation.id;
    const raw     = await this.repo.createMessage({ conversationId, senderId: userId, ...data });
    const message = toMessageDto(raw);

    // Mark the conversation as seen for the sender immediately so their own
    // badge count stays at zero (prevents the flash caused by the race between
    // refreshChatBadge and markSeen on the client).
    const senderSeenField = role === 'BUSINESS' ? 'businessSeenAt' : 'creatorSeenAt';
    await this.repo.updateSeenAt(conversationId, senderSeenField);

    // Compute updated badge counts for both sides (after seenAt was updated above)
    const [creatorBadge, businessBadge] = await Promise.all([
      this.repo.getBadgeCount(conversation.creatorId, 'CREATOR'),
      this.repo.getBadgeCount(conversation.businessId, 'BUSINESS'),
    ]);

    // Push message + updated badge count to both participants in real-time
    emitToUser(conversation.creator.userId,  'message:new', { conversationId, message, chatBadgeCount: creatorBadge.count });
    emitToUser(conversation.business.userId, 'message:new', { conversationId, message, chatBadgeCount: businessBadge.count });

    // Push notification (no DB record — message notifications do not appear in the bell)
    const recipientUserId = userId === conversation.creator.userId
      ? conversation.business.userId
      : conversation.creator.userId;
    const senderName = userId === conversation.creator.userId
      ? (conversation.creator.fullName ?? 'Creator')
      : (conversation.business.businessName ?? 'Business');
    sendExpoPush(recipientUserId, senderName, pushBody.slice(0, 100)).catch(() => {});

    return message;
  }

  async sendMessage(conversationId: string, userId: string, role: Role, input: SendMessageInput) {
    const conversation = await this.prepareSend(conversationId, userId, role);
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
    const pushBody = content || (isImage ? '📷 Photo' : `📎 ${file.originalname}`);

    return this.persistAndBroadcast(conversation, userId, role, {
      content,
      type,
      attachmentUrl:  url,
      attachmentName: file.originalname,
    }, pushBody);
  }

  // Video follows the same shape as sendAttachment above but as its own method rather
  // than folded in: it needs a disk-path upload (uploadChatVideo writes to tmpdir, see
  // middleware/upload.ts) instead of a buffer, a duration check the server itself
  // enforces post-upload (never trusting whatever the client claimed pre-upload), and a
  // Cloudinary-derived thumbnail — none of which apply to the image/file path.
  async sendVideoAttachment(
    conversationId: string,
    userId: string,
    role: Role,
    file: Express.Multer.File,
    caption?: string,
  ) {
    const conversation = await this.prepareSend(conversationId, userId, role);

    const publicId = `video_${conversationId}_${Date.now()}`;
    const uploaded  = await uploadVideo(file.path, 'messages/attachments', publicId);

    // Client-side picker already caps duration at 120s, but the server is the
    // only source of truth — if a client lied (or the picker was bypassed),
    // delete the asset we just paid to store and reject the message.
    if (uploaded.durationSec > 125) {
      await deleteVideo(`messages/attachments/${publicId}`);
      throw new AppError('Video exceeds the 2 minute limit', 400);
    }

    const content  = caption?.trim() ?? '';
    const pushBody = content || '🎥 Video';

    return this.persistAndBroadcast(conversation, userId, role, {
      content,
      type: 'VIDEO',
      attachmentUrl:          uploaded.secureUrl,
      attachmentName:         file.originalname,
      attachmentThumbnailUrl: videoThumbnailUrl(uploaded.secureUrl),
      attachmentDurationSec:  uploaded.durationSec,
      attachmentWidth:        uploaded.width,
      attachmentHeight:       uploaded.height,
      attachmentSize:         uploaded.bytes,
      attachmentFormat:       uploaded.format,
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

    const field = role === 'BUSINESS' ? 'businessSeenAt' : 'creatorSeenAt';
    await this.repo.updateSeenAt(conversationId, field);
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
