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

import { runCollaborationReminders, dueIn } from '../src/jobs/collaborationReminders';
import { runEscrowSweep } from '../src/jobs/escrowStateMachine';

const d = hasDb ? describe : describe.skip;
const H = 3_600_000;
const at = (hours: number) => new Date(Date.now() + hours * H);

async function notifs(userId: string, type: string) {
  return prisma.notification.findMany({ where: { userId, type } });
}

describe('dueIn', () => {
  const now = new Date('2026-10-06T00:00:00Z');
  it('rounds up and phrases the time left', () => {
    expect(dueIn(new Date(now.getTime() + 0.5 * H), now)).toBe('within the hour');
    expect(dueIn(new Date(now.getTime() + 2.2 * H), now)).toBe('in 3 hours');
    expect(dueIn(new Date(now.getTime() + 23 * H), now)).toBe('tomorrow');
  });
});

d('collaboration reminders', () => {
  beforeEach(async () => { await resetDb(); sendActionEmail.mockClear(); });

  it('deliverable due ~24h → creator (push+email) and business (push), exactly once', async () => {
    const e = await seedFundedEngagement({ workStatus: 'IN_PROGRESS' });
    await prisma.application.update({ where: { id: e.applicationId }, data: { contentDeadline: at(20), creatorConfirmedAt: at(-5) } });

    await runCollaborationReminders();
    await runCollaborationReminders();

    expect(await notifs(e.creatorUserId, 'deliverable_due_24h')).toHaveLength(1);
    expect(await notifs(e.bizUserId, 'deliverable_due_24h')).toHaveLength(1);
    expect(sendActionEmail).toHaveBeenCalledTimes(1);
    const [, email] = sendActionEmail.mock.calls[0] as [string, { cta: { url: string } }];
    expect(email.cta.url).toMatch(new RegExp(`/creator/work/${e.campaignId}$`));
  });

  it('inside 3h only the "due soon" reminder fires, creator only', async () => {
    const e = await seedFundedEngagement({ workStatus: 'IN_PROGRESS' });
    await prisma.application.update({ where: { id: e.applicationId }, data: { contentDeadline: at(2), creatorConfirmedAt: at(-20) } });

    await runCollaborationReminders();

    expect(await notifs(e.creatorUserId, 'deliverable_due_3h')).toHaveLength(1);
    expect(await notifs(e.creatorUserId, 'deliverable_due_24h')).toHaveLength(0);
    expect(await notifs(e.bizUserId, 'deliverable_due_3h')).toHaveLength(0);
  });

  it('a submitted deliverable gets no due reminders (cancellation by state)', async () => {
    const e = await seedFundedEngagement({ workStatus: 'SUBMITTED' });
    await prisma.application.update({ where: { id: e.applicationId }, data: { contentDeadline: at(2), creatorConfirmedAt: at(-20) } });

    await runCollaborationReminders();
    expect(await prisma.notification.count()).toBe(0);
  });

  it("a revision's fresh deadline re-arms the due reminder", async () => {
    const e = await seedFundedEngagement({ workStatus: 'IN_PROGRESS' });
    await prisma.application.update({ where: { id: e.applicationId }, data: { contentDeadline: at(20), creatorConfirmedAt: at(-5) } });
    await runCollaborationReminders();

    await prisma.application.update({
      where: { id: e.applicationId },
      data: { workStatus: 'REVISION', revisionRequestedAt: at(-2), contentDeadline: at(22) },
    });
    await runCollaborationReminders();

    expect(await notifs(e.creatorUserId, 'deliverable_due_24h')).toHaveLength(2);
  });

  it('no reminder right after the stage starts (min stage age)', async () => {
    const e = await seedFundedEngagement({ workStatus: 'IN_PROGRESS' });
    await prisma.application.update({ where: { id: e.applicationId }, data: { contentDeadline: at(20), creatorConfirmedAt: at(-0.1) } });

    await runCollaborationReminders();
    expect(await prisma.notification.count()).toBe(0);
  });

  it('frozen (disputed) escrow gets no reminders', async () => {
    const e = await seedFundedEngagement({ workStatus: 'IN_PROGRESS' });
    await prisma.application.update({
      where: { id: e.applicationId },
      data: { escrowStatus: 'FROZEN', contentDeadline: at(2), creatorConfirmedAt: at(-20) },
    });

    await runCollaborationReminders();
    expect(await prisma.notification.count()).toBe(0);
  });

  it('confirmation pending → creator (push+email) and business (push); stops once confirmed', async () => {
    const e = await seedFundedEngagement({ workStatus: 'NONE' });
    await prisma.application.update({ where: { id: e.applicationId }, data: { paidAt: at(-14), creatorConfirmationDueAt: at(10) } });

    await runCollaborationReminders();
    expect(await notifs(e.creatorUserId, 'confirmation_pending')).toHaveLength(1);
    expect(await notifs(e.bizUserId, 'confirmation_pending')).toHaveLength(1);
    expect(sendActionEmail).toHaveBeenCalledTimes(1);

    // A second engagement that's already confirmed never matches.
    const e2 = await seedFundedEngagement({ workStatus: 'IN_PROGRESS' });
    await prisma.application.update({ where: { id: e2.applicationId }, data: { paidAt: at(-14), creatorConfirmationDueAt: at(10) } });
    await runCollaborationReminders();
    expect(await notifs(e2.creatorUserId, 'confirmation_pending')).toHaveLength(0);
  });

  it('payment pending → business (push+email) with a link to the event page', async () => {
    const e = await seedFundedEngagement({ workStatus: 'NONE' });
    await prisma.application.update({
      where: { id: e.applicationId },
      data: { escrowStatus: 'NOT_FUNDED', paymentStatus: 'UNPAID', paidAt: null, paymentDueAt: at(10) },
    });

    await runCollaborationReminders();
    await runCollaborationReminders();

    expect(await notifs(e.bizUserId, 'payment_pending')).toHaveLength(1);
    expect(await notifs(e.creatorUserId, 'payment_pending')).toHaveLength(0);
    const [, email] = sendActionEmail.mock.calls[0] as [string, { cta: { url: string } }];
    expect(email.cta.url).toMatch(new RegExp(`/business/events/${e.campaignId}$`));
  });

  // @updatedAt is always overwritten by Prisma, so backdate it in SQL.
  async function quiet(applicationId: string, days: number) {
    await prisma.$executeRaw`UPDATE applications SET "updatedAt" = ${at(-days * 24)} WHERE id = ${applicationId}`;
  }

  it('inactive 3+ days → both parties (push+email), once per quiet spell', async () => {
    const e = await seedFundedEngagement({ workStatus: 'IN_PROGRESS' });
    await prisma.application.update({ where: { id: e.applicationId }, data: { contentDeadline: at(10 * 24), creatorConfirmedAt: at(-5 * 24) } });
    await quiet(e.applicationId, 4);

    await runCollaborationReminders();
    await runCollaborationReminders();

    expect(await notifs(e.creatorUserId, 'collaboration_inactive')).toHaveLength(1);
    expect(await notifs(e.bizUserId, 'collaboration_inactive')).toHaveLength(1);
    expect(sendActionEmail).toHaveBeenCalledTimes(2);

    // Activity, then another quiet spell → flagged again.
    await quiet(e.applicationId, 3.5);
    await runCollaborationReminders();
    expect(await notifs(e.creatorUserId, 'collaboration_inactive')).toHaveLength(2);
  });

  it('a recent chat message counts as activity', async () => {
    const e = await seedFundedEngagement({ workStatus: 'IN_PROGRESS' });
    await prisma.application.update({ where: { id: e.applicationId }, data: { contentDeadline: at(10 * 24), creatorConfirmedAt: at(-5 * 24) } });
    await quiet(e.applicationId, 4);
    await prisma.conversation.create({
      data: { creatorId: e.creatorId, businessId: e.businessId, campaignId: e.campaignId, status: 'ACCEPTED', lastMessageAt: at(-2) },
    });

    await runCollaborationReminders();
    expect(await notifs(e.creatorUserId, 'collaboration_inactive')).toHaveLength(0);
  });

  it('no inactivity nudge once the deadline is close (due reminders own that stretch)', async () => {
    const e = await seedFundedEngagement({ workStatus: 'IN_PROGRESS' });
    await prisma.application.update({ where: { id: e.applicationId }, data: { contentDeadline: at(10), creatorConfirmedAt: at(-5 * 24) } });
    await quiet(e.applicationId, 4);

    await runCollaborationReminders();
    expect(await notifs(e.creatorUserId, 'collaboration_inactive')).toHaveLength(0);
    expect(await notifs(e.creatorUserId, 'deliverable_due_24h')).toHaveLength(1);
  });

  it('review reminder now emails the business with a deliverables link', async () => {
    const e = await seedFundedEngagement({ workStatus: 'SUBMITTED' });
    await prisma.application.update({
      where: { id: e.applicationId },
      data: { submittedAt: at(-13), businessReviewDueAt: at(59), businessReviewReminderSentAt: null },
    });

    await runEscrowSweep();

    expect(await notifs(e.bizUserId, 'review_reminder')).toHaveLength(1);
    const [, email] = sendActionEmail.mock.calls[0] as [string, { cta: { url: string } }];
    expect(email.cta.url).toMatch(new RegExp(`/business/deliverables\\?campaign=${e.campaignId}$`));
  });

  describe('review pending (S5)', () => {
    async function completed(hoursAgo: number) {
      const e = await seedFundedEngagement({ workStatus: 'COMPLETED' });
      await prisma.application.update({ where: { id: e.applicationId }, data: { escrowStatus: 'RELEASED', releasedAt: at(-hoursAgo) } });
      return e;
    }

    it('nudges both parties once after 24h, then stops for whoever reviewed', async () => {
      const e = await completed(30);
      await runCollaborationReminders();
      await runCollaborationReminders();
      expect(await notifs(e.creatorUserId, 'review_pending')).toHaveLength(1);
      expect(await notifs(e.bizUserId, 'review_pending')).toHaveLength(1);
      expect(sendActionEmail).not.toHaveBeenCalled(); // push + bell only
    });

    it('a second nudge comes at day 4, at least 2 days after the first — then never again', async () => {
      const e = await completed(30);
      await runCollaborationReminders();
      // creator reviews; business doesn't
      await prisma.review.create({ data: { applicationId: e.applicationId, fromUserId: e.creatorUserId, toUserId: e.bizUserId, rating: 5 } });
      // jump: completion 5 days ago, first nudge 3 days ago
      await prisma.application.update({ where: { id: e.applicationId }, data: { releasedAt: at(-5 * 24) } });
      await prisma.notificationDelivery.updateMany({ data: { createdAt: at(-3 * 24) } });

      await runCollaborationReminders();
      await runCollaborationReminders();
      expect(await notifs(e.bizUserId, 'review_pending')).toHaveLength(2);
      expect(await notifs(e.creatorUserId, 'review_pending')).toHaveLength(1);
    });

    it('a stale backlog never nudges (deploy safety) and nothing before 24h', async () => {
      await completed(10 * 24);
      await completed(5);
      await runCollaborationReminders();
      expect(await prisma.notification.count({ where: { type: 'review_pending' } })).toBe(0);
    });

    it('when first and second are both "due" in one run, only the first is sent', async () => {
      const e = await completed(5 * 24);
      await runCollaborationReminders();
      expect(await notifs(e.bizUserId, 'review_pending')).toHaveLength(1);
    });
  });

  describe('waiting for response (S2)', () => {
    async function chat(workStatus = 'IN_PROGRESS') {
      const e = await seedFundedEngagement({ workStatus });
      const conv = await prisma.conversation.create({
        data: { creatorId: e.creatorId, businessId: e.businessId, campaignId: e.campaignId, status: 'ACCEPTED', lastMessageAt: at(-30) },
      });
      const say = (senderId: string, hoursAgo: number, type: 'TEXT' | 'SYSTEM' = 'TEXT') =>
        prisma.message.create({ data: { conversationId: conv.id, senderId, content: 'hi', type, createdAt: at(-hoursAgo) } });
      return { e, conv, say };
    }

    it('nudges the other party once when the last message is 24h+ unanswered', async () => {
      const { e, say } = await chat();
      await say(e.bizUserId, 40);
      await say(e.creatorUserId, 30); // creator asked, business hasn't replied

      await runCollaborationReminders();
      await runCollaborationReminders();

      const [n] = await notifs(e.bizUserId, 'response_pending');
      expect(n.title).toBe('Test Creator is waiting for your response');
      expect(n.applicationId).toBe(e.applicationId);
      expect(await notifs(e.bizUserId, 'response_pending')).toHaveLength(1);
      expect(await notifs(e.creatorUserId, 'response_pending')).toHaveLength(0);
    });

    it('a reply moves it on; a new unanswered message re-arms it for the other side', async () => {
      const { e, conv, say } = await chat();
      await say(e.creatorUserId, 50);
      await runCollaborationReminders();
      await say(e.bizUserId, 26); // business replied, now creator owes a reply
      await prisma.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: at(-26) } });
      await runCollaborationReminders();

      expect(await notifs(e.bizUserId, 'response_pending')).toHaveLength(1);
      expect(await notifs(e.creatorUserId, 'response_pending')).toHaveLength(1);
    });

    it('skips: under 24h, system message last, finished collaboration, stale thread', async () => {
      const fresh = await chat();
      await fresh.say(fresh.e.creatorUserId, 5);
      await prisma.conversation.update({ where: { id: fresh.conv.id }, data: { lastMessageAt: at(-5) } });

      const sys = await chat();
      await sys.say(sys.e.creatorUserId, 40);
      await sys.say(sys.e.bizUserId, 30, 'SYSTEM');

      const done = await chat('COMPLETED');
      await done.say(done.e.creatorUserId, 30);

      const stale = await chat();
      await stale.say(stale.e.creatorUserId, 5 * 24);
      await prisma.conversation.update({ where: { id: stale.conv.id }, data: { lastMessageAt: at(-5 * 24) } });

      await runCollaborationReminders();
      expect(await prisma.notification.count({ where: { type: 'response_pending' } })).toBe(0);
    });
  });

  describe('deadline risk (S3)', () => {
    async function engagement(state: 'unfunded' | 'unconfirmed' | 'working', deadlineHours: number) {
      const e = await seedFundedEngagement({ workStatus: state === 'working' ? 'IN_PROGRESS' : 'NONE' });
      if (state === 'unfunded') {
        await prisma.application.update({ where: { id: e.applicationId }, data: { escrowStatus: 'NOT_FUNDED', paymentStatus: 'UNPAID', paidAt: null } });
      }
      await prisma.campaign.update({ where: { id: e.campaignId }, data: { deadline: at(deadlineHours) } });
      return e;
    }

    it('unfunded near the deadline → only the business hears, once', async () => {
      const e = await engagement('unfunded', 10);
      await runCollaborationReminders();
      await runCollaborationReminders();
      const n = await notifs(e.bizUserId, 'deadline_risk');
      expect(n).toHaveLength(1);
      expect(n[0].body).toContain("can't start until you fund");
      expect(await notifs(e.creatorUserId, 'deadline_risk')).toHaveLength(0);
    });

    it('funded but unconfirmed near the deadline → only the creator hears', async () => {
      const e = await engagement('unconfirmed', 10);
      await runCollaborationReminders();
      expect(await notifs(e.creatorUserId, 'deadline_risk')).toHaveLength(1);
      expect(await notifs(e.bizUserId, 'deadline_risk')).toHaveLength(0);
    });

    it('suppressed when the stage reminder just went out (no back-to-back duplicates)', async () => {
      const e = await engagement('unfunded', 10);
      await prisma.application.update({ where: { id: e.applicationId }, data: { paymentDueAt: at(10) } });
      await runCollaborationReminders();
      expect(await notifs(e.bizUserId, 'payment_pending')).toHaveLength(1);
      expect(await notifs(e.bizUserId, 'deadline_risk')).toHaveLength(0);
    });

    it('no risk once work has started, or when the deadline is further out', async () => {
      await engagement('working', 10);
      await engagement('unfunded', 48);
      await runCollaborationReminders();
      expect(await prisma.notification.count({ where: { type: 'deadline_risk' } })).toBe(0);
    });
  });
});
