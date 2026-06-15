"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingService = void 0;
const error_1 = require("../../middleware/error");
const creator_repository_1 = require("../creator/creator.repository");
const business_repository_1 = require("../business/business.repository");
const messaging_repository_1 = require("./messaging.repository");
const prisma_1 = __importDefault(require("../../prisma"));
class MessagingService {
    repo;
    creatorRepo;
    businessRepo;
    constructor() {
        this.repo = new messaging_repository_1.MessagingRepository();
        this.creatorRepo = new creator_repository_1.CreatorRepository();
        this.businessRepo = new business_repository_1.BusinessRepository();
    }
    async listConversations(userId, role) {
        if (role === 'CREATOR') {
            const creator = await this.creatorRepo.findByUserId(userId);
            if (!creator) {
                throw new error_1.AppError('Creator profile not found', 404);
            }
            return this.repo.findConversationsByCreator(creator.id);
        }
        if (role === 'BUSINESS') {
            const business = await this.businessRepo.findByUserId(userId);
            if (!business) {
                throw new error_1.AppError('Business profile not found', 404);
            }
            return this.repo.findConversationsByBusiness(business.id);
        }
        // ADMIN: return all (simplified)
        return prisma_1.default.conversation.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                creator: { select: { fullName: true } },
                business: { select: { businessName: true } },
            },
        });
    }
    async startConversation(userId, role, input) {
        let creatorId;
        let businessId;
        if (role === 'CREATOR') {
            // Current user is a creator, other user must be a business
            const creator = await this.creatorRepo.findByUserId(userId);
            if (!creator) {
                throw new error_1.AppError('Creator profile not found', 404);
            }
            const otherBusiness = await this.businessRepo.findByUserId(input.otherUserId);
            if (!otherBusiness) {
                throw new error_1.AppError('Business user not found', 404);
            }
            creatorId = creator.id;
            businessId = otherBusiness.id;
        }
        else if (role === 'BUSINESS') {
            // Current user is a business, other user must be a creator
            const business = await this.businessRepo.findByUserId(userId);
            if (!business) {
                throw new error_1.AppError('Business profile not found', 404);
            }
            const otherCreator = await this.creatorRepo.findByUserId(input.otherUserId);
            if (!otherCreator) {
                throw new error_1.AppError('Creator user not found', 404);
            }
            creatorId = otherCreator.id;
            businessId = business.id;
        }
        else {
            throw new error_1.AppError('Admin cannot start conversations', 403);
        }
        const conversation = await this.repo.findOrCreateConversation(creatorId, businessId, input.campaignId);
        return conversation;
    }
    async getMessages(conversationId, userId, role, page, limit) {
        const conversation = await this.repo.findConversationById(conversationId);
        if (!conversation) {
            throw new error_1.AppError('Conversation not found', 404);
        }
        // Verify user has access to this conversation
        await this.verifyConversationAccess(conversation, userId, role);
        const { messages, total } = await this.repo.findMessages(conversationId, page, Math.min(limit, 100));
        return { messages, total, page, limit };
    }
    async sendMessage(conversationId, userId, role, input) {
        const conversation = await this.repo.findConversationById(conversationId);
        if (!conversation) {
            throw new error_1.AppError('Conversation not found', 404);
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
    async verifyConversationAccess(conversation, userId, role) {
        if (role === 'ADMIN')
            return; // admins can access all
        if (role === 'CREATOR') {
            const creator = await this.creatorRepo.findByUserId(userId);
            if (!creator || creator.id !== conversation.creatorId) {
                throw new error_1.AppError('You do not have access to this conversation', 403);
            }
        }
        else if (role === 'BUSINESS') {
            const business = await this.businessRepo.findByUserId(userId);
            if (!business || business.id !== conversation.businessId) {
                throw new error_1.AppError('You do not have access to this conversation', 403);
            }
        }
    }
}
exports.MessagingService = MessagingService;
//# sourceMappingURL=messaging.service.js.map