import cron from 'node-cron';
import prisma from '../prisma';
import { logger } from '../config/logger';
import { reportError, LogEvent } from '../config/observability';
import { notificationService } from '../modules/notifications/notification.service';
import { notify, engagementKey, collaborationWebUrl, NotificationEvent } from '../modules/notifications/notify';
import { escrowService } from '../modules/campaign/escrow.service';
import { getEscrowTimings, deadlineFromNow } from '../modules/campaign/escrow-config';
import { recordCampaignEvent } from '../modules/campaign/campaign-events';
import { logActivity } from '../modules/logging/activity.service';
import { ActivityAction, EntityType } from '../modules/logging/logging.constants';
import { CampaignService } from '../modules/campaign/campaign.service';
import { withJobLock } from '../utils/jobLock';
import { deliverableDeadlineService } from '../modules/campaign/deliverable-deadline.service';
import { REFUND_REASON } from '../modules/refund/refund.core';
import { sweepApplicationDeadlines } from '../modules/campaign/proposal-deadline.service';

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
      applicationId:       app.id,
      reason:              'Business did not fund escrow within the payment window',
      requireEscrowStatus: ['NOT_FUNDED'],
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
    }).catch((err) => logger.warn({ err, appId: app.id }, 'escrow sweep: notification failed'));
    notificationService.create({
      userId:  app.creator.userId,
      type:    'proposal_expired',
      title:   'Selection released',
      body:    `"${app.campaign.title}" was not funded in time. You're free to take on other campaigns.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch((err) => logger.warn({ err, appId: app.id }, 'escrow sweep: notification failed'));
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
    // Refund and free the slot in one transaction — and only if the creator
    // still hasn't confirmed by the time the row lock is held.
    const { refunded } = await escrowService.refund({
      applicationId:     app.id,
      reason:            'Creator did not confirm the engagement within the confirmation window',
      reasonCode:        REFUND_REASON.CONFIRMATION_TIMEOUT,
      actorType:         'SYSTEM',
      silent:            true,
      requireWorkStatus: ['NONE'],
      expireApplication: true,
    });
    if (!refunded) continue;
    void escrowService.bumpReliability(app.creatorId, 'missedConfirmation');

    logActivity({ userId: null, action: ActivityAction.CREATOR_CONFIRMATION_EXPIRED, entityType: EntityType.APPLICATION, entityId: app.id, metadata: { campaignId: app.campaignId, refunded } });

    notificationService.create({
      userId:  app.campaign.business.userId,
      type:    'payment_refunded',
      title:   'Creator did not start — refund requested',
      body:    `The creator for "${app.campaign.title}" didn't confirm in time. A full refund request has been created and is awaiting processing — Kolab will notify you when the transfer is completed. You can select another creator.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch((err) => logger.warn({ err, appId: app.id }, 'escrow sweep: notification failed'));
    notificationService.create({
      userId:  app.creator.userId,
      type:    'proposal_expired',
      title:   'Engagement released',
      body:    `You didn't confirm "${app.campaign.title}" in time, so it was released and a refund was initiated for the business. Confirming promptly keeps your reliability score healthy.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch((err) => logger.warn({ err, appId: app.id }, 'escrow sweep: notification failed'));
  }
  return rows.length;
}

// ── Sweep 3: content deadline passed → CONTENT_OVERDUE (+ decision window), or
// — after an approved extension — straight to CREATOR_FAILED + refund request.
async function sweepContentDeadlines(now: Date): Promise<number> {
  const rows = await prisma.application.findMany({
    where: {
      status:          'ACCEPTED',
      workStatus:      'IN_PROGRESS',
      contentDeadline: { lt: now },
    },
    select: { id: true },
  });
  let moved = 0;
  for (const { id } of rows) {
    try {
      // Re-checks the persisted state under the row lock — a submission or an
      // extension that landed after the query above wins.
      if (await deliverableDeadlineService.handleMissedDeadline(id, now)) moved += 1;
    } catch (err) {
      reportError(err, { event: LogEvent.ESCROW_SWEEP_STEP_FAILED, sweep: 'contentDeadlines', appId: id });
    }
  }
  return moved;
}

// ── Sweep 4: overdue decision window elapsed (no extension agreed) →
// CREATOR_FAILED + refund request (§25 + deadline-extension rules).
async function sweepCreatorFailures(now: Date): Promise<number> {
  const rows = await prisma.application.findMany({
    where: {
      status:               'ACCEPTED',
      workStatus:           'CONTENT_OVERDUE',
      contentGraceDeadline: { lt: now },
    },
    select: { id: true },
  });
  let closed = 0;
  for (const { id } of rows) {
    try {
      if (await deliverableDeadlineService.handleDecisionWindowLapsed(id, now)) closed += 1;
    } catch (err) {
      reportError(err, { event: LogEvent.ESCROW_SWEEP_STEP_FAILED, sweep: 'creatorFailures', appId: id });
    }
  }
  return closed;
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
  }) as (EngagementRow & { id: string; submittedAt: Date | null; businessReviewDueAt: Date | null })[];

  for (const app of toRemind) {
    await prisma.application.update({ where: { id: app.id }, data: { businessReviewReminderSentAt: now } });
    const creator = app.creator.fullName ?? 'Your creator';
    const title = app.campaign.title;
    const type = NotificationEvent.DELIVERABLE_REVIEW_PENDING;
    // notify() never throws — awaited so a sweep run finishes its sends.
    await notify({
      userId:  app.campaign.business.userId,
      type,
      title:   'Submission waiting for review',
      body:    `${creator}'s "${title}" deliverable is waiting for your review. Approve it or request changes before the review window closes.`,
      refId:   app.campaignId,
      refType: 'campaign',
      applicationId: app.id,
      campaignId:    app.campaignId,
      // Per submission — businessReviewReminderSentAt is cleared on each submit.
      dedupeKey: engagementKey(app.id, type, String(app.submittedAt?.getTime() ?? 0)),
      email: {
        subject: `${creator}'s "${title}" deliverable is waiting for your review`,
        heading: 'Submission waiting for review',
        paragraphs: [
          `${creator} submitted their deliverable for "${title}" and is waiting for your feedback.`,
          'Approve the work to release payment, or request changes if something needs fixing.',
        ],
        details: [
          { label: 'Campaign', value: title },
          ...(app.businessReviewDueAt
            ? [{ label: 'Review by', value: app.businessReviewDueAt.toLocaleString('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium', timeStyle: 'short' }) }]
            : []),
        ],
        cta: { label: 'Review Submission', url: collaborationWebUrl('BUSINESS', type, app.campaignId) },
      },
    });
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
        reportError(err, { event: LogEvent.ESCROW_SWEEP_STEP_FAILED, sweep: 'businessReview.autoApprove', appId: id });
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
      const r = await escrowService.release({
        applicationId:       id,
        actor:               { type: 'SYSTEM' },
        reason:              'Settlement window elapsed',
        requireEscrowStatus: ['RELEASE_PENDING'],
      });
      if (r.released) released += 1;
    } catch (err) {
      reportError(err, { event: LogEvent.ESCROW_SWEEP_STEP_FAILED, sweep: 'settlementReleases', appId: id });
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
      reportError(err, { event: LogEvent.ESCROW_SWEEP_STEP_FAILED, sweep: name });
    }
  };

  await step('paymentTimeouts',      () => sweepPaymentTimeouts(now));
  await step('confirmationTimeouts', () => sweepConfirmationTimeouts(now));
  await step('contentDeadlines',     () => sweepContentDeadlines(now));
  await step('creatorFailures',      () => sweepCreatorFailures(now));
  await step('settlementReleases',   () => sweepSettlementReleases(now));
  await step('businessReview',       () => sweepBusinessReview(now));
  await step('applicationDeadlines', () => sweepApplicationDeadlines(now));

  const touched = Object.values(results).some(
    (v) => (typeof v === 'number' && v > 0) || (v && typeof v === 'object' && Object.values(v).some((n) => (n as number) > 0)),
  );
  if (touched) logger.info({ results }, 'Escrow state-machine sweep');
}

export function startEscrowStateMachineJob(): void {
  // Every 5 minutes — the spec's windows are measured in hours, so 5-minute
  // resolution keeps transitions timely without hammering the DB.
  // One sweep at a time across all instances; the 10-minute lease outlives
  // any normal run and frees itself if an instance dies mid-sweep.
  cron.schedule('*/5 * * * *', () => {
    withJobLock('escrow-sweep', 600, runEscrowSweep)
      .catch((err) => reportError(err, { event: LogEvent.ESCROW_SWEEP_STEP_FAILED, sweep: 'top_level' }));
  });
}

// Exported for tests / manual admin trigger.
export { runEscrowSweep };
