import { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import { logger } from '../../config/logger';
import { frontendBaseUrl } from '../../config/env';
import { notificationService } from './notification.service';
import { sendActionEmail, type ActionEmail } from '../../utils/email/collaborationReminder';

// ───────────────────────────────────────────────────────────────────────────────
// Collaboration reminder dispatcher. Event generation (campaign.service call
// sites, jobs/collaborationReminders.ts sweeps) decides WHO and WHAT; this
// decides HOW: dedupe → bell + push (existing notificationService, push via the
// BullMQ queue when available) → email when the recipient has it enabled.
//
// Cancellation model: reminders are never pre-scheduled. A sweep only calls
// notify() for engagements whose outstanding action is STILL outstanding, so
// "creator submitted early → no 3h reminder" falls out of the sweep's WHERE
// clause. The dedupe key only prevents the same reminder firing twice.
// ───────────────────────────────────────────────────────────────────────────────

// Internal event names (spec §13). Values double as the bell/push `type`, which
// the mobile client routes on (mobile/src/utilities/notificationRouting.ts).
export const NotificationEvent = {
  COLLABORATION_SELECTED:             'proposal_accepted',
  COLLABORATION_CONFIRMATION_PENDING: 'confirmation_pending',
  NEW_APPLICATION:                    'proposal_received',
  DELIVERABLE_DUE_24H:                'deliverable_due_24h',
  DELIVERABLE_DUE_3H:                 'deliverable_due_3h',
  DELIVERABLE_SUBMITTED:              'work_submitted',
  DELIVERABLE_REVIEW_PENDING:         'review_reminder',
  REVISION_REQUESTED:                 'revision_requested',
  REVISION_SUBMITTED:                 'revision_submitted',
  PAYMENT_PENDING:                    'payment_pending',
  PAYMENT_APPROVED:                   'work_approved',
  PAYMENT_RELEASED:                   'payment_released',
  COLLABORATION_INACTIVE:             'collaboration_inactive',
  COLLABORATION_COMPLETED:            'project_completed',
  REVIEW_PENDING:                     'review_pending',
  RESPONSE_PENDING:                   'response_pending',
  DEADLINE_RISK:                      'deadline_risk',
  APPLICATIONS_PENDING_REVIEW:        'applications_pending_review',
} as const;
export type NotificationEventType = (typeof NotificationEvent)[keyof typeof NotificationEvent];

// Competition events (modules/competition/competition.notifications.ts). Same
// dispatcher and dedupe ledger; refType is always 'competition', refId the
// competition id (web: web/src/app/lib/notificationRoute.ts).
export const CompetitionNotificationEvent = {
  JOINED:               'competition_joined',
  NEW_PARTICIPANTS:     'competition_new_participants',
  SUBMISSION_RECEIVED:  'competition_submission_received',
  NEW_SUBMISSIONS:      'competition_new_submissions',
  STAGE_OPENED:         'competition_stage_opened',
  DEADLINE_CHANGED:     'competition_deadline_changed',
  DEADLINE_REMINDER:    'competition_deadline_reminder',
  ORGANIZER_DEADLINE:   'competition_organizer_deadline',
  READY_FOR_REVIEW:     'competition_ready_for_review',
  NEEDS_ATTENTION:      'competition_needs_attention',
  ADVANCED:             'competition_advanced',
  NOT_SELECTED:         'competition_not_selected',
  RESULTS_PUBLISHED:    'competition_results_published',
  RESULTS_REOPENED:     'competition_results_reopened',
  PAUSED:               'competition_paused',
  RESUMED:              'competition_resumed',
  CANCELLED:            'competition_cancelled',
  UPDATED:              'competition_updated',
  SUSPENDED:            'competition_suspended',
  REVIEW_APPROVED:      'competition_review_approved',
  REVIEW_CHANGES:       'competition_review_changes_requested',
  REVIEW_REJECTED:      'competition_review_rejected',
  EDIT_APPROVED:        'competition_edit_approved',
  EDIT_REJECTED:        'competition_edit_rejected',
  // Prize payments
  FUNDING_REQUIRED:     'competition_funding_required',
  FUNDING_CONFIRMED:    'competition_funding_confirmed',
  FUNDING_FAILED:       'competition_funding_failed',
  PRIZES_OUTSTANDING:   'competition_prizes_outstanding',
  PRIZE_WON:            'competition_prize_won',
  PAYOUT_UPDATE:        'competition_payout_update',
  PAYMENT_REPORTED:     'competition_prize_payment_reported',
  PAYMENT_CONFIRMED:    'competition_prize_payment_confirmed',
  PAYMENT_DISPUTED:     'competition_prize_payment_disputed',
  DISPUTE_RESOLVED:     'competition_prize_dispute_resolved',
} as const;
export type CompetitionNotificationType = (typeof CompetitionNotificationEvent)[keyof typeof CompetitionNotificationEvent];

// Web page that owns the action a collaboration notification asks for. Mirrors
// web/src/app/lib/notificationRoute.ts so an email CTA lands exactly where the
// web bell would. Logged-out visitors hit the login screen, which returns them
// here (query string included) after sign-in.
const BUSINESS_REVIEW_TYPES = new Set<string>(['work_submitted', 'revision_submitted', 'review_reminder']);

export function collaborationWebPath(role: 'CREATOR' | 'BUSINESS', type: string, campaignId: string): string {
  const id = encodeURIComponent(campaignId);
  if (role === 'CREATOR') return `/creator/work/${id}`;
  return BUSINESS_REVIEW_TYPES.has(type) ? `/business/deliverables?campaign=${id}` : `/business/events/${id}`;
}

export function collaborationWebUrl(role: 'CREATOR' | 'BUSINESS', type: string, campaignId: string): string {
  return `${frontendBaseUrl}${collaborationWebPath(role, type, campaignId)}`;
}

/** Fixed window an application falls into for push grouping (B2). */
export function applicationPushWindow(now: Date, windowMinutes: number): { start: Date; end: Date; index: number } {
  const ms = windowMinutes * 60_000;
  const index = Math.floor(now.getTime() / ms);
  return { start: new Date(index * ms), end: new Date((index + 1) * ms), index };
}

export function applicationPushKey(campaignId: string, windowIndex: number): string {
  return `campaign:${campaignId}:proposal_received_push:${windowIndex}`;
}

export interface NotifyInput {
  userId: string;
  type: NotificationEventType | CompetitionNotificationType;
  /** Push title / bell title — keep short. */
  title: string;
  body: string;
  refId?: string;
  refType?: string;
  applicationId?: string;
  campaignId?: string;
  /** Omit to always send (one-off immediate events). Set for anything a sweep can re-derive. */
  dedupeKey?: string;
  /** Sent only when the user has emailNotificationsEnabled and a real address. */
  email?: ActionEmail;
  /**
   * Throttles just the email (bell + push still always send) — e.g. one "new
   * application" email per campaign per hour however many creators apply.
   */
  emailDedupeKey?: string;
  /**
   * Throttles just the push: when this key is already claimed the bell row is
   * still written but no push goes out (the grouped-summary sweep covers it).
   */
  pushThrottleKey?: string;
}

export type NotifyResult = 'sent' | 'duplicate' | 'failed';

/** Canonical per-engagement dedupe key, e.g. `app:abc123:deliverable_due_24h`. */
export function engagementKey(applicationId: string, type: string, suffix?: string): string {
  return `app:${applicationId}:${type}${suffix ? `:${suffix}` : ''}`;
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export async function notify(input: NotifyInput): Promise<NotifyResult> {
  const { userId, type, title, body, refId, refType, applicationId, campaignId, dedupeKey, emailDedupeKey, pushThrottleKey } = input;
  let { email } = input;

  // Claim first: the unique insert is the lock. A concurrent sweep on another
  // instance loses the race here and sends nothing.
  let deliveryId: string | null = null;
  if (dedupeKey) {
    try {
      const row = await prisma.notificationDelivery.create({
        data: { dedupeKey, userId, type, applicationId, campaignId },
        select: { id: true },
      });
      deliveryId = row.id;
    } catch (err) {
      if (isUniqueViolation(err)) return 'duplicate';
      logger.warn({ err, dedupeKey }, 'notify: failed to claim dedupe key');
      return 'failed';
    }
  }

  try {
    let push = true;
    if (pushThrottleKey) {
      push = await prisma.notificationDelivery
        .create({ data: { dedupeKey: pushThrottleKey, userId, type, applicationId, campaignId } })
        .then(() => true)
        .catch((err) => { if (!isUniqueViolation(err)) { logger.warn({ err, pushThrottleKey }, 'notify: push throttle claim failed'); return true; } return false; });
    }

    // Bell + socket + push (push honours pushNotificationsEnabled downstream).
    const notification = await notificationService.create({ userId, type, title, body, refId, refType, applicationId }, { push });

    let emailSent = false;
    if (email && emailDedupeKey) {
      const claimed = await prisma.notificationDelivery
        .create({ data: { dedupeKey: emailDedupeKey, userId, type, applicationId, campaignId, notificationId: notification.id } })
        .then(() => true)
        .catch((err) => { if (!isUniqueViolation(err)) logger.warn({ err, emailDedupeKey }, 'notify: email throttle claim failed'); return false; });
      if (!claimed) email = undefined;
    }
    if (email) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, emailNotificationsEnabled: true },
      });
      if (user?.email && user.emailNotificationsEnabled) {
        await sendActionEmail(user.email, email)
          .then(() => { emailSent = true; })
          .catch((err) => logger.warn({ err, userId, type }, 'notify: email send failed'));
      }
    }

    if (deliveryId) {
      const now = new Date();
      await prisma.notificationDelivery
        .update({
          where: { id: deliveryId },
          data: { notificationId: notification.id, pushSentAt: now, emailSentAt: emailSent ? now : null },
        })
        .catch((err) => logger.warn({ err, deliveryId }, 'notify: failed to record delivery'));
    }
    return 'sent';
  } catch (err) {
    // Nothing reached the user — release the claim so the next sweep retries.
    if (deliveryId) await prisma.notificationDelivery.delete({ where: { id: deliveryId } }).catch(() => {});
    logger.warn({ err, userId, type, dedupeKey }, 'notify: delivery failed');
    return 'failed';
  }
}
