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

  async findByUser(userId: string, page = 1, limit = 50) {
    const where = { userId, NOT: { type: 'new_message' } } as const;
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);
    return { notifications, total };
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
