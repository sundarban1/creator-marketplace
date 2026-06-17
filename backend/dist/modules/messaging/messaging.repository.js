"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingRepository = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
const CONV_INCLUDE_CREATOR = {
    business: { select: { businessName: true, logoUrl: true } },
    campaign: { select: { title: true } },
    messages: { orderBy: { createdAt: 'desc' }, take: 1 },
};
const CONV_INCLUDE_BUSINESS = {
    creator: { select: { fullName: true, avatarUrl: true } },
    campaign: { select: { title: true } },
    messages: { orderBy: { createdAt: 'desc' }, take: 1 },
};
const CONV_INCLUDE_FULL = {
    creator: { select: { fullName: true, avatarUrl: true } },
    business: { select: { businessName: true, logoUrl: true } },
    campaign: { select: { title: true } },
};
class MessagingRepository {
    async findOrCreateConversation(creatorId, businessId, campaignId, requestMessage) {
        const existing = await prisma_1.default.conversation.findUnique({
            where: { creatorId_businessId: { creatorId, businessId } },
            include: CONV_INCLUDE_FULL,
        });
        if (existing) {
            // Re-open a declined conversation as a new request
            if (existing.status === 'DECLINED') {
                return prisma_1.default.conversation.update({
                    where: { id: existing.id },
                    data: { status: 'PENDING', requestMessage: requestMessage ?? null },
                    include: CONV_INCLUDE_FULL,
                });
            }
            return existing;
        }
        const conv = await prisma_1.default.conversation.create({
            data: { creatorId, businessId, campaignId, status: 'PENDING', requestMessage },
            include: CONV_INCLUDE_FULL,
        });
        // Store requestMessage as first Message so it appears in chat history
        if (requestMessage) {
            // Find the business user's userId to set as senderId
            const business = await prisma_1.default.businessProfile.findUnique({
                where: { id: businessId },
                select: { userId: true },
            });
            if (business) {
                await prisma_1.default.message.create({
                    data: { conversationId: conv.id, senderId: business.userId, content: requestMessage },
                });
                await prisma_1.default.conversation.update({
                    where: { id: conv.id },
                    data: { lastMessageAt: new Date() },
                });
            }
        }
        return conv;
    }
    async findConversationsByCreator(creatorId, status) {
        return prisma_1.default.conversation.findMany({
            where: { creatorId, ...(status ? { status } : {}) },
            orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
            include: CONV_INCLUDE_CREATOR,
        });
    }
    async findConversationsByBusiness(businessId, status) {
        return prisma_1.default.conversation.findMany({
            where: { businessId, ...(status ? { status } : {}) },
            orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
            include: CONV_INCLUDE_BUSINESS,
        });
    }
    async findConversationById(id) {
        return prisma_1.default.conversation.findUnique({
            where: { id },
            include: CONV_INCLUDE_FULL,
        });
    }
    async findConversationBetween(creatorId, businessId) {
        return prisma_1.default.conversation.findUnique({
            where: { creatorId_businessId: { creatorId, businessId } },
            select: { id: true, status: true },
        });
    }
    async updateStatus(id, status) {
        return prisma_1.default.conversation.update({ where: { id }, data: { status } });
    }
    async updateSeenAt(id, field) {
        return prisma_1.default.conversation.update({ where: { id }, data: { [field]: new Date() } });
    }
    async findMessages(conversationId, page, limit) {
        const skip = (page - 1) * limit;
        const [messages, total] = await Promise.all([
            prisma_1.default.message.findMany({
                where: { conversationId },
                skip,
                take: limit,
                orderBy: { createdAt: 'asc' },
                include: { sender: { select: { id: true, email: true, role: true } } },
            }),
            prisma_1.default.message.count({ where: { conversationId } }),
        ]);
        return { messages, total };
    }
    async createMessage(data) {
        const msg = await prisma_1.default.message.create({
            data,
            include: { sender: { select: { id: true, email: true, role: true } } },
        });
        // Update lastMessageAt on the conversation
        await prisma_1.default.conversation.update({
            where: { id: data.conversationId },
            data: { lastMessageAt: msg.createdAt },
        });
        return msg;
    }
    async getBadgeCount(profileId, role) {
        if (role === 'CREATOR') {
            // Count of PENDING requests + unread messages in ACCEPTED convos
            const [pendingRequests, acceptedConvos] = await Promise.all([
                prisma_1.default.conversation.count({ where: { creatorId: profileId, status: 'PENDING' } }),
                prisma_1.default.conversation.findMany({
                    where: { creatorId: profileId, status: 'ACCEPTED' },
                    select: { id: true, creatorSeenAt: true, lastMessageAt: true },
                }),
            ]);
            // Unread in accepted convos = convos where lastMessageAt > creatorSeenAt
            const unread = acceptedConvos.filter((c) => c.lastMessageAt && (!c.creatorSeenAt || c.lastMessageAt > c.creatorSeenAt)).length;
            return { count: pendingRequests + unread, pendingRequests, unread };
        }
        else {
            // Business: unread in ACCEPTED convos
            const acceptedConvos = await prisma_1.default.conversation.findMany({
                where: { businessId: profileId, status: 'ACCEPTED' },
                select: { id: true, businessSeenAt: true, lastMessageAt: true },
            });
            const unread = acceptedConvos.filter((c) => c.lastMessageAt && (!c.businessSeenAt || c.lastMessageAt > c.businessSeenAt)).length;
            return { count: unread, pendingRequests: 0, unread };
        }
    }
}
exports.MessagingRepository = MessagingRepository;
//# sourceMappingURL=messaging.repository.js.map