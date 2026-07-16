import prisma from '../../prisma';
import type { VisitorChatStatus, VisitorMessageSender } from '@prisma/client';

export class VisitorChatRepository {
  async createChat(data: { name: string; email?: string; phone?: string }) {
    return prisma.visitorChat.create({ data });
  }

  async findChatById(id: string) {
    return prisma.visitorChat.findUnique({ where: { id } });
  }

  async listChats(params: { status?: VisitorChatStatus; page: number; limit: number }) {
    const where = params.status ? { status: params.status } : {};
    const [items, total] = await Promise.all([
      prisma.visitorChat.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { messages: true } },
        },
      }),
      prisma.visitorChat.count({ where }),
    ]);
    return { items, total };
  }

  async listMessages(chatId: string) {
    return prisma.visitorMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createMessage(data: { chatId: string; sender: VisitorMessageSender; adminId?: string; content: string }) {
    const [message] = await prisma.$transaction([
      prisma.visitorMessage.create({ data }),
      prisma.visitorChat.update({
        where: { id: data.chatId },
        data: { lastMessageAt: new Date() },
      }),
    ]);
    return message;
  }

  async markSeen(chatId: string, side: 'visitor' | 'admin') {
    return prisma.visitorChat.update({
      where: { id: chatId },
      data: side === 'visitor' ? { visitorSeenAt: new Date() } : { adminSeenAt: new Date() },
    });
  }

  async updateStatus(chatId: string, status: VisitorChatStatus) {
    return prisma.visitorChat.update({ where: { id: chatId }, data: { status } });
  }
}
