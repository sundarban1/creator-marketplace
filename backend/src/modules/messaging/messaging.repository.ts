import { ConversationStatus } from '@prisma/client';
import prisma from '../../prisma';

const CONV_SELECT_CREATOR = {
  id: true, creatorId: true, businessId: true, campaignId: true, status: true,
  requestMessage: true, lastMessageAt: true, creatorSeenAt: true, createdAt: true,
  business: { select: { businessName: true, logoUrl: true } },
  campaign: { select: { title: true } },
  messages: { orderBy: { createdAt: 'desc' as const }, take: 1 },
};

const CONV_SELECT_BUSINESS = {
  id: true, creatorId: true, businessId: true, campaignId: true, status: true,
  requestMessage: true, lastMessageAt: true, businessSeenAt: true, createdAt: true,
  creator:  { select: { fullName: true, avatarUrl: true } },
  campaign: { select: { title: true } },
  messages: { orderBy: { createdAt: 'desc' as const }, take: 1 },
};

const CONV_INCLUDE_FULL = {
  creator:  { select: { fullName: true, avatarUrl: true, userId: true } },
  business: { select: { businessName: true, logoUrl: true, userId: true } },
  campaign: { select: { title: true } },
};

export class MessagingRepository {
  async findOrCreateConversation(
    creatorId: string,
    businessId: string,
    campaignId?: string,
    requestMessage?: string,
    initialStatus: ConversationStatus = 'PENDING',
    initiatorUserId?: string,
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
          data: { status: initialStatus, requestMessage: requestMessage ?? null },
          include: CONV_INCLUDE_FULL,
        });
      }
      return existing;
    }

    const conv = await prisma.conversation.create({
      data: { creatorId, businessId, campaignId, status: initialStatus, requestMessage },
      include: CONV_INCLUDE_FULL,
    });

    // Store requestMessage as first Message so it appears in chat history
    if (requestMessage) {
      // Default to the business user (today's business-initiated flow) unless the caller specifies otherwise
      let senderId = initiatorUserId;
      if (!senderId) {
        const business = await prisma.businessProfile.findUnique({
          where: { id: businessId },
          select: { userId: true },
        });
        senderId = business?.userId;
      }
      if (senderId) {
        await prisma.message.create({
          data: { conversationId: conv.id, senderId, content: requestMessage },
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
      select: CONV_SELECT_CREATOR,
    });
  }

  async findConversationsByBusiness(businessId: string, status?: ConversationStatus) {
    return prisma.conversation.findMany({
      where: { businessId, ...(status ? { status } : {}) },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      select: CONV_SELECT_BUSINESS,
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
      // Fetch newest-first so page 1 always contains the most recent messages.
      // The controller reverses the array before sending so the client receives
      // messages in chronological order (oldest → newest).
      prisma.message.findMany({
        where: { conversationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { sender: { select: { id: true, email: true, role: true } } },
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);
    return { messages: messages.reverse(), total };
  }

  /** The single most recent message in this conversation, if any — used to
   *  detect whether a new message is a "reply" to the other party (for
   *  response-time analytics) before the new message itself is inserted. */
  async findLastMessage(conversationId: string) {
    return prisma.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      select: { senderId: true, createdAt: true },
    });
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
