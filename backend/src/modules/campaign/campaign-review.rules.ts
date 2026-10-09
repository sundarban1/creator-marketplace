import type { CampaignStatus } from '@prisma/client';

// Event review (moderation) rules — pure, no I/O, so the transition table and
// the material-edit diff are unit-testable and shared by every write path.
//
// Status mapping onto the existing CampaignStatus enum:
//   PENDING_APPROVAL  = Pending Review
//   ACTIVE            = Published
//   CHANGES_REQUESTED = Changes Requested
//   REJECTED          = Rejected

export type ReviewDecision = 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT';

/** Statuses a creator (or anonymous visitor) may ever see. Everything else is owner/admin only. */
export const CREATOR_VISIBLE_STATUSES: readonly CampaignStatus[] = ['ACTIVE', 'PAUSED', 'CLOSED', 'EXPIRED'];

/** Statuses that sit in, or came out of, moderation without being published. */
export const UNPUBLISHED_REVIEW_STATUSES: readonly CampaignStatus[] = ['PENDING_APPROVAL', 'CHANGES_REQUESTED', 'REJECTED'];

/** Already-approved statuses where a material edit sends the event back to review. */
export const APPROVED_STATUSES: readonly CampaignStatus[] = ['ACTIVE', 'PAUSED'];

export function isCreatorVisible(status: CampaignStatus | string): boolean {
  return (CREATOR_VISIBLE_STATUSES as readonly string[]).includes(status);
}

export const DECISION_TARGET: Record<ReviewDecision, CampaignStatus> = {
  APPROVE:         'ACTIVE',
  REQUEST_CHANGES: 'CHANGES_REQUESTED',
  REJECT:          'REJECTED',
};

/** Admin decisions are only ever taken on an event that is pending review. */
export function canDecide(from: CampaignStatus | string): boolean {
  return from === 'PENDING_APPROVAL';
}

/** Whether the business may send this event (back) into the review queue. */
export function canResubmit(from: CampaignStatus | string, resubmissionAllowed: boolean): boolean {
  if (from === 'CHANGES_REQUESTED') return true;
  if (from === 'REJECTED') return resubmissionAllowed;
  return false;
}

/** Feedback/reason must carry real content — not empty, not whitespace. */
export const MIN_REVIEW_FEEDBACK = 10;
export const MAX_REVIEW_FEEDBACK = 4000;
export function normalizeFeedback(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw.replace(/\r\n/g, '\n').trim();
  if (text.length < MIN_REVIEW_FEEDBACK || text.length > MAX_REVIEW_FEEDBACK) return null;
  return text;
}

// Edits to these fields change what a creator commits to (pay, work, dates,
// eligibility, terms) or what they're shown (title/description/cover), so on
// an approved event they send it back to review. Anything else — pause/close,
// featured toggle, open-event FULL flag, hashtags, draft bookkeeping — is a
// harmless edit that stays live.
export const MATERIAL_FIELDS = [
  'title', 'description', 'featureImageUrl', 'category', 'campaignType',
  'budgetMin', 'budgetMax', 'budgetRateType', 'paymentType', 'creatorsNeeded',
  'deliverables', 'deliverableItems', 'contentType', 'platforms', 'minFollowers',
  'deadline', 'startDate', 'applicationDeadline', 'eventDate', 'eventTime',
  'location', 'locationType', 'locations', 'locationScope', 'venue',
  'benefits', 'capacity', 'targetAudience', 'brief', 'goals',
] as const;

function normalize(v: unknown): unknown {
  if (v === undefined || v === null || v === '') return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const t = Date.parse(v);
    return Number.isNaN(t) ? v : new Date(t).toISOString();
  }
  if (Array.isArray(v)) return v.map(normalize);
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return Object.fromEntries(Object.keys(o).sort().map((k) => [k, normalize(o[k])]).filter(([, x]) => x !== null));
  }
  return v;
}

/**
 * Material fields whose value actually differs between the stored event and
 * the edit. Clients typically send the whole form, so presence alone isn't a
 * change — only a real difference counts.
 */
export function materialChanges(before: Record<string, unknown>, input: Record<string, unknown>): string[] {
  return MATERIAL_FIELDS.filter((f) => {
    if (input[f] === undefined) return false;
    return JSON.stringify(normalize(input[f])) !== JSON.stringify(normalize(before[f]));
  });
}
