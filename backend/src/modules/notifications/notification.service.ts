import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { NotificationRepository } from './notification.repository';
import { toNotificationDto } from './notification.dto';
import { emitToUser } from '../../socket';
import { translateMany } from '../../utils/translation';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error';
import prisma from '../../prisma';

const expo = new Expo();
const NOTIFICATION_FIELDS = ['title', 'body'] as const;

const repo = new NotificationRepository();

export async function sendExpoPush(userId: string, title: string, body: string, chatBadgeCount = 0) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { pushNotificationsEnabled: true } });
    if (user?.pushNotificationsEnabled === false) {
      logger.debug({ userId }, 'Push skipped — user has push notifications disabled');
      return;
    }
    const pushTokens = await prisma.pushToken.findMany({ where: { userId }, select: { id: true, token: true } });
    if (pushTokens.length === 0) {
      logger.debug({ userId }, 'Push skipped — no push tokens on record for user');
      return;
    }
    const validTokens = pushTokens.filter((pt) => {
      if (Expo.isExpoPushToken(pt.token)) return true;
      logger.warn({ userId, token: pt.token }, 'Push skipped — stored pushToken is not a valid Expo push token');
      return false;
    });
    if (validTokens.length === 0) return;

    // The OS app-icon badge must reflect real unread state, not a constant —
    // previously this was hardcoded to 1, so it got set once by the first-ever
    // push and then never changed again for the lifetime of the install (nothing
    // clears it either — see the client-side setBadgeCountAsync sync in
    // NotificationContext for the other half of this fix). Bell unread + chat
    // unread (the latter passed in by callers that already computed it, e.g.
    // messaging.service.ts's persistAndBroadcast) is the same total shown
    // in-app across the bell and messages tabs.
    const bellUnread = await repo.getUnreadCount(userId);
    const badge = bellUnread + chatBadgeCount;

    // Sent to every device the user is logged into, not just the most
    // recently registered one — see PushToken model.
    const messages: ExpoPushMessage[] = validTokens.map((pt) => (
      { to: pt.token, title, body, sound: 'default', badge, channelId: 'default' }
    ));
    const tickets = await expo.sendPushNotificationsAsync(messages);
    tickets.forEach((ticket, i) => {
      const pushTokenId = validTokens[i].id;
      if (ticket.status === 'error') {
        logger.warn({ userId, pushTokenId, ticket }, 'Expo push ticket returned an error');
        return;
      }
      // A ticket status of "ok" only means Expo accepted the message for delivery —
      // it says nothing about whether FCM/APNs actually delivered it. Real delivery
      // errors (DeviceNotRegistered, and critically InvalidCredentials — which fires
      // when an Expo/EAS project's Android FCM server credentials aren't configured,
      // a platform this stored token may or may not belong to) only surface via a
      // follow-up receipt fetch. Without this, those failures are invisible: no log,
      // no error, the notification just silently never arrives.
      if (ticket.status === 'ok' && ticket.id) {
        scheduleReceiptCheck(userId, pushTokenId, ticket.id);
      }
    });
  } catch (err) {
    // Non-critical — don't let push failure break the notification flow,
    // but it must be logged or delivery failures are undiagnosable.
    logger.error({ err, userId }, 'Failed to send push notification');
  }
}

// Expo recommends checking receipts some time after the ticket is issued, not
// immediately — FCM/APNs delivery is async on their end too. This is fire-and-forget
// by design, matching the fire-and-forget sendExpoPush() call sites; a failed receipt
// check here must never affect the request that triggered the original notification.
function scheduleReceiptCheck(userId: string, pushTokenId: string, ticketId: string) {
  setTimeout(() => {
    void expo.getPushNotificationReceiptsAsync([ticketId])
      .then(async (receipts) => {
        const receipt = receipts[ticketId];
        if (!receipt || receipt.status === 'ok') return;
        logger.warn({ userId, pushTokenId, ticketId, receipt }, 'Expo push receipt returned an error');
        // DeviceNotRegistered means this one device's token is permanently dead
        // (uninstalled app, revoked permission, etc.) — clear just that row so
        // future sends stop retrying it, without touching the user's other devices.
        if (receipt.details?.error === 'DeviceNotRegistered') {
          await prisma.pushToken.delete({ where: { id: pushTokenId } }).catch(() => {});
        }
      })
      .catch((err) => logger.error({ err, userId, pushTokenId, ticketId }, 'Failed to fetch push notification receipt'));
  }, 20_000);
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

  // Expo push tokens do occasionally rotate for the same install, so keying
  // solely on `token` would leave the old row behind forever (accumulating
  // duplicate rows — and duplicate pushes — for one physical device). When a
  // deviceId is known, first drop any other token already on file for that
  // device, then upsert this one by its own unique token (which also
  // naturally re-homes a token to a new userId if a different account logs
  // into the same device).
  async registerPushToken(userId: string, token: string, deviceId?: string) {
    if (deviceId) {
      await prisma.pushToken.deleteMany({ where: { userId, deviceId, NOT: { token } } });
    }
    await prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, deviceId },
      update: { userId, deviceId },
    });
  },

  // Per-channel opt-out, shared by BUSINESS and CREATOR — checked by
  // sendExpoPush (push) and campaign.service.ts's email call sites (email)
  // before every send, not just read/displayed here.
  async getSettings(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushNotificationsEnabled: true, emailNotificationsEnabled: true },
    });
    if (!user) throw new AppError('User not found', 404);
    return user;
  },

  async updateSettings(userId: string, data: { pushNotificationsEnabled?: boolean; emailNotificationsEnabled?: boolean }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { pushNotificationsEnabled: true, emailNotificationsEnabled: true },
    });
    return user;
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
