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

import { notify, NotificationEvent } from '../src/modules/notifications/notify';
import { escrowService } from '../src/modules/campaign/escrow.service';
import { CampaignService } from '../src/modules/campaign/campaign.service';

const d = hasDb ? describe : describe.skip;
// The service call sites fire notify() without awaiting it.
const settle = () => new Promise((r) => setTimeout(r, 400));
const emailTo = async (userId: string) => {
  const { email } = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return sendActionEmail.mock.calls.filter(([to]) => to === email);
};

d('immediate collaboration notifications (T4)', () => {
  beforeEach(async () => { await resetDb(); sendActionEmail.mockClear(); });

  it('emailDedupeKey throttles only the email — every bell/push still sends', async () => {
    const { bizUserId, campaignId } = await seedFundedEngagement();
    const input = {
      userId: bizUserId, type: NotificationEvent.NEW_APPLICATION, title: 't', body: 'b', campaignId,
      emailDedupeKey: `campaign:${campaignId}:proposal_received_email:1`,
      email: { subject: 's', heading: 'h', paragraphs: ['p'] },
    };
    await notify(input);
    await notify(input);
    await notify(input);
    expect(await prisma.notification.count({ where: { userId: bizUserId, type: 'proposal_received' } })).toBe(3);
    expect(sendActionEmail).toHaveBeenCalledTimes(1);
  });

  it('release straight from HELD: business gets the completion email, creator does not (approval email covered it)', async () => {
    const s = await seedFundedEngagement({ workStatus: 'APPROVED' });
    await escrowService.release({ applicationId: s.applicationId, actor: { userId: s.bizUserId, type: 'BUSINESS' } });
    await settle();

    const bizBell = await prisma.notification.findFirstOrThrow({ where: { userId: s.bizUserId, type: 'project_completed' } });
    expect(bizBell.applicationId).toBe(s.applicationId);
    const bizEmails = await emailTo(s.bizUserId);
    expect(bizEmails).toHaveLength(1);
    expect((bizEmails[0][1] as { cta: { url: string } }).cta.url).toMatch(new RegExp(`/business/events/${s.campaignId}$`));

    expect(await prisma.notification.count({ where: { userId: s.creatorUserId, type: 'payment_released' } })).toBe(1);
    expect(await emailTo(s.creatorUserId)).toHaveLength(0);
  });

  it('delayed release (settlement hold elapsed): creator gets the completion email too', async () => {
    const s = await seedFundedEngagement({ workStatus: 'APPROVED' });
    await prisma.application.update({ where: { id: s.applicationId }, data: { escrowStatus: 'RELEASE_PENDING' } });
    await escrowService.release({ applicationId: s.applicationId, actor: { type: 'SYSTEM' } });
    await settle();

    const creatorEmails = await emailTo(s.creatorUserId);
    expect(creatorEmails).toHaveLength(1);
    expect((creatorEmails[0][1] as { cta: { url: string } }).cta.url).toMatch(new RegExp(`/creator/work/${s.campaignId}$`));
  });

  it('a resubmission after a revision notifies the business as revision_submitted', async () => {
    const s = await seedFundedEngagement({ workStatus: 'REVISION' });
    await new CampaignService().submitWork(s.applicationId, s.creatorUserId, { urls: 'https://example.com/v2' });
    await settle();

    const bell = await prisma.notification.findFirstOrThrow({ where: { userId: s.bizUserId, type: 'revision_submitted' } });
    expect(bell.title).toBe('Updated deliverable submitted');
    expect(bell.applicationId).toBe(s.applicationId);
    expect(await prisma.notification.count({ where: { userId: s.bizUserId, type: 'work_submitted' } })).toBe(0);
  });

  it('a first submission is still work_submitted', async () => {
    const s = await seedFundedEngagement({ workStatus: 'IN_PROGRESS' });
    await new CampaignService().submitWork(s.applicationId, s.creatorUserId, { urls: 'https://example.com/v1' });
    await settle();
    expect(await prisma.notification.count({ where: { userId: s.bizUserId, type: 'work_submitted' } })).toBe(1);
  });
});
