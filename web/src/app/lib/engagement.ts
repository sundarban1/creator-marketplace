import type { BadgeTone } from '../ui/StatusBadge';

/**
 * The backend derives one `engagementState` label per application (see
 * `application-state-machine.ts`) — the value the UI should switch on. This
 * maps each state to a display bucket, a localised label key and a badge tone,
 * shared by the dashboard, applications list and work screens.
 */
export type EngagementState =
  | 'PROPOSAL_PENDING'
  | 'PROPOSAL_REJECTED'
  | 'PROPOSAL_EXPIRED'
  | 'PROPOSAL_WITHDRAWN'
  | 'CREATOR_SELECTED'
  | 'PAYMENT_EXPIRED'
  | 'ESCROW_FUNDED'
  | 'CREATOR_CONFIRMATION_EXPIRED'
  | 'IN_PROGRESS'
  | 'REVISION_REQUESTED'
  | 'CONTENT_OVERDUE'
  | 'CREATOR_FAILED'
  | 'BUSINESS_REVIEW'
  | 'PAYMENT_RELEASE_PENDING'
  | 'DISPUTED'
  | 'PAYMENT_RELEASED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'CANCELLED'
  | 'COMPLETED';

/** Which tab / section an application belongs in. */
export type EngagementBucket = 'pending' | 'active' | 'completed' | 'closed';

interface EngagementMeta {
  bucket: EngagementBucket;
  /** i18n key under `engagement.*` */
  labelKey: string;
  tone: BadgeTone;
}

const META: Record<EngagementState, EngagementMeta> = {
  PROPOSAL_PENDING: { bucket: 'pending', labelKey: 'proposalPending', tone: 'warning' },
  PROPOSAL_REJECTED: { bucket: 'closed', labelKey: 'proposalRejected', tone: 'danger' },
  PROPOSAL_EXPIRED: { bucket: 'closed', labelKey: 'proposalExpired', tone: 'neutral' },
  PROPOSAL_WITHDRAWN: { bucket: 'closed', labelKey: 'proposalWithdrawn', tone: 'neutral' },
  CREATOR_SELECTED: { bucket: 'active', labelKey: 'creatorSelected', tone: 'info' },
  PAYMENT_EXPIRED: { bucket: 'closed', labelKey: 'paymentExpired', tone: 'neutral' },
  ESCROW_FUNDED: { bucket: 'active', labelKey: 'escrowFunded', tone: 'info' },
  CREATOR_CONFIRMATION_EXPIRED: { bucket: 'closed', labelKey: 'confirmationExpired', tone: 'neutral' },
  IN_PROGRESS: { bucket: 'active', labelKey: 'inProgress', tone: 'progress' },
  REVISION_REQUESTED: { bucket: 'active', labelKey: 'revisionRequested', tone: 'warning' },
  CONTENT_OVERDUE: { bucket: 'active', labelKey: 'contentOverdue', tone: 'danger' },
  CREATOR_FAILED: { bucket: 'closed', labelKey: 'creatorFailed', tone: 'danger' },
  BUSINESS_REVIEW: { bucket: 'active', labelKey: 'businessReview', tone: 'progress' },
  PAYMENT_RELEASE_PENDING: { bucket: 'active', labelKey: 'paymentReleasePending', tone: 'progress' },
  DISPUTED: { bucket: 'active', labelKey: 'disputed', tone: 'danger' },
  PAYMENT_RELEASED: { bucket: 'completed', labelKey: 'paymentReleased', tone: 'success' },
  REFUNDED: { bucket: 'closed', labelKey: 'refunded', tone: 'neutral' },
  PARTIALLY_REFUNDED: { bucket: 'closed', labelKey: 'partiallyRefunded', tone: 'neutral' },
  CANCELLED: { bucket: 'closed', labelKey: 'cancelled', tone: 'neutral' },
  COMPLETED: { bucket: 'completed', labelKey: 'completed', tone: 'success' },
};

const FALLBACK: EngagementMeta = { bucket: 'pending', labelKey: 'unknown', tone: 'neutral' };

export function engagementMeta(state: string): EngagementMeta {
  return META[state as EngagementState] ?? FALLBACK;
}

/** Active work = an accepted engagement that still needs the creator's attention. */
export function isActiveWork(state: string): boolean {
  return engagementMeta(state).bucket === 'active';
}
