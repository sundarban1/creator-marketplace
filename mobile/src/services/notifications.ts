import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { request } from '@/lib/api';
import type { AppNotification } from '@/types';

type RawNotification = Omit<AppNotification, 'timestamp'> & { createdAt: string };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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

  async registerPushToken(): Promise<void> {
    try {
      if (!Device.isDevice) return; // skip simulators

      const { status: existing } = await Notifications.getPermissionsAsync();
      const { status } = existing === 'granted'
        ? { status: existing }
        : await Notifications.requestPermissionsAsync();

      if (status !== 'granted') return;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      await request('PUT', '/api/notifications/push-token', { token: tokenData.data });
    } catch {
      // Native module not available in this build — push notifications skipped
    }
  },
};
