import { Prisma, type CampaignReviewAction, type CampaignStatus } from '@prisma/client';
import prisma from '../../prisma';
import { AppError } from '../../middleware/error';
import { HttpStatus } from '../../constants/httpStatus';
import { env, frontendBaseUrl } from '../../config/env';
import { logger } from '../../config/logger';
import { notificationService } from '../notifications/notification.service';
import { DEFAULT_SUPPORT_EMAIL } from '../../utils/email/core';
import {
  eventAdminActionEmail, eventApprovedEmail, eventChangesRequestedEmail, eventRejectedEmail, eventSubmittedAdminEmail,
  sendEventReviewEmail, type EventReviewEmail,
} from '../../utils/email/eventReview';
import { isBusinessFullyVerified } from '../../utils/verification';
import { canDecide, canResubmit, DECISION_TARGET, normalizeFeedback, MIN_REVIEW_FEEDBACK, type ReviewDecision } from './campaign-review.rules';

// ───────────────────────────────────────────────────────────────────────────────
// Event review (moderation) workflow. Every status change here is a single
// conditional UPDATE (`WHERE status = <expected>`) plus an append-only
// CampaignReview row in the same transaction — so two admins clicking at once,
// or a double-submitted request, produce exactly one decision; the loser gets 409.
// Bell/email go out only after the commit, and an email failure never touches
// the committed status. Each email claims a notification_deliveries key first,
// so a retried call can't send it twice.
// ───────────────────────────────────────────────────────────────────────────────

export const REVIEW_ETA_TEXT = 'within 2–3 hours';
export const SUBMITTED_FOR_REVIEW_MESSAGE =
  `Your event has been submitted for review. A Kolab admin will review it ${REVIEW_ETA_TEXT}. You can track its status from your dashboard.`;
export const PUBLISHED_VERIFIED_MESSAGE =
  'Your business is verified, so your event skipped review and is now live for creators.';
const VERIFIED_AUTO_APPROVAL_NOTE = 'Published instantly — verified business.';

/**
 * Verified businesses skip the review queue: their submissions publish
 * straight to ACTIVE. "Verified" is the admin-toggled badge or the derived
 * full verification (contacts + approved documents) — the same two signals
 * the apps show as the verified badge.
 */
export function skipsReview(b: {
  isVerified: boolean; panDocStatus: string; companyRegDocStatus: string;
  identityDocStatus?: string; representingType?: string | null;
  user?: { isEmailVerified: boolean; isPhoneVerified: boolean } | null;
}): boolean {
  return b.isVerified || (!!b.user && isBusinessFullyVerified(b.user, b));
}

type Tx = Prisma.TransactionClient;

const businessEventUrl = (id: string) => `${frontendBaseUrl}/business/events/${encodeURIComponent(id)}`;
const adminReviewUrl = (id: string) => `${frontendBaseUrl}/admin/campaigns/${encodeURIComponent(id)}`;
// Mobile deep links (app.json "scheme": "kolab") — the same screens a push tap
// opens via mobile/src/utilities/notificationRouting.ts.
const appEventUrl = (id: string) => `kolab://campaign-detail?campaignId=${encodeURIComponent(id)}`;
const APP_EVENTS_URL = 'kolab://campaigns';

function adminRecipients(): string[] {
  const raw = env.ADMIN_EMAIL ?? DEFAULT_SUPPORT_EMAIL;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function eventTypeLabel(t: string | null | undefined): string {
  return t === 'OPEN_EVENT' ? 'Open Event' : 'Paid Event';
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/**
 * Sends one review email at most once per `dedupeKey`. The claim row is
 * released when delivery throws, so a later retry (e.g. the admin "resend"
 * path re-invoking this) can try again; it is kept once the provider accepts.
 */
export async function deliverReviewEmailOnce(opts: {
  dedupeKey: string; userId: string; campaignId: string; type: string; to: string; email: EventReviewEmail;
}): Promise<'sent' | 'duplicate' | 'failed'> {
  let claimId: string;
  try {
    const row = await prisma.notificationDelivery.create({
      data: { dedupeKey: opts.dedupeKey, userId: opts.userId, type: opts.type, campaignId: opts.campaignId },
      select: { id: true },
    });
    claimId = row.id;
  } catch (err) {
    if (isUniqueViolation(err)) return 'duplicate';
    logger.warn({ err, dedupeKey: opts.dedupeKey }, 'event-review: email claim failed');
    return 'failed';
  }
  try {
    await sendEventReviewEmail(opts.to, opts.email);
    await prisma.notificationDelivery.update({ where: { id: claimId }, data: { emailSentAt: new Date() } }).catch(() => {});
    return 'sent';
  } catch (err) {
    await prisma.notificationDelivery.delete({ where: { id: claimId } }).catch(() => {});
    logger.error({ err, dedupeKey: opts.dedupeKey, campaignId: opts.campaignId }, 'event-review: email send failed');
    return 'failed';
  }
}

async function recordReview(tx: Tx, row: {
  campaignId: string; actorId: string | null; action: CampaignReviewAction;
  fromStatus: CampaignStatus | null; toStatus: CampaignStatus; feedback?: string | null;
  revision: number; changedFields?: string[];
}) {
  return tx.campaignReview.create({ data: { ...row, feedback: row.feedback ?? null, changedFields: row.changedFields ?? [] } });
}

const CAMPAIGN_WITH_BUSINESS = {
  business: { select: { id: true, userId: true, businessName: true, logoUrl: true, user: { select: { email: true } } } },
} as const;

// Admin actions on an event outside the review decisions. Each one reaches the
// business three ways from one source of copy: bell (web dashboard + mobile
// notification list), mobile push (sent with the bell row), and email.
export type AdminEventAction = 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'CANCELLED' | 'EXPIRED' | 'DELETED';

const ADMIN_ACTION_COPY: Record<AdminEventAction, { bell: string; subject: string; message: (title: string) => string }> = {
  ACTIVE: {
    bell: 'Event Reactivated',
    subject: 'Your Kolab Event Is Active Again',
    message: (t) => `Your event "${t}" has been reactivated by the Kolab team. Eligible creators can discover it and submit proposals again.`,
  },
  PAUSED: {
    bell: 'Event Paused',
    subject: 'Your Kolab Event Has Been Paused',
    message: (t) => `Your event "${t}" has been paused by the Kolab team. It is hidden from creators and cannot receive new proposals until it is reactivated. Collaborations already in progress are not affected.`,
  },
  CLOSED: {
    bell: 'Event Closed',
    subject: 'Your Kolab Event Has Been Closed',
    message: (t) => `Your event "${t}" has been closed by the Kolab team. It no longer accepts proposals.`,
  },
  CANCELLED: {
    bell: 'Event Cancelled',
    subject: 'Your Kolab Event Has Been Cancelled',
    message: (t) => `Your event "${t}" has been cancelled by the Kolab team. It is no longer visible to creators and cannot receive proposals.`,
  },
  EXPIRED: {
    bell: 'Event Marked Expired',
    subject: 'Your Kolab Event Has Expired',
    message: (t) => `Your event "${t}" has been marked as expired by the Kolab team. It no longer accepts proposals.`,
  },
  DELETED: {
    bell: 'Event Removed',
    subject: 'Your Kolab Event Has Been Removed',
    message: (t) => `Your event "${t}" has been removed by the Kolab team. Its proposals, invitations and any work in progress for it were removed as well.`,
  },
};

export class CampaignReviewService {
  // ── Submission (business side) ─────────────────────────────────────────────

  /**
   * History rows for a brand-new event created straight into the queue — or,
   * for a verified business (`autoApprove`), created straight into ACTIVE.
   * Call inside the create transaction.
   */
  async recordInitialSubmission(tx: Tx, campaignId: string, actorId: string, autoApprove = false) {
    await recordReview(tx, {
      campaignId, actorId, action: 'SUBMITTED', fromStatus: null, toStatus: 'PENDING_APPROVAL', revision: 1,
    });
    if (autoApprove) await this.recordAutoApproval(tx, campaignId, 1);
  }

  /** System approval row (no admin actor) for a verified business's submission. */
  private recordAutoApproval(tx: Tx, campaignId: string, revision: number) {
    return recordReview(tx, {
      campaignId, actorId: null, action: 'APPROVED', fromStatus: 'PENDING_APPROVAL', toStatus: 'ACTIVE',
      feedback: VERIFIED_AUTO_APPROVAL_NOTE, revision,
    });
  }

  /**
   * Moves an event into PENDING_APPROVAL from `from` (draft publish, resubmit
   * after CHANGES_REQUESTED/REJECTED, or a material edit to a published event).
   * Conditional on the status still being `from`, so it can't race a decision.
   * Extra `data` (the edit itself) is written in the same UPDATE.
   * `autoApprove` (verified business) publishes it straight to ACTIVE instead,
   * recording the submission plus a system approval.
   */
  async submitForReview(tx: Tx, opts: {
    campaignId: string; actorId: string; from: CampaignStatus; action: CampaignReviewAction;
    changedFields?: string[]; data?: Prisma.CampaignUpdateManyMutationInput; autoApprove?: boolean;
  }) {
    const now = new Date();
    const res = await tx.campaign.updateMany({
      where: { id: opts.campaignId, status: opts.from, deletedAt: null },
      data: {
        ...(opts.data ?? {}),
        status: opts.autoApprove ? 'ACTIVE' : 'PENDING_APPROVAL',
        submittedForReviewAt: now,
        reviewRevision: { increment: 1 },
        ...(opts.autoApprove ? { reviewedAt: now, reviewFeedback: null, resubmissionAllowed: true } : {}),
      },
    });
    if (res.count === 0) throw new AppError('This event changed while you were editing it. Refresh and try again.', HttpStatus.CONFLICT);
    const { reviewRevision } = await tx.campaign.findUniqueOrThrow({ where: { id: opts.campaignId }, select: { reviewRevision: true } });
    await recordReview(tx, {
      campaignId: opts.campaignId, actorId: opts.actorId, action: opts.action,
      fromStatus: opts.from, toStatus: 'PENDING_APPROVAL', revision: reviewRevision, changedFields: opts.changedFields,
    });
    if (opts.autoApprove) await this.recordAutoApproval(tx, opts.campaignId, reviewRevision);
    return reviewRevision;
  }

  /** Explicit "Resubmit" (no field changes) for CHANGES_REQUESTED or resubmittable REJECTED events. */
  async resubmit(campaignId: string, userId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, deletedAt: null },
      include: CAMPAIGN_WITH_BUSINESS,
    });
    if (!campaign) throw new AppError('Event not found', HttpStatus.NOT_FOUND);
    if (campaign.business.userId !== userId) throw new AppError('You can only resubmit your own events', HttpStatus.FORBIDDEN);
    this.assertResubmittable(campaign.status, campaign.resubmissionAllowed);

    const revision = await prisma.$transaction((tx) => this.submitForReview(tx, {
      campaignId, actorId: userId, from: campaign.status, action: 'RESUBMITTED',
    }));
    this.notifyAdminsOfSubmission({ id: campaign.id, title: campaign.title, campaignType: campaign.campaignType, businessName: campaign.business.businessName }, revision, true);
    return prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  }

  assertResubmittable(status: CampaignStatus, resubmissionAllowed: boolean) {
    if (canResubmit(status, resubmissionAllowed)) return;
    if (status === 'REJECTED') {
      throw new AppError('This event was rejected and cannot be resubmitted. Contact Kolab support if you need clarification.', HttpStatus.FORBIDDEN);
    }
    throw new AppError('Only events with requested changes (or rejected events that allow resubmission) can be resubmitted.', HttpStatus.CONFLICT);
  }

  /** Bell for every admin + email to the configured review inbox. Fire-and-forget. */
  notifyAdminsOfSubmission(
    c: { id: string; title: string; campaignType: string | null; businessName: string | null },
    revision: number,
    resubmission: boolean,
  ) {
    const businessName = c.businessName ?? 'A business';
    notificationService.createForAdmins({
      type:    'campaign_created',
      title:   resubmission ? 'Event Resubmitted for Review' : 'New Event Awaiting Review',
      body:    `${businessName} ${resubmission ? 'resubmitted' : 'submitted'} "${c.title}" (${eventTypeLabel(c.campaignType)}).`,
      refId:   c.id,
      refType: 'campaign',
    }).catch((err) => logger.warn({ err, campaignId: c.id }, 'event-review: admin bell failed'));

    const email = eventSubmittedAdminEmail({
      eventTitle: c.title, businessName, eventType: eventTypeLabel(c.campaignType), resubmission, reviewUrl: adminReviewUrl(c.id),
    });
    void (async () => {
      // notification_deliveries.userId is a required FK — attribute the claim
      // to any admin account (the key itself is what dedupes).
      const anyAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
      if (!anyAdmin) return;
      for (const to of adminRecipients()) {
        await deliverReviewEmailOnce({
          dedupeKey: `campaign:${c.id}:review-submitted:${revision}:${to.toLowerCase()}`,
          userId: anyAdmin.id, campaignId: c.id, type: 'campaign_review_submitted', to, email,
        });
      }
    })().catch((err) => logger.warn({ err, campaignId: c.id }, 'event-review: admin email failed'));
  }

  // ── Decisions (admin side) ─────────────────────────────────────────────────

  async decide(campaignId: string, adminId: string, decision: ReviewDecision, input: { feedback?: unknown; allowResubmission?: unknown } = {}) {
    let feedback: string | null = null;
    if (decision !== 'APPROVE') {
      feedback = normalizeFeedback(input.feedback);
      if (!feedback) {
        throw new AppError(
          decision === 'REJECT'
            ? `A rejection reason is required (at least ${MIN_REVIEW_FEEDBACK} characters).`
            : `Feedback is required (at least ${MIN_REVIEW_FEEDBACK} characters) so the business knows what to change.`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const resubmissionAllowed = decision === 'REJECT' ? input.allowResubmission !== false : true;
    const toStatus = DECISION_TARGET[decision];

    const existing = await prisma.campaign.findFirst({ where: { id: campaignId, deletedAt: null }, select: { status: true } });
    if (!existing) throw new AppError('Event not found', HttpStatus.NOT_FOUND);
    if (!canDecide(existing.status)) {
      throw new AppError(`This event is not pending review (current status: ${existing.status}).`, HttpStatus.CONFLICT);
    }

    const { campaign, review, previouslyApproved } = await prisma.$transaction(async (tx) => {
      const res = await tx.campaign.updateMany({
        where: { id: campaignId, status: 'PENDING_APPROVAL', deletedAt: null },
        data: {
          status: toStatus,
          reviewedAt: new Date(),
          reviewFeedback: feedback,
          resubmissionAllowed,
        },
      });
      // Lost the race — another admin (or a retried request) decided first.
      if (res.count === 0) throw new AppError('This event has already been reviewed. Refresh to see the latest decision.', HttpStatus.CONFLICT);
      const campaign = await tx.campaign.findUniqueOrThrow({ where: { id: campaignId }, include: CAMPAIGN_WITH_BUSINESS });
      const previouslyApproved = decision === 'APPROVE'
        && (await tx.campaignReview.count({ where: { campaignId, action: 'APPROVED' } })) > 0;
      const review = await recordReview(tx, {
        campaignId, actorId: adminId, action: decision === 'APPROVE' ? 'APPROVED' : decision === 'REJECT' ? 'REJECTED' : 'CHANGES_REQUESTED',
        fromStatus: 'PENDING_APPROVAL', toStatus, feedback, revision: campaign.reviewRevision,
      });
      return { campaign, review, previouslyApproved };
    });

    this.notifyBusinessOfDecision(campaign, decision, review.id, feedback, resubmissionAllowed);
    return { campaign, reviewId: review.id, previouslyApproved };
  }

  private notifyBusinessOfDecision(
    c: { id: string; title: string; business: { userId: string; businessName: string | null; user: { email: string } } },
    decision: ReviewDecision, reviewId: string, feedback: string | null, resubmissionAllowed: boolean,
  ) {
    const businessName = c.business.businessName ?? 'there';
    const dashboardUrl = businessEventUrl(c.id);
    const bell = decision === 'APPROVE'
      ? { type: 'campaign_approved', title: 'Event Approved', body: `Your event "${c.title}" has been approved and is now published.` }
      : decision === 'REQUEST_CHANGES'
        ? { type: 'campaign_changes_requested', title: 'Changes Requested', body: `The Kolab team requested changes to "${c.title}": ${feedback}` }
        : { type: 'campaign_rejected', title: 'Event Not Approved', body: `Your event "${c.title}" was not approved: ${feedback}` };
    notificationService.create({ userId: c.business.userId, ...bell, refId: c.id, refType: 'campaign' })
      .catch((err) => logger.warn({ err, campaignId: c.id }, 'event-review: business bell failed'));

    const appUrl = appEventUrl(c.id);
    const email = decision === 'APPROVE'
      ? eventApprovedEmail({ businessName, eventTitle: c.title, dashboardUrl, appUrl })
      : decision === 'REQUEST_CHANGES'
        ? eventChangesRequestedEmail({ businessName, eventTitle: c.title, feedback: feedback!, dashboardUrl, appUrl })
        : eventRejectedEmail({ businessName, eventTitle: c.title, reason: feedback!, resubmissionAllowed, dashboardUrl, appUrl });
    void deliverReviewEmailOnce({
      dedupeKey: `campaign-review:${reviewId}:email`,
      userId: c.business.userId, campaignId: c.id, type: bell.type, to: c.business.user.email, email,
    });
  }

  /**
   * Bell + push + email to the business owner after an admin changed their
   * event's status (or removed it). Fire-and-forget, after the write committed.
   * `eventKey` must be unique per change (e.g. the row's new updatedAt) so a
   * retried request can't email twice while a later, separate change still does.
   */
  notifyBusinessOfAdminAction(campaignId: string, action: AdminEventAction, eventKey: string) {
    void (async () => {
      const c = await prisma.campaign.findUnique({ where: { id: campaignId }, include: CAMPAIGN_WITH_BUSINESS });
      if (!c) return;
      const copy = ADMIN_ACTION_COPY[action];
      const message = copy.message(c.title);
      const removed = action === 'DELETED';
      // A removed event has no page to open — send the business to their list.
      await notificationService.create({
        userId: c.business.userId,
        type: removed ? 'campaign_deleted' : 'campaign_status_changed',
        title: copy.bell,
        body: message,
        refId: removed ? undefined : c.id,
        refType: 'campaign',
      }).catch((err) => logger.warn({ err, campaignId }, 'event-admin-action: bell/push failed'));

      await deliverReviewEmailOnce({
        dedupeKey: `campaign:${c.id}:admin-action:${action}:${eventKey}`,
        userId: c.business.userId, campaignId: c.id, type: removed ? 'campaign_deleted' : 'campaign_status_changed',
        to: c.business.user.email,
        email: eventAdminActionEmail({
          businessName: c.business.businessName ?? 'there',
          eventTitle: c.title,
          subject: copy.subject,
          heading: copy.bell,
          message,
          dashboardUrl: removed ? `${frontendBaseUrl}/business/events` : businessEventUrl(c.id),
          ctaLabel: removed ? 'View my events' : 'View my event',
          appUrl: removed ? APP_EVENTS_URL : appEventUrl(c.id),
        }),
      });
    })().catch((err) => logger.warn({ err, campaignId, action }, 'event-admin-action: notify failed'));
  }

  // ── Reads ──────────────────────────────────────────────────────────────────

  /** Review history, newest first. Businesses see decisions as "Kolab team"; admins see who acted. */
  async history(campaignId: string, viewer: { id: string; role: string }) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, ...(viewer.role === 'ADMIN' ? {} : { deletedAt: null }) },
      select: { id: true, business: { select: { userId: true } } },
    });
    if (!campaign) throw new AppError('Event not found', HttpStatus.NOT_FOUND);
    const isAdmin = viewer.role === 'ADMIN';
    if (!isAdmin && campaign.business.userId !== viewer.id) throw new AppError('Event not found', HttpStatus.NOT_FOUND);

    const rows = await prisma.campaignReview.findMany({
      where: { campaignId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: isAdmin ? { actor: { select: { id: true, email: true } } } : undefined,
    });
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      fromStatus: r.fromStatus,
      toStatus: r.toStatus,
      feedback: r.feedback,
      revision: r.revision,
      changedFields: r.changedFields,
      createdAt: r.createdAt.toISOString(),
      actor: isAdmin
        ? ((r as typeof r & { actor?: { id: string; email: string } | null }).actor ?? null)
        : null,
    }));
  }

  /** Tab counts for the admin Event Reviews queue. */
  async queueCounts() {
    const rows = await prisma.campaign.groupBy({
      by: ['status'],
      where: { deletedAt: null, status: { in: ['PENDING_APPROVAL', 'CHANGES_REQUESTED', 'REJECTED', 'ACTIVE'] } },
      _count: { _all: true },
    });
    const get = (s: CampaignStatus) => rows.find((r) => r.status === s)?._count._all ?? 0;
    return {
      PENDING_APPROVAL: get('PENDING_APPROVAL'),
      CHANGES_REQUESTED: get('CHANGES_REQUESTED'),
      REJECTED: get('REJECTED'),
      ACTIVE: get('ACTIVE'),
    };
  }
}

export const campaignReviewService = new CampaignReviewService();
