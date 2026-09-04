import { getCachedSettings } from '../../utils/settingsCache';

// Single typed accessor for every tunable in the escrow state machine (escrow
// spec §41). Values live in PlatformSetting (admin-editable) with the defaults
// declared in admin.repository.ts's DEFAULTS map; this module only reads them,
// applies a hard fallback if a row is missing or malformed, and never lets the
// state machine reference a raw setting key or a magic number.

export interface EscrowTimings {
  /** Hours the business has to fund escrow after being selected. */
  paymentWindowHours: number;
  /** Hours the creator has to confirm ("Let's Create Content") after funding. */
  creatorConfirmWindowHours: number;
  /** Floor for the content deadline snapshotted when the creator confirms. */
  minContentWindowHours: number;
  /** Grace hours after the content deadline before the creator is failed. */
  contentGraceHours: number;
  /** Hours the business has to review a submission. */
  businessReviewHours: number;
  /** Hours into the review window at which the business is reminded. */
  businessReviewReminderHours: number;
  /** Hold hours after approval before escrow releases to the creator wallet. */
  settlementHours: number;
  /** Revisions included before further changes need a change request. */
  maxIncludedRevisions: number;
  /** Whether business approval holds funds for settlementHours before release. */
  settlementHoldEnabled: boolean;
  /** Whether a lapsed review window auto-approves the submission. */
  autoApproveOnReviewTimeout: boolean;
}

const FALLBACK: EscrowTimings = {
  paymentWindowHours:          24,
  creatorConfirmWindowHours:   24,
  minContentWindowHours:       24,
  contentGraceHours:            6,
  businessReviewHours:         24,
  businessReviewReminderHours: 12,
  settlementHours:             24,
  maxIncludedRevisions:         2,
  settlementHoldEnabled:      false,
  autoApproveOnReviewTimeout: false,
};

function nonNegNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function boolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export async function getEscrowTimings(): Promise<EscrowTimings> {
  const s = await getCachedSettings();
  return {
    paymentWindowHours:          nonNegNumber(s['escrow.paymentWindowHours'], FALLBACK.paymentWindowHours),
    creatorConfirmWindowHours:   nonNegNumber(s['escrow.creatorConfirmWindowHours'], FALLBACK.creatorConfirmWindowHours),
    minContentWindowHours:       nonNegNumber(s['escrow.minContentWindowHours'], FALLBACK.minContentWindowHours),
    contentGraceHours:           nonNegNumber(s['escrow.contentGraceHours'], FALLBACK.contentGraceHours),
    businessReviewHours:         nonNegNumber(s['escrow.businessReviewHours'], FALLBACK.businessReviewHours),
    businessReviewReminderHours: nonNegNumber(s['escrow.businessReviewReminderHours'], FALLBACK.businessReviewReminderHours),
    settlementHours:             nonNegNumber(s['escrow.settlementHours'], FALLBACK.settlementHours),
    maxIncludedRevisions:        Math.floor(nonNegNumber(s['escrow.maxIncludedRevisions'], FALLBACK.maxIncludedRevisions)),
    settlementHoldEnabled:       boolean(s['escrow.settlementHoldEnabled'], FALLBACK.settlementHoldEnabled),
    autoApproveOnReviewTimeout:  boolean(s['escrow.autoApproveOnReviewTimeout'], FALLBACK.autoApproveOnReviewTimeout),
  };
}

/** A deadline `hours` from now, as an absolute timestamp to be stored, never recomputed. */
export function deadlineFromNow(hours: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + hours * 3_600_000);
}
