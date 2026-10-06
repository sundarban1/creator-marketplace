import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hasDb, resetDb, seedFundedEngagement } from './helpers';
import prisma from '../src/prisma';

vi.mock('../src/modules/notifications/notification.service', async (orig) => {
  const actual = await orig<typeof import('../src/modules/notifications/notification.service')>();
  return { ...actual, sendExpoPush: vi.fn().mockResolvedValue(undefined) };
});
// notificationService.create calls its module-local sendExpoPush, which the
// mock above can't intercept — count real pushes at the queue instead.
const enqueueSpy = vi.fn((..._a: unknown[]) => Promise.resolve(true));
vi.mock('../src/queues/pushQueue', () => ({
  enqueuePushDeliver: (...a: unknown[]) => enqueueSpy(...a),
  enqueuePushReceiptCheck: () => Promise.resolve(true),
}));
vi.mock('../src/utils/email/collaborationReminder', async (orig) => ({
  ...(await orig<typeof import('../src/utils/email/collaborationReminder')>()),
  sendActionEmail: vi.fn().mockResolvedValue(undefined),
}));

import { sendExpoPush } from '../src/modules/notifications/notification.service';
import { notify, NotificationEvent, applicationPushKey, applicationPushWindow } from '../src/modules/notifications/notify';
import { sendGroupedApplicationPushes } from '../src/jobs/collaborationReminders';

const d = hasDb ? describe : describe.skip;
const push = vi.mocked(sendExpoPush);

d('grouped application pushes (B2)', () => {
  beforeEach(async () => { await resetDb(); push.mockClear(); enqueueSpy.mockClear(); });

  it('only the first application in a window pushes; every one still lands in the bell', async () => {
    const { bizUserId, campaignId } = await seedFundedEngagement();
    const key = applicationPushKey(campaignId, applicationPushWindow(new Date(), 15).index);
    for (let i = 0; i < 3; i++) {
      await notify({ userId: bizUserId, type: NotificationEvent.NEW_APPLICATION, title: 't', body: 'b', refId: campaignId, refType: 'campaign', campaignId, pushThrottleKey: key });
    }
    expect(await prisma.notification.count({ where: { userId: bizUserId, type: 'proposal_received' } })).toBe(3);
    await new Promise((r) => setTimeout(r, 50)); // create() fires the push without awaiting
    expect(enqueueSpy).toHaveBeenCalledTimes(1);
  });

  it('after the window closes, one summary push for the batch — once', async () => {
    const { bizUserId, campaignId } = await seedFundedEngagement();
    const prev = applicationPushWindow(new Date(Date.now() - 15 * 60_000), 15);
    const inPrev = new Date(prev.start.getTime() + 60_000);
    await prisma.notification.createMany({
      data: [0, 1, 2].map(() => ({ userId: bizUserId, type: 'proposal_received', title: 't', body: 'b', refId: campaignId, refType: 'campaign', createdAt: inPrev })),
    });

    await sendGroupedApplicationPushes(new Date());
    await sendGroupedApplicationPushes(new Date());

    expect(push).toHaveBeenCalledTimes(1);
    const [userId, title, body, , data] = push.mock.calls[0];
    expect(userId).toBe(bizUserId);
    expect(title).toBe('3 creators applied');
    expect(body).toContain('Test Campaign');
    expect(data).toEqual({ type: 'proposal_received', refId: campaignId, refType: 'campaign' });
  });

  it('a lone application gets no summary, and the open window is left alone', async () => {
    const { bizUserId, campaignId } = await seedFundedEngagement();
    const prev = applicationPushWindow(new Date(Date.now() - 15 * 60_000), 15);
    await prisma.notification.create({ data: { userId: bizUserId, type: 'proposal_received', title: 't', body: 'b', refId: campaignId, refType: 'campaign', createdAt: new Date(prev.start.getTime() + 60_000) } });
    await prisma.notification.createMany({
      data: [0, 1].map(() => ({ userId: bizUserId, type: 'proposal_received', title: 't', body: 'b', refId: campaignId, refType: 'campaign' })),
    });

    await sendGroupedApplicationPushes(new Date());
    expect(push).not.toHaveBeenCalled();
  });
});
