"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingService = void 0;
const error_1 = require("../../middleware/error");
const creator_repository_1 = require("../creator/creator.repository");
const business_repository_1 = require("../business/business.repository");
const messaging_repository_1 = require("./messaging.repository");
const notification_service_1 = require("../notifications/notification.service");
class MessagingService {
    repo;
    creatorRepo;
    businessRepo;
    constructor() {
        this.repo = new messaging_repository_1.MessagingRepository();
        this.creatorRepo = new creator_repository_1.CreatorRepository();
        this.businessRepo = new business_repository_1.BusinessRepository();
    }
    // ── Profile resolution ─────────────────────────────────────────────────────
    async resolveCreator(userId) {
        const creator = await this.creatorRepo.findByUserId(userId);
        if (!creator)
            throw new error_1.AppError('Creator profile not found', 404);
        return creator;
    }
    async resolveBusiness(userId) {
        const business = await this.businessRepo.findByUserId(userId);
        if (!business)
            throw new error_1.AppError('Business profile not found', 404);
        return business;
    }
    async verifyConversationAccess(conversation, userId, role) {
        if (role === 'ADMIN')
            return;
        if (role === 'CREATOR') {
            const creator = await this.resolveCreator(userId);
            if (creator.id !== conversation.creatorId)
                throw new error_1.AppError('Access denied', 403);
        }
        else if (role === 'BUSINESS') {
            const business = await this.resolveBusiness(userId);
            if (business.id !== conversation.businessId)
                throw new error_1.AppError('Access denied', 403);
        }
    }
    // ── Conversation list ──────────────────────────────────────────────────────
    async listConversations(userId, role, status) {
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
    async startConversation(userId, role, input) {
        if (role === 'BUSINESS') {
            const business = await this.resolveBusiness(userId);
            const otherCreator = await this.creatorRepo.findByUserId(input.otherUserId);
            if (!otherCreator)
                throw new error_1.AppError('Creator not found', 404);
            return this.repo.findOrCreateConversation(otherCreator.id, business.id, input.campaignId, input.requestMessage);
        }
        if (role === 'CREATOR') {
            const creator = await this.resolveCreator(userId);
            const otherBusiness = await this.businessRepo.findByUserId(input.otherUserId);
            if (!otherBusiness)
                throw new error_1.AppError('Business not found', 404);
            if (!otherBusiness.allowDirectMessages)
                throw new error_1.AppError('This business does not accept direct messages', 403);
            return this.repo.findOrCreateConversation(creator.id, otherBusiness.id, input.campaignId, input.requestMessage);
        }
        throw new error_1.AppError('Unauthorized', 403);
    }
    // Check if a conversation exists between business (current user) and a creator
    async checkConversation(userId, creatorProfileId) {
        const business = await this.resolveBusiness(userId);
        return this.repo.findConversationBetween(creatorProfileId, business.id);
    }
    // ── Request accept / decline ───────────────────────────────────────────────
    async respondToRequest(conversationId, userId, action) {
        const conversation = await this.repo.findConversationById(conversationId);
        if (!conversation)
            throw new error_1.AppError('Conversation not found', 404);
        if (conversation.status !== 'PENDING')
            throw new error_1.AppError('Request is not pending', 400);
        // Only the creator can respond
        const creator = await this.resolveCreator(userId);
        if (creator.id !== conversation.creatorId)
            throw new error_1.AppError('Access denied', 403);
        const newStatus = action === 'accept' ? 'ACCEPTED' : 'DECLINED';
        await this.repo.updateStatus(conversationId, newStatus);
        if (action === 'accept') {
            const business = await this.businessRepo.findById(conversation.businessId);
            if (business) {
                notification_service_1.notificationService.create({
                    userId: business.userId,
                    type: 'message_request_accepted',
                    title: `${creator.fullName} accepted your message request`,
                    body: 'You can now start chatting.',
                    refId: creator.id,
                    refType: 'creator_profile',
                }).catch(() => { });
            }
        }
        return { status: newStatus };
    }
    // ── Messages ───────────────────────────────────────────────────────────────
    async getMessages(conversationId, userId, role, page, limit) {
        const conversation = await this.repo.findConversationById(conversationId);
        if (!conversation)
            throw new error_1.AppError('Conversation not found', 404);
        await this.verifyConversationAccess(conversation, userId, role);
        const { messages, total } = await this.repo.findMessages(conversationId, page, Math.min(limit, 100));
        return { messages, total, page, limit };
    }
    async sendMessage(conversationId, userId, role, input) {
        const conversation = await this.repo.findConversationById(conversationId);
        if (!conversation)
            throw new error_1.AppError('Conversation not found', 404);
        await this.verifyConversationAccess(conversation, userId, role);
        if (conversation.status === 'PENDING') {
            throw new error_1.AppError('Cannot send messages until the request is accepted', 403);
        }
        if (conversation.status === 'DECLINED') {
            throw new error_1.AppError('This conversation request was declined', 403);
        }
        return this.repo.createMessage({ conversationId, senderId: userId, content: input.content });
    }
    // ── Seen / badge ───────────────────────────────────────────────────────────
    async markSeen(conversationId, userId, role) {
        const conversation = await this.repo.findConversationById(conversationId);
        if (!conversation)
            throw new error_1.AppError('Conversation not found', 404);
        await this.verifyConversationAccess(conversation, userId, role);
        const field = role === 'BUSINESS' ? 'businessSeenAt' : 'creatorSeenAt';
        await this.repo.updateSeenAt(conversationId, field);
    }
    async getBadgeCount(userId, role) {
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
exports.MessagingService = MessagingService;
//# sourceMappingURL=messaging.service.js.map