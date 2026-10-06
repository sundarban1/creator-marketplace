import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hasDb, resetDb, seedFundedEngagement } from './helpers';
import prisma from '../src/prisma';

vi.mock('../src/modules/notifications/notification.service', async (orig) => {
  const actual = await orig<typeof import('../src/modules/notifications/notification.service')>();
  return { ...actual, sendExpoPush: vi.fn().mockResolvedValue(undefined) };
});
const sendActionEmail = vi.fn().mockResolvedValue(undefined);
vi.mock('../src/utils/email/collaborationReminder', async (orig) => ({
  ...(await orig<typeof import('../src/utils/email/collaborationReminder')>()),
  sendActionEmail: (...a: unknown[]) => sendActionEmail(...a),
}));

import { notify, engagementKey, NotificationEvent } from '../src/modules/notifications/notify';

const d = hasDb ? describe : describe.skip;
const email = { subject: 's', heading: 'h', paragraphs: ['p'] };

d('notify() — dedupe + delivery ledger', () => {
  beforeEach(async () => { await resetDb(); sendActionEmail.mockClear(); });

  it('sends once per dedupe key and records the delivery', async () => {
    const { creatorUserId, applicationId } = await seedFundedEngagement();
    const key = engagementKey(applicationId, NotificationEvent.DELIVERABLE_DUE_24H);
    const input = {
      userId: creatorUserId, type: NotificationEvent.DELIVERABLE_DUE_24H,
      title: 't', body: 'b', applicationId, dedupeKey: key, email,
    };

    const results = await Promise.all([notify(input), notify(input), notify(input)]);
    expect(results.filter((r) => r === 'sent')).toHaveLength(1);
    expect(results.filter((r) => r === 'duplicate')).toHaveLength(2);

    expect(await prisma.notification.count({ where: { userId: creatorUserId, type: 'deliverable_due_24h' } })).toBe(1);
    const bell = await prisma.notification.findFirstOrThrow({ where: { userId: creatorUserId } });
    expect(bell.applicationId).toBe(applicationId);
    const row = await prisma.notificationDelivery.findUniqueOrThrow({ where: { dedupeKey: key } });
    expect(row.notificationId).not.toBeNull();
    expect(row.emailSentAt).not.toBeNull();
    expect(sendActionEmail).toHaveBeenCalledTimes(1);
  });

  it('skips email when the user opted out, still sends bell/push', async () => {
    const { creatorUserId, applicationId } = await seedFundedEngagement();
    await prisma.user.update({ where: { id: creatorUserId }, data: { emailNotificationsEnabled: false } });

    const r = await notify({
      userId: creatorUserId, type: NotificationEvent.DELIVERABLE_DUE_3H, title: 't', body: 'b',
      dedupeKey: engagementKey(applicationId, 'deliverable_due_3h'), email,
    });
    expect(r).toBe('sent');
    expect(sendActionEmail).not.toHaveBeenCalled();
    expect(await prisma.notification.count({ where: { userId: creatorUserId } })).toBe(1);
  });

  it('without a dedupe key, always sends and writes no ledger row', async () => {
    const { creatorUserId } = await seedFundedEngagement();
    const input = { userId: creatorUserId, type: NotificationEvent.PAYMENT_APPROVED, title: 't', body: 'b' };
    await notify(input);
    await notify(input);
    expect(await prisma.notification.count({ where: { userId: creatorUserId } })).toBe(2);
    expect(await prisma.notificationDelivery.count()).toBe(0);
  });
});
