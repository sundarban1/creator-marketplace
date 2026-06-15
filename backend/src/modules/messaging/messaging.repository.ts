import prisma from '../../prisma';

export class MessagingRepository {
  async findOrCreateConversation(creatorId: string, businessId: string, campaignId?: string) {
    // Try to find existing conversation
    const existing = await prisma.conversation.findUnique({
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

    return prisma.conversation.create({
      data: { creatorId, businessId, campaignId },
      include: {
        creator: { select: { fullName: true, avatarUrl: true } },
        business: { select: { businessName: true, logoUrl: true } },
        campaign: { select: { title: true } },
      },
    });
  }

  async findConversationsByCreator(creatorId: string) {
    return prisma.conversation.findMany({
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

  async findConversationsByBusiness(businessId: string) {
    return prisma.conversation.findMany({
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

  async findConversationById(id: string) {
    return prisma.conversation.findUnique({
      where: { id },
      include: {
        creator: { select: { fullName: true, avatarUrl: true } },
        business: { select: { businessName: true, logoUrl: true } },
        campaign: { select: { title: true } },
      },
    });
  }

  async findMessages(conversationId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, email: true, role: true } },
        },
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);

    return { messages, total };
  }

  async createMessage(data: {
    conversationId: string;
    senderId: string;
    content: string;
  }) {
    return prisma.message.create({
      data,
      include: {
        sender: { select: { id: true, email: true, role: true } },
      },
    });
  }
}
