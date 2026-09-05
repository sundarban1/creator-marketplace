import { AppError } from '../../middleware/error';
import { getDict } from '../../i18n';

import { HttpStatus } from '../../constants/httpStatus';

// ───────────────────────────────────────────────────────────────────────────────
// Engagement state machine (escrow spec §3–§35).
//
// Kolab tracks three independent status axes on an Application — the
// relationship (Application.status), the submission (Application.workStatus) and
// the money (Application.escrowStatus). This module does NOT collapse them into
// one stored column; it provides:
//
//   1. deriveEngagementState()  — a single read-only label for UI / analytics,
//      computed from the three axes + the relevant timestamps.
//   2. Per-axis transition tables + assert helpers — reject an illegal move
//      (e.g. approving already-approved work, releasing frozen escrow) at the
//      service layer, so the backend is the source of truth rather than the
//      mobile client hiding a button.
//   3. The §35 permission matrix — who may trigger each action.
//
// The existing ad-hoc `if` guards in campaign.service.ts stay; these asserts
// run alongside them and formalise the same rules in one place.
// ───────────────────────────────────────────────────────────────────────────────

export type EngagementState =
  | 'PROPOSAL_PENDING'
  | 'PROPOSAL_REJECTED'
  | 'PROPOSAL_EXPIRED'
  | 'PROPOSAL_WITHDRAWN'
  | 'CREATOR_SELECTED'          // accepted, awaiting business payment
  | 'PAYMENT_EXPIRED'          // business missed the funding window
  | 'ESCROW_FUNDED'            // paid, awaiting creator confirmation / start
  | 'CREATOR_CONFIRMATION_EXPIRED'
  | 'IN_PROGRESS'
  | 'REVISION_REQUESTED'
  | 'CONTENT_OVERDUE'
  | 'CREATOR_FAILED'
  | 'BUSINESS_REVIEW'          // content submitted, under review
  | 'PAYMENT_RELEASE_PENDING'  // approved, settlement window counting down
  | 'DISPUTED'
  | 'PAYMENT_RELEASED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface EngagementSnapshot {
  applicationStatus: string;   // ApplicationStatus
  workStatus: string;          // WorkStatus
  escrowStatus: string;        // EscrowStatus
  campaignType: string;        // 'PAID_CAMPAIGN' | 'OPEN_EVENT'
  campaignStatus?: string;     // CampaignStatus, when known
  revisionRequestedAt?: Date | string | null;
}

/**
 * The one label the frontend should switch on. Pure — never touches the DB.
 * Order of checks matters: terminal / money states win over in-flight ones.
 */
export function deriveEngagementState(s: EngagementSnapshot): EngagementState {
  const { applicationStatus, workStatus, escrowStatus, campaignType } = s;

  // Relationship terminal states first.
  if (applicationStatus === 'REJECTED')  return 'PROPOSAL_REJECTED';
  if (applicationStatus === 'EXPIRED')   return 'PROPOSAL_EXPIRED';
  if (applicationStatus === 'WITHDRAWN') return 'PROPOSAL_WITHDRAWN';
  if (applicationStatus === 'PENDING' || applicationStatus === 'SHORTLISTED') return 'PROPOSAL_PENDING';

  // From here applicationStatus === 'ACCEPTED'.

  if (s.campaignStatus === 'CANCELLED') return 'CANCELLED';

  // Money terminal / blocking states.
  if (workStatus === 'DISPUTED' || escrowStatus === 'FROZEN') return 'DISPUTED';
  if (escrowStatus === 'REFUNDED')          return 'REFUNDED';
  if (escrowStatus === 'PARTIALLY_REFUNDED') return 'PARTIALLY_REFUNDED';
  if (escrowStatus === 'RELEASED')          return workStatus === 'COMPLETED' ? 'COMPLETED' : 'PAYMENT_RELEASED';

  // Free events: acceptance is terminal (no escrow, no work stage).
  if (campaignType === 'OPEN_EVENT') return 'COMPLETED';

  // Paid campaign, escrow not yet released.
  if (workStatus === 'COMPLETED') return 'COMPLETED';
  if (escrowStatus === 'RELEASE_PENDING') return 'PAYMENT_RELEASE_PENDING';

  if (workStatus === 'SUBMITTED') return 'BUSINESS_REVIEW';
  if (workStatus === 'CREATOR_FAILED') return 'CREATOR_FAILED';
  if (workStatus === 'CONTENT_OVERDUE') return 'CONTENT_OVERDUE';

  if (workStatus === 'IN_PROGRESS') {
    return s.revisionRequestedAt ? 'REVISION_REQUESTED' : 'IN_PROGRESS';
  }

  // workStatus NONE (or REVISION) — depends on escrow.
  if (escrowStatus === 'HELD')            return 'ESCROW_FUNDED';
  if (escrowStatus === 'REFUND_PENDING')  return 'REFUNDED';
  if (escrowStatus === 'PAYMENT_PENDING') return 'CREATOR_SELECTED';
  if (escrowStatus === 'NOT_FUNDED')      return 'CREATOR_SELECTED';

  return 'CREATOR_SELECTED';
}

// ── Per-axis transition tables ────────────────────────────────────────────────
// An entry maps a from-status to the set of statuses it may move to. A move to
// the same status is always allowed (idempotent re-writes). Anything not listed
// throws a 409.

const ESCROW_TRANSITIONS: Record<string, string[]> = {
  NOT_FUNDED:         ['PAYMENT_PENDING', 'HELD'],
  PAYMENT_PENDING:    ['HELD', 'NOT_FUNDED'],                 // NOT_FUNDED = payment window expired
  HELD:               ['RELEASE_PENDING', 'RELEASED', 'REFUND_PENDING', 'REFUNDED', 'FROZEN'],
  RELEASE_PENDING:    ['RELEASED', 'FROZEN'],
  FROZEN:             ['HELD', 'RELEASED', 'REFUND_PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED'],
  REFUND_PENDING:     ['REFUNDED', 'PARTIALLY_REFUNDED'],
  RELEASED:           [],
  REFUNDED:           [],
  PARTIALLY_REFUNDED: [],
};

const WORK_TRANSITIONS: Record<string, string[]> = {
  NONE:            ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS:     ['SUBMITTED', 'CONTENT_OVERDUE', 'CANCELLED'],
  CONTENT_OVERDUE: ['SUBMITTED', 'CREATOR_FAILED'],
  SUBMITTED:       ['APPROVED', 'IN_PROGRESS', 'DISPUTED', 'COMPLETED'], // IN_PROGRESS = revision requested
  REVISION:        ['SUBMITTED', 'IN_PROGRESS'],
  APPROVED:        ['COMPLETED', 'DISPUTED'],
  DISPUTED:        ['COMPLETED', 'IN_PROGRESS', 'CANCELLED'],
  CREATOR_FAILED:  ['CANCELLED'],
  COMPLETED:       [],
  CANCELLED:       [],
};

function assertTransition(
  table: Record<string, string[]>,
  axis: string,
  from: string,
  to: string,
): void {
  if (from === to) return;
  const allowed = table[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(getDict().campaign.illegalTransition(axis, from, to), HttpStatus.CONFLICT);
  }
}

export function assertEscrowTransition(from: string, to: string): void {
  assertTransition(ESCROW_TRANSITIONS, 'escrow', from, to);
}

export function assertWorkTransition(from: string, to: string): void {
  assertTransition(WORK_TRANSITIONS, 'work', from, to);
}

// ── §35 permission matrix ─────────────────────────────────────────────────────

export type EngagementActor = 'BUSINESS' | 'CREATOR' | 'ADMIN' | 'SYSTEM';

export type EngagementAction =
  | 'selectCreator'
  | 'payCampaign'
  | 'confirmPayment'
  | 'confirmEngagement'
  | 'startContent'
  | 'submitContent'
  | 'requestRevision'
  | 'approveContent'
  | 'raiseDispute'
  | 'resolveDispute'
  | 'markOverdue'
  | 'expirePayment'
  | 'expireConfirmation'
  | 'releasePayment'
  | 'refund'
  | 'completeEngagement';

const PERMISSIONS: Record<EngagementAction, EngagementActor[]> = {
  selectCreator:       ['BUSINESS', 'ADMIN'],
  payCampaign:         ['BUSINESS'],
  confirmPayment:      ['SYSTEM'],
  confirmEngagement:   ['CREATOR', 'ADMIN'],
  startContent:        ['CREATOR', 'ADMIN'],
  submitContent:       ['CREATOR'],
  requestRevision:     ['BUSINESS', 'ADMIN'],
  approveContent:      ['BUSINESS', 'ADMIN'],
  raiseDispute:        ['BUSINESS', 'CREATOR'],
  resolveDispute:      ['ADMIN'],
  markOverdue:         ['SYSTEM'],
  expirePayment:       ['SYSTEM'],
  expireConfirmation:  ['SYSTEM'],
  releasePayment:      ['ADMIN', 'SYSTEM'],
  refund:              ['ADMIN', 'SYSTEM'],
  completeEngagement:  ['SYSTEM', 'BUSINESS'],
};

export function canPerform(action: EngagementAction, actor: EngagementActor): boolean {
  return PERMISSIONS[action].includes(actor);
}

export function assertCanPerform(action: EngagementAction, actor: EngagementActor): void {
  if (!canPerform(action, actor)) {
    throw new AppError(getDict().campaign.actorMayNotPerformAction(actor.toLowerCase(), action), HttpStatus.FORBIDDEN);
  }
}
