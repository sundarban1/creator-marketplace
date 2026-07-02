import { ConversationStatus, Role } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { toConversationDto, toMessageDto } from './messaging.dto';
import { CreatorRepository } from '../creator/creator.repository';
import { BusinessRepository } from '../business/business.repository';
import { MessagingRepository } from './messaging.repository';
import { notificationService } from '../notifications/notification.service';
import { emitToUser } from '../../socket';
import type { StartConversationInput, SendMessageInput } from './messaging.schema';

export class MessagingService {
  private repo:         MessagingRepository;
  private creatorRepo:  CreatorRepository;
  private businessRepo: BusinessRepository;

  constructor() {
    this.repo         = new MessagingRepository();
    this.creatorRepo  = new CreatorRepository();
    this.businessRepo = new BusinessRepository();
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

  async listConversations(userId: string, role: Role, status?: ConversationStatus) {
    if (role === 'CREATOR') {
      const creator = await this.resolveCreator(userId);
      const convs = await this.repo.findConversationsByCreator(creator.id, status);
      return convs.map(toConversationDto);
    }
    if (role === 'BUSINESS') {
      const business = await this.resolveBusiness(userId);
      const convs = await this.repo.findConversationsByBusiness(business.id, status);
      return convs.map(toConversationDto);
    }
    return [];
  }

  // ── Start / find conversation ──────────────────────────────────────────────

  async startConversation(userId: string, role: Role, input: StartConversationInput) {
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
      if (!otherBusiness.allowDirectMessages) throw new AppError('This business does not accept direct messages', 403);
      const conv = await this.repo.findOrCreateConversation(
        creator.id,
        otherBusiness.id,
        input.campaignId,
        input.requestMessage,
      );
      emitToUser(otherBusiness.userId, 'conversation:update', { conversationId: conv.id });
      return toConversationDto(conv);
    }

    throw new AppError('Unauthorized', 403);
  }

  // Check if a conversation exists between business (current user) and a creator
  async checkConversation(userId: string, creatorProfileId: string) {
    const business = await this.resolveBusiness(userId);
    return this.repo.findConversationBetween(creatorProfileId, business.id);
  }

  // ── Request accept / decline ───────────────────────────────────────────────

  async respondToRequest(conversationId: string, userId: string, action: 'accept' | 'decline') {
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) throw new AppError('Conversation not found', 404);
    if (conversation.status !== 'PENDING') throw new AppError('Request is not pending', 400);

    // Only the creator can respond
    const creator = await this.resolveCreator(userId);
    if (creator.id !== conversation.creatorId) throw new AppError('Access denied', 403);

    const newStatus: ConversationStatus = action === 'accept' ? 'ACCEPTED' : 'DECLINED';
    await this.repo.updateStatus(conversationId, newStatus);

    const business = await this.businessRepo.findById(conversation.businessId);
    if (action === 'accept') {
      if (business) {
        notificationService.create({
          userId:  business.userId,
          type:    'message_request_accepted',
          title:   `${creator.fullName} accepted your message request`,
          body:    'You can now start chatting.',
          refId:   creator.id,
          refType: 'creator_profile',
        }).catch(() => {});
      }
    }

    // Notify both sides to refresh their conversation list
    if (business) emitToUser(business.userId, 'conversation:update', { conversationId });
    emitToUser(creator.userId, 'conversation:update', { conversationId });

    return { status: newStatus };
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  async getMessages(conversationId: string, userId: string, role: Role, page: number, limit: number) {
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) throw new AppError('Conversation not found', 404);
    await this.verifyConversationAccess(conversation, userId, role);
    const { messages: raw, total } = await this.repo.findMessages(conversationId, page, Math.min(limit, 100));
    return { messages: raw.map(toMessageDto), total, page, limit };
  }

  async sendMessage(conversationId: string, userId: string, role: Role, input: SendMessageInput) {
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) throw new AppError('Conversation not found', 404);
    await this.verifyConversationAccess(conversation, userId, role);

    if (conversation.status === 'PENDING') {
      throw new AppError('Cannot send messages until the request is accepted', 403);
    }
    if (conversation.status === 'DECLINED') {
      throw new AppError('This conversation request was declined', 403);
    }

    const raw     = await this.repo.createMessage({ conversationId, senderId: userId, content: input.content });
    const message = toMessageDto(raw);

    // Mark the conversation as seen for the sender immediately so their own
    // badge count stays at zero (prevents the flash caused by the race between
    // refreshChatBadge and markSeen on the client).
    const senderSeenField = role === 'BUSINESS' ? 'businessSeenAt' : 'creatorSeenAt';
    await this.repo.updateSeenAt(conversationId, senderSeenField);

    // Push message to both participants in real-time
    emitToUser(conversation.creator.userId, 'message:new', { conversationId, message });
    emitToUser(conversation.business.userId, 'message:new', { conversationId, message });

    // Send push notification to the recipient (not the sender)
    const recipientUserId = userId === conversation.creator.userId
      ? conversation.business.userId
      : conversation.creator.userId;
    const senderName = userId === conversation.creator.userId
      ? (conversation.creator.fullName ?? 'Creator')
      : (conversation.business.businessName ?? 'Business');
    notificationService.create({
      userId:  recipientUserId,
      type:    'new_message',
      title:   `New message from ${senderName}`,
      body:    input.content.slice(0, 100),
      refId:   conversationId,
      refType: 'conversation',
    }).catch(() => {});

    return message;
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
