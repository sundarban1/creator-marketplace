import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { NotificationRepository } from './notification.repository';
import { toNotificationDto } from './notification.dto';
import { emitToUser } from '../../socket';
import { translateMany } from '../../utils/translation';
import { logger } from '../../config/logger';
import prisma from '../../prisma';

const expo = new Expo();
const NOTIFICATION_FIELDS = ['title', 'body'] as const;

const repo = new NotificationRepository();

export async function sendExpoPush(userId: string, title: string, body: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { pushToken: true } });
    const token = user?.pushToken;
    if (!token) {
      logger.debug({ userId }, 'Push skipped — no pushToken on record for user');
      return;
    }
    if (!Expo.isExpoPushToken(token)) {
      logger.warn({ userId, token }, 'Push skipped — stored pushToken is not a valid Expo push token');
      return;
    }

    const message: ExpoPushMessage = { to: token, title, body, sound: 'default', badge: 1, channelId: 'default' };
    const [ticket] = await expo.sendPushNotificationsAsync([message]);
    if (ticket?.status === 'error') {
      logger.warn({ userId, ticket }, 'Expo push ticket returned an error');
    }
  } catch (err) {
    // Non-critical — don't let push failure break the notification flow,
    // but it must be logged or delivery failures are undiagnosable.
    logger.error({ err, userId }, 'Failed to send push notification');
  }
}

export const notificationService = {
  async getForUser(userId: string, lang = 'en', page = 1, limit = 50) {
    const { notifications, total } = await repo.findByUser(userId, page, limit);
    const dtos = notifications.map(toNotificationDto);
    const translated = await translateMany(dtos, [...NOTIFICATION_FIELDS], lang);
    return { notifications: translated, total, page, limit };
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

  async registerPushToken(userId: string, token: string) {
    await prisma.user.update({ where: { id: userId }, data: { pushToken: token } });
  },

  async create(data: {
    userId: string;
    type: string;
    title: string;
    body: string;
    refId?: string;
    refType?: string;
  }) {
    const raw = await repo.create(data);
    const notification = toNotificationDto(raw);
    emitToUser(data.userId, 'notification:new', notification);
    void sendExpoPush(data.userId, data.title, data.body);
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
    const byUser = new Map<string, typeof data[0]>();
    for (const d of data) byUser.set(d.userId, d);
    for (const [userId, d] of byUser.entries()) {
      emitToUser(userId, 'notification:new', { userId });
      void sendExpoPush(userId, d.title, d.body);
    }
    return result;
  },

  // Fans a single notification out to every admin user — used for things
  // like "payment release needed" that any admin should be able to act on.
  async createForAdmins(data: {
    type: string;
    title: string;
    body: string;
    refId?: string;
    refType?: string;
  }) {
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    return this.createMany(admins.map((a) => ({ ...data, userId: a.id })));
  },
};
