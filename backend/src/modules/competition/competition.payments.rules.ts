import type { Problem } from './competition.rules';

// ─────────────────────────────────────────────────────────────────────────────
// Prize payments — pure rules (no DB), shared by the service and unit tests.
//
// Money is integer paisa everywhere a payment record is involved. Prize
// definitions keep their existing NPR `amount` (advertised value); toPaisa()
// is the single place that converts, and only amounts with at most two
// decimals are accepted for competitions that use prize payments.
// ─────────────────────────────────────────────────────────────────────────────

export type PrizePaymentMethod = 'KOLAB' | 'DIRECT';

export type FundingStatus =
  | 'NOT_REQUIRED' | 'UNFUNDED' | 'PENDING' | 'PARTIALLY_FUNDED' | 'FUNDED' | 'FAILED' | 'REFUND_PENDING' | 'REFUNDED';

export type PayoutStatus =
  | 'NOT_READY' | 'AWAITING_BUSINESS_PAYMENT' | 'APPROVED' | 'PROCESSING' | 'AWAITING_CONFIRMATION'
  | 'PAID' | 'FAILED' | 'DISPUTED' | 'CANCELLED';

export const FUNDING_PROVIDERS = ['khalti', 'esewa'] as const;
export type FundingProvider = (typeof FUNDING_PROVIDERS)[number];

/** NPR → paisa. Null when the amount isn't a finite, non-negative value with ≤ 2 decimals. */
export function toPaisa(npr: number | null | undefined): number | null {
  if (npr == null || !Number.isFinite(npr) || npr < 0) return null;
  const paisa = Math.round(npr * 100);
  // Reject 12.345 etc. — the rounding above must not silently change the value.
  if (Math.abs(paisa - npr * 100) > 1e-6) return null;
  return paisa;
}

export const fromPaisa = (paisa: number) => paisa / 100;

export interface PrizeLike {
  title: string;
  amount?: number | null;
  recipientCount: number;
}

/** Σ amount × recipients over cash prizes, in paisa. Non-cash prizes (no amount / 0) don't count. */
export function cashAllocationPaisa(prizes: PrizeLike[]): number {
  return prizes.reduce((sum, p) => sum + (toPaisa(p.amount) ?? 0) * p.recipientCount, 0);
}

export interface PaymentConfig {
  prizePaymentMethod: PrizePaymentMethod | null;
  cashPrizePoolPaisa: number | null;
  paymentTermsMethod: PrizePaymentMethod | null;
  paymentTermsAcceptedAt: Date | null;
}

/**
 * Problems with the prize + payment configuration.
 * `strict` (submit for review / publish) additionally requires a complete,
 * fully-allocated, accepted configuration; draft saves only reject things that
 * are wrong no matter what (bad amounts, over-allocation, disabled method).
 */
export function validatePaymentConfig(
  prizes: PrizeLike[],
  cfg: PaymentConfig,
  opts: { strict: boolean; kolabEnabled: boolean },
): Problem[] {
  const out: Problem[] = [];
  prizes.forEach((p, i) => {
    if (p.amount != null && toPaisa(p.amount) == null) {
      out.push({ field: `prizes.${i}.amount`, message: `${p.title || `Prize ${i + 1}`}: amount can have at most 2 decimal places` });
    }
  });
  const allocated = cashAllocationPaisa(prizes);
  const pool = cfg.cashPrizePoolPaisa;

  if (cfg.prizePaymentMethod === 'KOLAB' && !opts.kolabEnabled) {
    out.push({ field: 'prizePaymentMethod', message: 'Paying prizes through Kolab isn’t available yet. Choose “Pay winners directly”.' });
  }
  if (pool != null && allocated > pool) {
    out.push({ field: 'cashPrizePool', message: `Cash prizes (NPR ${fromPaisa(allocated).toLocaleString('en-IN')}) exceed the declared prize pool (NPR ${fromPaisa(pool).toLocaleString('en-IN')})` });
  }
  if (!opts.strict) return out;

  if (allocated > 0) {
    if (!cfg.prizePaymentMethod) out.push({ field: 'prizePaymentMethod', message: 'Choose how cash prizes will be paid' });
    if (pool == null) out.push({ field: 'cashPrizePool', message: 'Enter the total cash prize pool' });
    else if (allocated !== pool) {
      out.push({ field: 'cashPrizePool', message: `Allocate the whole prize pool: NPR ${fromPaisa(pool).toLocaleString('en-IN')} declared, NPR ${fromPaisa(allocated).toLocaleString('en-IN')} allocated` });
    }
    if (cfg.prizePaymentMethod && (cfg.paymentTermsMethod !== cfg.prizePaymentMethod || !cfg.paymentTermsAcceptedAt)) {
      out.push({ field: 'paymentTermsAccepted', message: 'Accept the prize payment terms before submitting' });
    }
  } else if (pool != null && pool > 0) {
    out.push({ field: 'cashPrizePool', message: 'Add cash prize amounts that add up to the prize pool, or clear the pool' });
  }
  return out;
}

/** Funding status a pre-launch competition should sit in for its configuration. */
export function baselineFundingStatus(method: PrizePaymentMethod | null, poolPaisa: number | null): FundingStatus {
  return method === 'KOLAB' && (poolPaisa ?? 0) > 0 ? 'UNFUNDED' : 'NOT_REQUIRED';
}

/** Statuses in which money has moved (or may be moving) — method and pool are then locked. */
export const FUNDING_LOCKED: FundingStatus[] = ['PENDING', 'PARTIALLY_FUNDED', 'FUNDED', 'REFUND_PENDING', 'REFUNDED'];

/** A competition can go live only when its prizes need no funding or are fully funded. */
export const fundingAllowsLaunch = (s: FundingStatus | string) => s === 'NOT_REQUIRED' || s === 'FUNDED';

// ── Payout state machine ─────────────────────────────────────────────────────
// Every status change goes through canPayoutTransition(); clients only ever
// ask for an action, never a status.

export type PayoutActor = 'ADMIN' | 'BUSINESS' | 'CREATOR' | 'SYSTEM';

export type PayoutAction =
  | 'approve' | 'start_processing' | 'mark_paid' | 'mark_failed' | 'retry' | 'cancel'
  | 'report_payment' | 'confirm_receipt' | 'dispute' | 'admin_verify' | 'resolve_unpaid';

interface Transition { method: PrizePaymentMethod; from: PayoutStatus[]; to: PayoutStatus; actor: PayoutActor }

export const PAYOUT_TRANSITIONS: Record<PayoutAction, Transition[]> = {
  // Kolab-managed (manual payout by an authorised payment admin)
  approve:          [{ method: 'KOLAB', from: ['NOT_READY'], to: 'APPROVED', actor: 'ADMIN' }],
  start_processing: [{ method: 'KOLAB', from: ['APPROVED'], to: 'PROCESSING', actor: 'ADMIN' }],
  mark_paid:        [{ method: 'KOLAB', from: ['PROCESSING'], to: 'PAID', actor: 'ADMIN' }],
  mark_failed:      [{ method: 'KOLAB', from: ['PROCESSING', 'DISPUTED'], to: 'FAILED', actor: 'ADMIN' }],
  retry:            [{ method: 'KOLAB', from: ['FAILED'], to: 'APPROVED', actor: 'ADMIN' }],
  // Direct business payment
  report_payment:   [{ method: 'DIRECT', from: ['AWAITING_BUSINESS_PAYMENT', 'AWAITING_CONFIRMATION', 'DISPUTED'], to: 'AWAITING_CONFIRMATION', actor: 'BUSINESS' }],
  confirm_receipt:  [
    { method: 'DIRECT', from: ['AWAITING_CONFIRMATION', 'DISPUTED'], to: 'PAID', actor: 'CREATOR' },
    { method: 'KOLAB', from: ['DISPUTED'], to: 'PAID', actor: 'CREATOR' },
  ],
  dispute:          [
    { method: 'DIRECT', from: ['AWAITING_BUSINESS_PAYMENT', 'AWAITING_CONFIRMATION'], to: 'DISPUTED', actor: 'CREATOR' },
    { method: 'KOLAB', from: ['PAID'], to: 'DISPUTED', actor: 'CREATOR' },
  ],
  // Admin review of a disputed / unconfirmed payment
  admin_verify:     [
    { method: 'DIRECT', from: ['AWAITING_CONFIRMATION', 'DISPUTED'], to: 'PAID', actor: 'ADMIN' },
    { method: 'KOLAB', from: ['DISPUTED'], to: 'PAID', actor: 'ADMIN' },
  ],
  resolve_unpaid:   [{ method: 'DIRECT', from: ['DISPUTED', 'AWAITING_CONFIRMATION'], to: 'AWAITING_BUSINESS_PAYMENT', actor: 'ADMIN' }],
  cancel:           [
    { method: 'KOLAB', from: ['NOT_READY', 'APPROVED', 'FAILED'], to: 'CANCELLED', actor: 'ADMIN' },
    { method: 'DIRECT', from: ['AWAITING_BUSINESS_PAYMENT', 'DISPUTED'], to: 'CANCELLED', actor: 'ADMIN' },
  ],
};

/** The target status, or null when this actor can't take this action from here. */
export function payoutTransition(action: PayoutAction, method: PrizePaymentMethod, from: PayoutStatus, actor: PayoutActor): PayoutStatus | null {
  const t = PAYOUT_TRANSITIONS[action].find((x) => x.method === method && x.actor === actor && x.from.includes(from));
  return t ? t.to : null;
}

/** Initial status of a freshly created payout. */
export const initialPayoutStatus = (method: PrizePaymentMethod): PayoutStatus => (method === 'KOLAB' ? 'NOT_READY' : 'AWAITING_BUSINESS_PAYMENT');

/** Payouts in these states have had no money movement — reopening results may cancel them. */
export const PAYOUT_UNTOUCHED: PayoutStatus[] = ['NOT_READY', 'AWAITING_BUSINESS_PAYMENT', 'CANCELLED'];

/** Statuses that still need someone to act. */
export const PAYOUT_OPEN: PayoutStatus[] = ['NOT_READY', 'AWAITING_BUSINESS_PAYMENT', 'APPROVED', 'PROCESSING', 'AWAITING_CONFIRMATION', 'FAILED', 'DISPUTED'];

/** Map a Khalti lookup status to a funding attempt outcome. */
export function khaltiOutcome(status: string): 'SUCCEEDED' | 'PENDING' | 'FAILED' | 'CANCELLED' {
  switch (status) {
    case 'Completed': return 'SUCCEEDED';
    case 'Pending': case 'Initiated': return 'PENDING';
    case 'User canceled': case 'Expired': return 'CANCELLED';
    default: return 'FAILED'; // Refunded, Partially refunded, unknown
  }
}

/** Map an eSewa status-check value to a funding attempt outcome. */
export function esewaOutcome(status: string): 'SUCCEEDED' | 'PENDING' | 'FAILED' | 'CANCELLED' {
  switch (status) {
    case 'COMPLETE': return 'SUCCEEDED';
    case 'PENDING': case 'AMBIGUOUS': return 'PENDING';
    case 'CANCELED': case 'NOT_FOUND': return 'CANCELLED';
    default: return 'FAILED'; // FULL_REFUND, PARTIAL_REFUND, unknown
  }
}
