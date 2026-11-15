// Pure rules for the UGC report workflow — no DB, no I/O, so they're unit-
// tested directly (moderation.rules.test.ts) and every service path goes
// through the same checks.
//
//   NEW (pending) → UNDER_REVIEW → [NEEDS_MORE_INFO ↔ UNDER_REVIEW]
//                 → verification recorded (VALID | INVALID)
//                 → ACTION_TAKEN (VALID) | DISMISSED (INVALID)
//                 → RESOLVED
//
// A report is never closed automatically: RESOLVED requires an admin to have
// recorded a verification decision AND an outcome first.
import type { ReportPriority, ReportReason, ReportStatus, ReportVerification } from '@prisma/client';

export const OPEN_STATUSES: ReportStatus[] = ['NEW', 'UNDER_REVIEW', 'NEEDS_MORE_INFO'];

// The ten reasons the apps offer. Legacy values (FRAUD, FAKE_PROFILE,
// PAYMENT_ISSUE) are still accepted for old clients but not shown.
export const USER_REPORT_REASONS = [
  'HARASSMENT', 'HATE_SPEECH', 'INAPPROPRIATE_CONTENT', 'VIOLENCE', 'SPAM',
  'SCAM', 'COPYRIGHT', 'EXPLOITATION', 'AGE_INAPPROPRIATE', 'OTHER',
] as const;

// Threats, exploitation and content unsafe for the age rating (which covers
// anything involving minors) jump the queue and trigger the urgent alert.
export function priorityForReason(reason: ReportReason): ReportPriority {
  switch (reason) {
    case 'VIOLENCE':
    case 'EXPLOITATION':
    case 'AGE_INAPPROPRIATE':
      return 'URGENT';
    case 'HARASSMENT':
    case 'HATE_SPEECH':
    case 'INAPPROPRIATE_CONTENT':
    case 'SCAM':
    case 'FRAUD':
      return 'HIGH';
    case 'SPAM':
      return 'LOW';
    default:
      return 'NORMAL';
  }
}

// Sort weight for the admin queue: open before closed, then urgent first.
export const PRIORITY_RANK: Record<ReportPriority, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

export type RuleResult = { ok: true } | { ok: false; error: string };
const ok: RuleResult = { ok: true };
const no = (error: string): RuleResult => ({ ok: false, error });

export function canStartReview(status: ReportStatus): RuleResult {
  return status === 'NEW' || status === 'NEEDS_MORE_INFO' ? ok : no(`Cannot start review from ${status}`);
}

export function canRequestMoreInfo(status: ReportStatus): RuleResult {
  return status === 'NEW' || status === 'UNDER_REVIEW' ? ok : no(`Cannot request more information on a ${status} report`);
}

// Verification can be recorded (or changed) any time the report is still open.
export function canVerify(status: ReportStatus): RuleResult {
  return OPEN_STATUSES.includes(status) ? ok : no('This report is already closed');
}

// Enforcement actions need a VALID verification on an open/actioned report —
// a report alone is never proof of a violation.
export function canTakeAction(status: ReportStatus, verification: ReportVerification): RuleResult {
  if (status === 'DISMISSED' || status === 'RESOLVED') return no('This report is already closed');
  if (verification !== 'VALID') return no('Record the report as VALID before taking an enforcement action');
  return ok;
}

export function canDismiss(status: ReportStatus, verification: ReportVerification): RuleResult {
  if (!OPEN_STATUSES.includes(status)) return no('Only an open report can be dismissed');
  if (verification !== 'INVALID') return no('Record the report as INVALID before dismissing it');
  return ok;
}

export function canResolve(status: ReportStatus, verification: ReportVerification): RuleResult {
  if (status === 'ACTION_TAKEN' && verification === 'VALID') return ok;
  if (status === 'DISMISSED' && verification === 'INVALID') return ok;
  if (status === 'RESOLVED') return no('This report is already resolved');
  return no('Record a verification decision and an action or dismissal before resolving');
}

// Which enforcement actions make sense for a given report target. Content
// actions need something that can be hidden; user actions need an owner.
export const CONTENT_REMOVABLE_TYPES = ['OPPORTUNITY', 'COMPETITION', 'COMPETITION_SUBMISSION', 'PORTFOLIO_ITEM', 'MESSAGE', 'BUSINESS', 'SERVICE'] as const;
export function isContentRemovable(targetType: string): boolean {
  return (CONTENT_REMOVABLE_TYPES as readonly string[]).includes(targetType);
}

export const MAX_TEMP_SUSPENSION_DAYS = 365;
