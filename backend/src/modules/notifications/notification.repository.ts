import prisma from '../../prisma';

export class NotificationRepository {
  async create(data: {
    userId: string;
    type: string;
    title: string;
    body: string;
    refId?: string;
    refType?: string;
  }) {
    return prisma.notification.create({ data });
  }

  async createMany(
    data: Array<{
      userId: string;
      type: string;
      title: string;
      body: string;
      refId?: string;
      refType?: string;
    }>,
  ) {
    return prisma.notification.createMany({ data });
  }

  async findByUser(userId: string) {
    return prisma.notification.findMany({
      where: { userId, NOT: { type: 'new_message' } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCountExcludeMessages(userId: string) {
    return prisma.notification.count({
      where: { userId, isRead: false, NOT: { type: 'new_message' } },
    });
  }

  async markRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: { userId, isRead: false, NOT: { type: 'new_message' } },
    });
  }

  async markReadByRef(userId: string, refId: string) {
    return prisma.notification.updateMany({
      where: { userId, refId, isRead: false },
      data: { isRead: true },
    });
  }
}
