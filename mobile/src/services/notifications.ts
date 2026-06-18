import { request } from '@/lib/api';
import type { AppNotification } from '@/types';

type RawNotification = Omit<AppNotification, 'timestamp'> & { createdAt: string };

export const notificationService = {
  async getNotifications(): Promise<AppNotification[]> {
    const res = await request<RawNotification[]>('GET', '/api/notifications');
    return res.data.map((n) => ({ ...n, timestamp: n.createdAt }));
  },

  async markAsRead(id: string): Promise<void> {
    await request('PATCH', `/api/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await request('PATCH', '/api/notifications/read-all');
  },

  async markReadByRef(refId: string): Promise<void> {
    await request('PATCH', `/api/notifications/read-by-ref/${refId}`);
  },

  async getBadge(): Promise<{ count: number }> {
    const res = await request<{ count: number }>('GET', '/api/notifications/badge');
    return res.data;
  },
};
