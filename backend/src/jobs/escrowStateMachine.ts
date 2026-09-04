import cron from 'node-cron';
import prisma from '../prisma';
import { logger } from '../config/logger';
import { notificationService } from '../modules/notifications/notification.service';
import { escrowService } from '../modules/campaign/escrow.service';
import { getEscrowTimings, deadlineFromNow } from '../modules/campaign/escrow-config';
import { recordCampaignEvent } from '../modules/campaign/campaign-events';
import { logActivity } from '../modules/logging/activity.service';
import { ActivityAction, EntityType } from '../modules/logging/logging.constants';
import { CampaignService } from '../modules/campaign/campaign.service';

// ───────────────────────────────────────────────────────────────────────────────
// Escrow state-machine sweep (escrow spec §38). Every automatic transition the
// spec requires runs here on a fixed cadence — the backend never waits for a
// user to open the app. Each sweep is independently guarded; one failing sweep
// never blocks the others, and every transition it makes is idempotent (running
// twice on the same row is a no-op).
// ───────────────────────────────────────────────────────────────────────────────

const campaignService = new CampaignService();

type EngagementRow = {
  id: string;
  campaignId: string;
  creatorId: string;
  proposedRate: number;
  creator: { userId: string; fullName: string | null };
  campaign: { title: string; business: { userId: string; businessName: string | null } };
};

const ENGAGEMENT_INCLUDE = {
  creator:  { select: { userId: true, fullName: true } },
  campaign: { select: { title: true, business: { select: { userId: true, businessName: true } } } },
} as const;

// ── Sweep 1: business funding window elapsed → PAYMENT_EXPIRED (§10–§11) ──────
async function sweepPaymentTimeouts(now: Date): Promise<number> {
  const rows = await prisma.application.findMany({
    where: {
      status:       'ACCEPTED',
      escrowStatus: 'NOT_FUNDED',
      paymentDueAt: { lt: now },
      campaign:     { campaignType: 'PAID_CAMPAIGN' },
    },
    include: ENGAGEMENT_INCLUDE,
  }) as EngagementRow[];

  for (const app of rows) {
    const { voided } = await escrowService.voidAssignment({
      applicationId: app.id,
      reason:        'Business did not fund escrow within the payment window',
    });
    if (!voided) continue;

    logActivity({ userId: null, action: ActivityAction.PAYMENT_EXPIRED, entityType: EntityType.APPLICATION, entityId: app.id, metadata: { campaignId: app.campaignId } });

    notificationService.create({
      userId:  app.campaign.business.userId,
      type:    'payment_expired',
      title:   'Payment window expired',
      body:    `The 24-hour payment window for "${app.campaign.title}" passed, so the creator selection was released. You can select a creator again.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch(() => {});
    notificationService.create({
      userId:  app.creator.userId,
      type:    'proposal_expired',
      title:   'Selection released',
      body:    `"${app.campaign.title}" was not funded in time. You're free to take on other campaigns.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch(() => {});
  }
  return rows.length;
}

// ── Sweep 2: creator confirmation window elapsed → full refund (§15) ──────────
async function sweepConfirmationTimeouts(now: Date): Promise<number> {
  const rows = await prisma.application.findMany({
    where: {
      status:                   'ACCEPTED',
      escrowStatus:             'HELD',
      workStatus:               'NONE',
      creatorConfirmationDueAt: { lt: now },
    },
    include: ENGAGEMENT_INCLUDE,
  }) as EngagementRow[];

  for (const app of rows) {
    // Money back first, then free the slot.
    const { refunded } = await escrowService.refund({
      applicationId: app.id,
      reason:        'Creator did not confirm the engagement within the confirmation window',
      actorType:     'SYSTEM',
      silent:        true,
    });
    await escrowService.voidAssignment({
      applicationId: app.id,
      reason:        'Creator confirmation window elapsed',
    });
    void escrowService.bumpReliability(app.creatorId, 'missedConfirmation');

    logActivity({ userId: null, action: ActivityAction.CREATOR_CONFIRMATION_EXPIRED, entityType: EntityType.APPLICATION, entityId: app.id, metadata: { campaignId: app.campaignId, refunded } });

    notificationService.create({
      userId:  app.campaign.business.userId,
      type:    'payment_refunded',
      title:   'Creator did not start — full refund',
      body:    `The creator for "${app.campaign.title}" didn't confirm in time. Your payment is being refunded in full and you can select another creator.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch(() => {});
    notificationService.create({
      userId:  app.creator.userId,
      type:    'proposal_expired',
      title:   'Engagement released',
      body:    `You didn't confirm "${app.campaign.title}" in time, so it was released and the business refunded. Confirming promptly keeps your reliability score healthy.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch(() => {});
  }
  return rows.length;
}

// ── Sweep 3: content deadline passed → CONTENT_OVERDUE + grace clock (§23) ────
async function sweepContentDeadlines(now: Date): Promise<number> {
  const timings = await getEscrowTimings();
  const rows = await prisma.application.findMany({
    where: {
      status:          'ACCEPTED',
      workStatus:      'IN_PROGRESS',
      contentDeadline: { lt: now },
    },
    include: ENGAGEMENT_INCLUDE,
  }) as EngagementRow[];

  for (const app of rows) {
    await prisma.application.update({
      where: { id: app.id },
      data: {
        workStatus:           'CONTENT_OVERDUE',
        contentGraceDeadline: deadlineFromNow(timings.contentGraceHours, now),
      },
    });
    recordCampaignEvent({ campaignId: app.campaignId, applicationId: app.id, axis: 'work', fromStatus: 'IN_PROGRESS', toStatus: 'CONTENT_OVERDUE', actorType: 'SYSTEM', reason: 'Content deadline passed' });
    logActivity({ userId: null, action: ActivityAction.CONTENT_OVERDUE, entityType: EntityType.APPLICATION, entityId: app.id, metadata: { campaignId: app.campaignId } });

    notificationService.create({
      userId:  app.creator.userId,
      type:    'content_overdue',
      title:   'Your campaign deadline has passed',
      body:    `The deadline for "${app.campaign.title}" has passed. Please submit your content as soon as possible — you have a short grace period.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch(() => {});
    notificationService.create({
      userId:  app.campaign.business.userId,
      type:    'content_overdue',
      title:   'Creator missed the deadline',
      body:    `The creator for "${app.campaign.title}" has missed the content deadline. They have a short grace period to deliver.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch(() => {});
  }
  return rows.length;
}

// ── Sweep 4: grace elapsed with nothing submitted → CREATOR_FAILED + refund (§25)
async function sweepCreatorFailures(now: Date): Promise<number> {
  const rows = await prisma.application.findMany({
    where: {
      status:               'ACCEPTED',
      workStatus:           'CONTENT_OVERDUE',
      contentGraceDeadline: { lt: now },
    },
    include: ENGAGEMENT_INCLUDE,
  }) as EngagementRow[];

  for (const app of rows) {
    await escrowService.refund({
      applicationId:   app.id,
      reason:          'Creator failed to deliver any content by the deadline',
      actorType:       'SYSTEM',
      workStatusAfter: 'CREATOR_FAILED',
      silent:          true,
    });
    recordCampaignEvent({ campaignId: app.campaignId, applicationId: app.id, axis: 'work', fromStatus: 'CONTENT_OVERDUE', toStatus: 'CREATOR_FAILED', actorType: 'SYSTEM', reason: 'Grace period elapsed with no submission' });
    void escrowService.bumpReliability(app.creatorId, 'failed');
    logActivity({ userId: null, action: ActivityAction.CREATOR_FAILED, entityType: EntityType.APPLICATION, entityId: app.id, metadata: { campaignId: app.campaignId } });

    notificationService.create({
      userId:  app.campaign.business.userId,
      type:    'payment_refunded',
      title:   'Creator did not deliver — full refund',
      body:    `The creator for "${app.campaign.title}" did not deliver any content. Your payment is being refunded in full.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch(() => {});
    notificationService.create({
      userId:  app.creator.userId,
      type:    'reliability_warning',
      title:   'Campaign missed',
      body:    `You didn't deliver content for "${app.campaign.title}" and the business was refunded. Repeated misses affect your reliability score and campaign ranking.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch(() => {});
  }
  return rows.length;
}

// ── Sweep 5: review-window reminder + optional auto-approve (§26) ─────────────
async function sweepBusinessReview(now: Date): Promise<{ reminders: number; autoApproved: number }> {
  const timings = await getEscrowTimings();

  // Reminder — one-shot, guarded by businessReviewReminderSentAt.
  const reminderCutoff = new Date(now.getTime() - timings.businessReviewReminderHours * 3_600_000);
  const toRemind = await prisma.application.findMany({
    where: {
      workStatus:                   'SUBMITTED',
      escrowStatus:                 { not: 'FROZEN' },
      businessReviewReminderSentAt: null,
      submittedAt:                  { lt: reminderCutoff },
      businessReviewDueAt:          { not: null },
    },
    include: ENGAGEMENT_INCLUDE,
  }) as (EngagementRow & { id: string })[];

  for (const app of toRemind) {
    await prisma.application.update({ where: { id: app.id }, data: { businessReviewReminderSentAt: now } });
    notificationService.create({
      userId:  app.campaign.business.userId,
      type:    'review_reminder',
      title:   'A submission is waiting for your review',
      body:    `"${app.campaign.title}" has content awaiting your review. Approve it or request changes before the review window closes.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch(() => {});
  }

  // Auto-approve — only when the admin switch is on.
  let autoApproved = 0;
  if (timings.autoApproveOnReviewTimeout) {
    const toApprove = await prisma.application.findMany({
      where: {
        workStatus:          'SUBMITTED',
        escrowStatus:        { not: 'FROZEN' },
        businessReviewDueAt: { lt: now },
      },
      select: { id: true },
    });
    for (const { id } of toApprove) {
      try {
        await campaignService.systemApproveWork(id);
        autoApproved += 1;
      } catch (err) {
        logger.error({ err, appId: id }, 'escrow sweep: auto-approve failed');
      }
    }
  }

  return { reminders: toRemind.length, autoApproved };
}

// ── Sweep 6: settlement hold elapsed → release to creator (§20) ──────────────
async function sweepSettlementReleases(now: Date): Promise<number> {
  const rows = await prisma.application.findMany({
    where: {
      escrowStatus:     'RELEASE_PENDING',
      paymentReleaseAt: { lt: now },
    },
    select: { id: true },
  });
  let released = 0;
  for (const { id } of rows) {
    try {
      const r = await escrowService.release({ applicationId: id, actor: { type: 'SYSTEM' }, reason: 'Settlement window elapsed' });
      if (r.released) released += 1;
    } catch (err) {
      logger.error({ err, appId: id }, 'escrow sweep: settlement release failed');
    }
  }
  return released;
}

async function runEscrowSweep(): Promise<void> {
  const now = new Date();
  const results: Record<string, unknown> = {};
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try {
      results[name] = await fn();
    } catch (err) {
      logger.error({ err, sweep: name }, 'escrow sweep step failed');
    }
  };

  await step('paymentTimeouts',      () => sweepPaymentTimeouts(now));
  await step('confirmationTimeouts', () => sweepConfirmationTimeouts(now));
  await step('contentDeadlines',     () => sweepContentDeadlines(now));
  await step('creatorFailures',      () => sweepCreatorFailures(now));
  await step('settlementReleases',   () => sweepSettlementReleases(now));
  await step('businessReview',       () => sweepBusinessReview(now));

  const touched = Object.values(results).some(
    (v) => (typeof v === 'number' && v > 0) || (v && typeof v === 'object' && Object.values(v).some((n) => (n as number) > 0)),
  );
  if (touched) logger.info({ results }, 'Escrow state-machine sweep');
}

export function startEscrowStateMachineJob(): void {
  // Every 5 minutes — the spec's windows are measured in hours, so 5-minute
  // resolution keeps transitions timely without hammering the DB.
  cron.schedule('*/5 * * * *', () => {
    runEscrowSweep().catch((err) => logger.error({ err }, 'Escrow sweep failed'));
  });
}

// Exported for tests / manual admin trigger.
export { runEscrowSweep };
