import { NotificationRepository } from './notification.repository';
import { emitToUser } from '../../socket';

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

  async markReadByRef(userId: string, refId: string) {
    await repo.markReadByRef(userId, refId);
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
    const notification = await repo.create(data);
    emitToUser(data.userId, 'notification:new', notification);
    return notification;
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
    const result = await repo.createMany(data);
    // Emit to each unique user
    const byUser = new Map<string, typeof data[0]>();
    for (const d of data) byUser.set(d.userId, d);
    for (const userId of byUser.keys()) {
      emitToUser(userId, 'notification:new', { userId });
    }
    return result;
  },
};
