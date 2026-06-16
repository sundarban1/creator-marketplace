import { NotificationRepository } from './notification.repository';

const repo = new NotificationRepository();

export const notificationService = {
  async getForUser(userId: string) {
    return repo.findByUser(userId);
  },

  async markRead(id: string, userId: string) {
    await repo.markRead(id, userId);
  },

  async markAllRead(userId: string) {
    await repo.markAllRead(userId);
  },

  async getBadge(userId: string) {
    const count = await repo.getUnreadCount(userId);
    return { count };
  },

  async create(data: {
    userId: string;
    type: string;
    title: string;
    body: string;
    refId?: string;
    refType?: string;
  }) {
    return repo.create(data);
  },

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
    if (data.length === 0) return;
    return repo.createMany(data);
  },
};
