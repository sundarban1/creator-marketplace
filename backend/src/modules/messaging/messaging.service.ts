import { Role } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { CreatorRepository } from '../creator/creator.repository';
import { BusinessRepository } from '../business/business.repository';
import { MessagingRepository } from './messaging.repository';
import type { StartConversationInput, SendMessageInput } from './messaging.schema';
import prisma from '../../prisma';

export class MessagingService {
  private repo: MessagingRepository;
  private creatorRepo: CreatorRepository;
  private businessRepo: BusinessRepository;

  constructor() {
    this.repo = new MessagingRepository();
    this.creatorRepo = new CreatorRepository();
    this.businessRepo = new BusinessRepository();
  }

  async listConversations(userId: string, role: Role) {
    if (role === 'CREATOR') {
      const creator = await this.creatorRepo.findByUserId(userId);
      if (!creator) {
        throw new AppError('Creator profile not found', 404);
      }
      return this.repo.findConversationsByCreator(creator.id);
    }

    if (role === 'BUSINESS') {
      const business = await this.businessRepo.findByUserId(userId);
      if (!business) {
        throw new AppError('Business profile not found', 404);
      }
      return this.repo.findConversationsByBusiness(business.id);
    }

    // ADMIN: return all (simplified)
    return prisma.conversation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { fullName: true } },
        business: { select: { businessName: true } },
      },
    });
  }

  async startConversation(userId: string, role: Role, input: StartConversationInput) {
    let creatorId: string;
    let businessId: string;

    if (role === 'CREATOR') {
      // Current user is a creator, other user must be a business
      const creator = await this.creatorRepo.findByUserId(userId);
      if (!creator) {
        throw new AppError('Creator profile not found', 404);
      }

      const otherBusiness = await this.businessRepo.findByUserId(input.otherUserId);
      if (!otherBusiness) {
        throw new AppError('Business user not found', 404);
      }

      creatorId = creator.id;
      businessId = otherBusiness.id;
    } else if (role === 'BUSINESS') {
      // Current user is a business, other user must be a creator
      const business = await this.businessRepo.findByUserId(userId);
      if (!business) {
        throw new AppError('Business profile not found', 404);
      }

      const otherCreator = await this.creatorRepo.findByUserId(input.otherUserId);
      if (!otherCreator) {
        throw new AppError('Creator user not found', 404);
      }

      creatorId = otherCreator.id;
      businessId = business.id;
    } else {
      throw new AppError('Admin cannot start conversations', 403);
    }

    const conversation = await this.repo.findOrCreateConversation(
      creatorId,
      businessId,
      input.campaignId
    );

    return conversation;
  }

  async getMessages(conversationId: string, userId: string, role: Role, page: number, limit: number) {
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    // Verify user has access to this conversation
    await this.verifyConversationAccess(conversation, userId, role);

    const { messages, total } = await this.repo.findMessages(conversationId, page, Math.min(limit, 100));
    return { messages, total, page, limit };
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    role: Role,
    input: SendMessageInput
  ) {
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    // Verify user has access
    await this.verifyConversationAccess(conversation, userId, role);

    const message = await this.repo.createMessage({
      conversationId,
      senderId: userId,
      content: input.content,
    });

    return message;
  }

  private async verifyConversationAccess(
    conversation: { creatorId: string; businessId: string },
    userId: string,
    role: Role
  ) {
    if (role === 'ADMIN') return; // admins can access all

    if (role === 'CREATOR') {
      const creator = await this.creatorRepo.findByUserId(userId);
      if (!creator || creator.id !== conversation.creatorId) {
        throw new AppError('You do not have access to this conversation', 403);
      }
    } else if (role === 'BUSINESS') {
      const business = await this.businessRepo.findByUserId(userId);
      if (!business || business.id !== conversation.businessId) {
        throw new AppError('You do not have access to this conversation', 403);
      }
    }
  }
}
