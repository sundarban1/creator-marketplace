"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingRepository = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
class MessagingRepository {
    async findOrCreateConversation(creatorId, businessId, campaignId) {
        // Try to find existing conversation
        const existing = await prisma_1.default.conversation.findUnique({
            where: { creatorId_businessId: { creatorId, businessId } },
            include: {
                creator: { select: { fullName: true, avatarUrl: true } },
                business: { select: { businessName: true, logoUrl: true } },
                campaign: { select: { title: true } },
            },
        });
        if (existing) {
            return existing;
        }
        return prisma_1.default.conversation.create({
            data: { creatorId, businessId, campaignId },
            include: {
                creator: { select: { fullName: true, avatarUrl: true } },
                business: { select: { businessName: true, logoUrl: true } },
                campaign: { select: { title: true } },
            },
        });
    }
    async findConversationsByCreator(creatorId) {
        return prisma_1.default.conversation.findMany({
            where: { creatorId },
            orderBy: { createdAt: 'desc' },
            include: {
                business: { select: { businessName: true, logoUrl: true } },
                campaign: { select: { title: true } },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });
    }
    async findConversationsByBusiness(businessId) {
        return prisma_1.default.conversation.findMany({
            where: { businessId },
            orderBy: { createdAt: 'desc' },
            include: {
                creator: { select: { fullName: true, avatarUrl: true } },
                campaign: { select: { title: true } },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });
    }
    async findConversationById(id) {
        return prisma_1.default.conversation.findUnique({
            where: { id },
            include: {
                creator: { select: { fullName: true, avatarUrl: true } },
                business: { select: { businessName: true, logoUrl: true } },
                campaign: { select: { title: true } },
            },
        });
    }
    async findMessages(conversationId, page, limit) {
        const skip = (page - 1) * limit;
        const [messages, total] = await Promise.all([
            prisma_1.default.message.findMany({
                where: { conversationId },
                skip,
                take: limit,
                orderBy: { createdAt: 'asc' },
                include: {
                    sender: { select: { id: true, email: true, role: true } },
                },
            }),
            prisma_1.default.message.count({ where: { conversationId } }),
        ]);
        return { messages, total };
    }
    async createMessage(data) {
        return prisma_1.default.message.create({
            data,
            include: {
                sender: { select: { id: true, email: true, role: true } },
            },
        });
    }
}
exports.MessagingRepository = MessagingRepository;
//# sourceMappingURL=messaging.repository.js.map