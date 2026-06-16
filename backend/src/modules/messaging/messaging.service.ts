import { ConversationStatus, Role } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { CreatorRepository } from '../creator/creator.repository';
import { BusinessRepository } from '../business/business.repository';
import { MessagingRepository } from './messaging.repository';
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
      return this.repo.findConversationsByCreator(creator.id, status);
    }
    if (role === 'BUSINESS') {
      const business = await this.resolveBusiness(userId);
      return this.repo.findConversationsByBusiness(business.id, status);
    }
    return [];
  }

  // ── Start / find conversation ──────────────────────────────────────────────

  async startConversation(userId: string, role: Role, input: StartConversationInput) {
    if (role !== 'BUSINESS') throw new AppError('Only businesses can send message requests', 403);

    const business     = await this.resolveBusiness(userId);
    const otherCreator = await this.creatorRepo.findByUserId(input.otherUserId);
    if (!otherCreator) throw new AppError('Creator not found', 404);

    return this.repo.findOrCreateConversation(
      otherCreator.id,
      business.id,
      input.campaignId,
      input.requestMessage,
    );
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
    return { status: newStatus };
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  async getMessages(conversationId: string, userId: string, role: Role, page: number, limit: number) {
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) throw new AppError('Conversation not found', 404);
    await this.verifyConversationAccess(conversation, userId, role);
    const { messages, total } = await this.repo.findMessages(conversationId, page, Math.min(limit, 100));
    return { messages, total, page, limit };
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

    return this.repo.createMessage({ conversationId, senderId: userId, content: input.content });
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
