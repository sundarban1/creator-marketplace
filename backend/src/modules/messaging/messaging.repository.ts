import { ConversationStatus } from '@prisma/client';
import prisma from '../../prisma';

const CONV_INCLUDE_CREATOR = {
  business: { select: { businessName: true, logoUrl: true } },
  campaign: { select: { title: true } },
  messages: { orderBy: { createdAt: 'desc' as const }, take: 1 },
};

const CONV_INCLUDE_BUSINESS = {
  creator:  { select: { fullName: true, avatarUrl: true } },
  campaign: { select: { title: true } },
  messages: { orderBy: { createdAt: 'desc' as const }, take: 1 },
};

const CONV_INCLUDE_FULL = {
  creator:  { select: { fullName: true, avatarUrl: true } },
  business: { select: { businessName: true, logoUrl: true } },
  campaign: { select: { title: true } },
};

export class MessagingRepository {
  async findOrCreateConversation(
    creatorId: string,
    businessId: string,
    campaignId?: string,
    requestMessage?: string,
  ) {
    const existing = await prisma.conversation.findUnique({
      where: { creatorId_businessId: { creatorId, businessId } },
      include: CONV_INCLUDE_FULL,
    });

    if (existing) {
      // Re-open a declined conversation as a new request
      if (existing.status === 'DECLINED') {
        return prisma.conversation.update({
          where: { id: existing.id },
          data: { status: 'PENDING', requestMessage: requestMessage ?? null },
          include: CONV_INCLUDE_FULL,
        });
      }
      return existing;
    }

    const conv = await prisma.conversation.create({
      data: { creatorId, businessId, campaignId, status: 'PENDING', requestMessage },
      include: CONV_INCLUDE_FULL,
    });

    // Store requestMessage as first Message so it appears in chat history
    if (requestMessage) {
      // Find the business user's userId to set as senderId
      const business = await prisma.businessProfile.findUnique({
        where: { id: businessId },
        select: { userId: true },
      });
      if (business) {
        await prisma.message.create({
          data: { conversationId: conv.id, senderId: business.userId, content: requestMessage },
        });
        await prisma.conversation.update({
          where: { id: conv.id },
          data: { lastMessageAt: new Date() },
        });
      }
    }

    return conv;
  }

  async findConversationsByCreator(creatorId: string, status?: ConversationStatus) {
    return prisma.conversation.findMany({
      where: { creatorId, ...(status ? { status } : {}) },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      include: CONV_INCLUDE_CREATOR,
    });
  }

  async findConversationsByBusiness(businessId: string, status?: ConversationStatus) {
    return prisma.conversation.findMany({
      where: { businessId, ...(status ? { status } : {}) },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      include: CONV_INCLUDE_BUSINESS,
    });
  }

  async findConversationById(id: string) {
    return prisma.conversation.findUnique({
      where: { id },
      include: CONV_INCLUDE_FULL,
    });
  }

  async findConversationBetween(creatorId: string, businessId: string) {
    return prisma.conversation.findUnique({
      where: { creatorId_businessId: { creatorId, businessId } },
      select: { id: true, status: true },
    });
  }

  async updateStatus(id: string, status: ConversationStatus) {
    return prisma.conversation.update({ where: { id }, data: { status } });
  }

  async updateSeenAt(id: string, field: 'businessSeenAt' | 'creatorSeenAt') {
    return prisma.conversation.update({ where: { id }, data: { [field]: new Date() } });
  }

  async findMessages(conversationId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { id: true, email: true, role: true } } },
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);
    return { messages, total };
  }

  async createMessage(data: { conversationId: string; senderId: string; content: string }) {
    const msg = await prisma.message.create({
      data,
      include: { sender: { select: { id: true, email: true, role: true } } },
    });
    // Update lastMessageAt on the conversation
    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: { lastMessageAt: msg.createdAt },
    });
    return msg;
  }

  async getBadgeCount(profileId: string, role: 'CREATOR' | 'BUSINESS') {
    if (role === 'CREATOR') {
      // Count of PENDING requests + unread messages in ACCEPTED convos
      const [pendingRequests, acceptedConvos] = await Promise.all([
        prisma.conversation.count({ where: { creatorId: profileId, status: 'PENDING' } }),
        prisma.conversation.findMany({
          where: { creatorId: profileId, status: 'ACCEPTED' },
          select: { id: true, creatorSeenAt: true, lastMessageAt: true },
        }),
      ]);
      // Unread in accepted convos = convos where lastMessageAt > creatorSeenAt
      const unread = acceptedConvos.filter(
        (c) => c.lastMessageAt && (!c.creatorSeenAt || c.lastMessageAt > c.creatorSeenAt)
      ).length;
      return { count: pendingRequests + unread, pendingRequests, unread };
    } else {
      // Business: unread in ACCEPTED convos
      const acceptedConvos = await prisma.conversation.findMany({
        where: { businessId: profileId, status: 'ACCEPTED' },
        select: { id: true, businessSeenAt: true, lastMessageAt: true },
      });
      const unread = acceptedConvos.filter(
        (c) => c.lastMessageAt && (!c.businessSeenAt || c.lastMessageAt > c.businessSeenAt)
      ).length;
      return { count: unread, pendingRequests: 0, unread };
    }
  }
}
