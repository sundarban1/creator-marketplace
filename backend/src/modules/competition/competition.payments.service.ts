import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import { AppError } from '../../middleware/error';
import { HttpStatus } from '../../constants/httpStatus';
import { getRequestContext } from '../../middleware/requestContext';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { reportError, LogEvent } from '../../config/observability';
import { initiateKhaltiPayment, lookupKhaltiPayment } from '../../utils/khalti';
import { buildEsewaSignedFields, decodeEsewaResponse, verifyEsewaSignature, checkEsewaStatus, parseEsewaAmount, type EsewaFormFields } from '../../utils/esewa';
import { uploadImage } from '../../utils/cloudinary';
import { AuditAction, EntityType, type AuditActionValue } from '../logging/logging.constants';
import * as R from './competition.payments.rules';
import { competitionNotifications as N } from './competition.notifications';
import type { ReportDirectPaymentInput, AdminPayoutActionInput, AdminRefundInput, PaymentsAdminListQuery } from './competition.payments.schema';

// ─────────────────────────────────────────────────────────────────────────────
// Competition prize payments.
//
//  KOLAB  — the business funds the whole cash pool through Khalti / eSewa
//           before the competition can go live (CompetitionFunding ledger).
//           After results are published each cash award gets a payout that an
//           authorised payment admin approves, sends manually, and records with
//           a reference. No automated transfers exist — nothing here claims one.
//  DIRECT — the business pays winners itself after results. Kolab only tracks
//           the business's evidence and the winner's confirmation / dispute.
//           These amounts are never Kolab money and are reported separately.
//
// Rules:
//  * Gateway redirects are never trusted: every confirmation re-checks the
//    gateway (Khalti lookup / eSewa signature + status API) and the amount.
//  * Funding confirmation runs under the competition row lock and is
//    idempotent — a duplicate callback finds the row already SUCCEEDED.
//  * Payout status changes go through competition.payments.rules
//    (payoutTransition) with a conditional UPDATE on the current status, plus
//    a CompetitionPayoutEvent and AuditLog row in the same transaction.
//  * Financial rows are never deleted; refunds are new REFUND rows.
// ─────────────────────────────────────────────────────────────────────────────

type Tx = Prisma.TransactionClient;

const fail = (message: string, status: number, code?: string) => new AppError(message, status, true, code ? { code } : undefined);

const MSG = {
  notFound: 'Competition not found',
  payoutNotFound: 'Prize payment not found',
  kolabDisabled: 'Paying prizes through Kolab isn’t available yet.',
  notKolab: 'This competition’s prizes are paid directly by the organizer.',
  notDirect: 'This prize is paid through Kolab, not directly by the organizer.',
  fundingNotOpen: 'The prize pool can be funded once Kolab has approved your competition.',
  alreadyFunded: 'The prize pool is already fully funded.',
  providerUnavailable: 'This payment method isn’t available right now. Please choose another.',
  fundingMismatch: 'This payment doesn’t match the prize pool payment we started.',
  invalidAction: 'That action isn’t possible for this prize payment right now.',
  changedMeanwhile: 'This prize payment was updated by someone else. Refresh and try again.',
  notPaymentAdmin: 'Only Kolab payment administrators can change prize payments.',
  noPayoutAccount: 'The winner hasn’t added a payout account yet. Ask them to add one in Settings → Payout methods.',
  referenceRequired: 'Enter the transaction reference for this payment.',
  reasonRequired: 'Please give a reason (at least 5 characters).',
  evidenceRequired: 'Add a transaction reference or upload proof of payment.',
  overpay: 'The amount paid can’t be more than the prize amount.',
  futureDate: 'The payment date can’t be in the future.',
  overFunded: 'Recording this payout would pay out more than the funded prize pool.',
  noEvidenceToVerify: 'There is no payment evidence to verify yet.',
  refundTooLarge: 'The refund is larger than the amount Kolab can refund for this competition.',
  refundNotAllowed: 'There is nothing to refund for this competition.',
  paymentsInProgress: 'Prize payments for these results are already in progress, so the results can’t be reopened. Contact Kolab support.',
} as const;

export function isCompetitionPaymentAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  const allowed = (env.COMPETITION_PAYMENT_ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export const kolabPaymentsEnabled = () => env.COMPETITION_KOLAB_PAYMENTS_ENABLED === true;

/** Which funding gateways are configured on this server. */
export function availableProviders(): R.FundingProvider[] {
  const out: R.FundingProvider[] = [];
  if (env.KHALTI_SECRET_KEY && env.KHALTI_RETURN_URL) out.push('khalti');
  if (env.ESEWA_SECRET_KEY && env.ESEWA_RETURN_BASE_URL) out.push('esewa');
  return out;
}

function audit(tx: Tx, a: { actorId?: string | null; actorType: 'USER' | 'ADMIN' | 'SYSTEM'; action: AuditActionValue; competitionId: string; oldValue?: object; newValue?: object; metadata?: object }) {
  const ctx = getRequestContext();
  return tx.auditLog.create({
    data: {
      userId: a.actorId ?? undefined, actorType: a.actorType, action: a.action,
      entityType: EntityType.COMPETITION, entityId: a.competitionId,
      oldValue: a.oldValue as Prisma.InputJsonValue | undefined,
      newValue: a.newValue as Prisma.InputJsonValue | undefined,
      metadata: a.metadata as Prisma.InputJsonValue | undefined,
      ipAddress: ctx?.ip, userAgent: ctx?.userAgent, requestId: ctx?.requestId,
    },
  });
}

const npr = R.fromPaisa;
const lockCompetition = (tx: Tx, id: string) => tx.$queryRaw`SELECT id FROM "competitions" WHERE id = ${id} FOR UPDATE`;

type PayoutRow = Prisma.CompetitionPayoutGetPayload<{ include: { events: true } }>;
type Audience = 'ORGANIZER' | 'CREATOR' | 'ADMIN';

function maskAccount(v: string | null | undefined) {
  if (!v) return null;
  return v.length <= 4 ? v : `••••${v.slice(-4)}`;
}

/** The winner's payout account, shaped for whoever is looking. */
function destinationView(dest: Record<string, unknown> | null, audience: Audience) {
  if (!dest) return null;
  if (audience === 'ADMIN') return dest;
  return { ...dest, accountNumber: maskAccount(dest.accountNumber as string | null), walletId: audience === 'CREATOR' ? maskAccount(dest.walletId as string | null) : dest.walletId };
}

function payoutDto(p: PayoutRow | Prisma.CompetitionPayoutGetPayload<object>, audience: Audience) {
  const events = 'events' in p ? p.events : undefined;
  return {
    id: p.id,
    prizeId: p.prizeId, prizeTitle: p.prizeTitle, prizeKind: p.prizeKind,
    participantId: p.participantId,
    creator: { id: p.creatorId, name: p.creatorName },
    method: p.method,
    grossAmount: npr(p.grossPaisa), deductions: npr(p.deductionsPaisa), netAmount: npr(p.netPaisa),
    status: p.status,
    approvedAt: p.approvedAt, processingAt: p.processingAt, completedAt: p.completedAt,
    payoutChannel: p.payoutChannel,
    payoutDestination: destinationView(p.payoutDestination as Record<string, unknown> | null, audience),
    providerRef: p.providerRef,
    failureReason: p.failureReason,
    reported: p.reportedAt ? {
      amount: p.reportedAmountPaisa != null ? npr(p.reportedAmountPaisa) : null,
      paidOn: p.reportedPaidOn, method: p.reportedMethod, reference: p.reportedReference,
      evidenceUrl: p.evidenceUrl, at: p.reportedAt,
    } : null,
    confirmedAt: p.confirmedAt,
    disputedAt: p.disputedAt, disputeReason: p.disputeReason,
    adminVerifiedAt: p.adminVerifiedAt, adminNote: audience === 'CREATOR' ? null : p.adminNote,
    cancelledAt: p.cancelledAt, cancelReason: p.cancelReason,
    createdAt: p.createdAt, updatedAt: p.updatedAt,
    history: events?.map((e) => ({ from: e.fromStatus, to: e.toStatus, actorType: e.actorType, note: e.note, at: e.createdAt })),
  };
}

function fundingDto(f: Prisma.CompetitionFundingGetPayload<object>) {
  return {
    id: f.id, kind: f.kind, amount: npr(f.amountPaisa), currency: f.currency, provider: f.provider,
    providerRef: f.providerRef, providerTxnId: f.providerTxnId, status: f.status, failureReason: f.failureReason,
    isDuplicate: f.isDuplicate, initiatedAt: f.initiatedAt, confirmedAt: f.confirmedAt,
  };
}

/** Payment configuration as every client shows it. */
export function paymentConfigView(c: {
  prizePaymentMethod: R.PrizePaymentMethod | null; cashPrizePoolPaisa: number | null; prizeTieRule: string | null;
  fundingStatus: R.FundingStatus; fundedAmountPaisa: number; fundedAt: Date | null;
  paymentTermsMethod: R.PrizePaymentMethod | null; paymentTermsAcceptedAt: Date | null;
}) {
  return {
    prizePaymentMethod: c.prizePaymentMethod,
    cashPrizePool: c.cashPrizePoolPaisa != null ? npr(c.cashPrizePoolPaisa) : null,
    prizeTieRule: c.prizeTieRule,
    fundingStatus: c.fundingStatus,
    fundedAmount: npr(c.fundedAmountPaisa),
    fundedAt: c.fundedAt,
    paymentTermsAccepted: !!c.paymentTermsAcceptedAt && c.paymentTermsMethod === c.prizePaymentMethod,
    paymentTermsAcceptedAt: c.paymentTermsAcceptedAt,
  };
}

/** Totals that keep Kolab money and business-direct obligations strictly apart. */
function totals(c: { prizePaymentMethod: string | null; cashPrizePoolPaisa: number | null; fundedAmountPaisa: number }, payouts: Array<{ method: string; status: string; netPaisa: number; reportedAmountPaisa: number | null }>, fundings: Array<{ kind: string; status: string; amountPaisa: number }>) {
  const live = payouts.filter((p) => p.status !== 'CANCELLED');
  const sum = (xs: typeof live) => xs.reduce((s, p) => s + p.netPaisa, 0);
  const kolab = live.filter((p) => p.method === 'KOLAB');
  const direct = live.filter((p) => p.method === 'DIRECT');
  const received = fundings.filter((f) => f.kind === 'CHARGE' && f.status === 'SUCCEEDED').reduce((s, f) => s + f.amountPaisa, 0);
  const refunded = fundings.filter((f) => f.kind === 'REFUND' && f.status === 'SUCCEEDED').reduce((s, f) => s + f.amountPaisa, 0);
  const allocated = sum(live);
  const paid = sum(live.filter((p) => p.status === 'PAID'));
  return {
    advertisedPool: npr(c.cashPrizePoolPaisa ?? 0),
    allocatedToWinners: npr(allocated),
    paid: npr(paid),
    outstanding: npr(allocated - paid),
    // 1–2: Kolab-managed money
    kolab: {
      fundsReceived: npr(received),
      refunded: npr(refunded),
      held: npr(c.fundedAmountPaisa),
      payableToWinners: npr(sum(kolab.filter((p) => p.status !== 'PAID'))),
      paidOut: npr(sum(kolab.filter((p) => p.status === 'PAID'))),
    },
    // 3–5: business pays winners directly — never Kolab money
    direct: {
      owedByBusiness: npr(sum(direct.filter((p) => p.status !== 'PAID'))),
      reportedPaidByBusiness: npr(direct.filter((p) => ['AWAITING_CONFIRMATION', 'DISPUTED', 'PAID'].includes(p.status)).reduce((s, p) => s + (p.reportedAmountPaisa ?? 0), 0)),
      confirmedReceived: npr(sum(direct.filter((p) => p.status === 'PAID'))),
    },
    counts: {
      total: live.length,
      pending: live.filter((p) => R.PAYOUT_OPEN.includes(p.status as R.PayoutStatus) && !['FAILED', 'DISPUTED'].includes(p.status)).length,
      failed: live.filter((p) => p.status === 'FAILED').length,
      disputed: live.filter((p) => p.status === 'DISPUTED').length,
      paid: live.filter((p) => p.status === 'PAID').length,
    },
  };
}

function khaltiReturnUrl(platform: 'web' | 'mobile') {
  const origin = new URL(env.KHALTI_RETURN_URL!).origin;
  return `${origin}/api/payments/competition/khalti/callback${platform === 'web' ? '/web' : ''}`;
}

export class CompetitionPaymentService {
  // ── Lookups ───────────────────────────────────────────────────────────────

  private async owned(userId: string, id: string) {
    const c = await prisma.competition.findFirst({
      where: { id, business: { userId } },
      include: { business: { select: { userId: true, businessName: true } } },
    });
    if (!c) throw fail(MSG.notFound, HttpStatus.NOT_FOUND);
    return c;
  }

  private async participantPayout(userId: string, competitionId: string, payoutId: string) {
    const creator = await prisma.creatorProfile.findUnique({ where: { userId }, select: { id: true } });
    const p = creator && await prisma.competitionPayout.findFirst({ where: { id: payoutId, competitionId, creatorId: creator.id } });
    if (!p) throw fail(MSG.payoutNotFound, HttpStatus.NOT_FOUND);
    return p;
  }

  private async winnerAccount(creatorId: string) {
    const m = await prisma.payoutMethod.findFirst({ where: { creatorId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] });
    if (!m) return null;
    return { type: m.type, label: m.label, accountName: m.accountName, bankName: m.bankName, branch: m.branch, accountNumber: m.accountNumber, walletId: m.walletId };
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  /** Organizer's payment screen: config, funding, payouts and totals. */
  async organizerSummary(userId: string, id: string) {
    const c = await this.owned(userId, id);
    const [fundings, payouts] = await Promise.all([
      prisma.competitionFunding.findMany({ where: { competitionId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.competitionPayout.findMany({ where: { competitionId: id }, orderBy: [{ createdAt: 'asc' }], include: { events: { orderBy: { createdAt: 'asc' } } } }),
    ]);
    // For DIRECT prizes still owed, the organizer needs to know where to pay.
    const accounts = new Map<string, Awaited<ReturnType<CompetitionPaymentService['winnerAccount']>>>();
    for (const p of payouts) {
      if (p.method === 'DIRECT' && ['AWAITING_BUSINESS_PAYMENT', 'DISPUTED'].includes(p.status) && !accounts.has(p.creatorId)) {
        accounts.set(p.creatorId, await this.winnerAccount(p.creatorId));
      }
    }
    const pool = c.cashPrizePoolPaisa ?? 0;
    return {
      config: paymentConfigView(c),
      kolabPaymentsEnabled: kolabPaymentsEnabled(),
      providers: availableProviders(),
      funding: {
        required: c.prizePaymentMethod === 'KOLAB' && pool > 0,
        status: c.fundingStatus,
        requiredAmount: npr(pool),
        confirmedAmount: npr(c.fundedAmountPaisa),
        outstandingAmount: npr(Math.max(0, pool - c.fundedAmountPaisa)),
        canFund: this.fundingBlock(c) === null,
        blockedReason: c.prizePaymentMethod === 'KOLAB' ? this.fundingBlock(c) : null,
        attempts: fundings.map(fundingDto),
      },
      payouts: payouts.map((p) => ({
        ...payoutDto(p, 'ORGANIZER'),
        winnerPayoutAccount: accounts.has(p.creatorId) ? destinationView(accounts.get(p.creatorId) as Record<string, unknown> | null, 'ORGANIZER') : null,
      })),
      totals: totals(c, payouts, fundings),
    };
  }

  /** A winner's own prize payments for one competition (empty for non-winners). */
  async creatorPayouts(creatorId: string, competitionId: string) {
    const rows = await prisma.competitionPayout.findMany({ where: { competitionId, creatorId, status: { not: 'CANCELLED' } }, orderBy: { createdAt: 'asc' } });
    return rows.map((p) => payoutDto(p, 'CREATOR'));
  }

  // ── Organizer: Kolab-managed funding ──────────────────────────────────────

  private fundingBlock(c: { prizePaymentMethod: string | null; cashPrizePoolPaisa: number | null; fundingStatus: string; fundedAmountPaisa: number; status: string; publishedAt: Date | null; suspendedAt: Date | null }): string | null {
    if (c.prizePaymentMethod !== 'KOLAB') return MSG.notKolab;
    if (!kolabPaymentsEnabled()) return MSG.kolabDisabled;
    if (c.suspendedAt) return MSG.fundingNotOpen;
    // Funding opens once Kolab has approved it, and must finish before launch.
    const approvedNotLive = c.status === 'SCHEDULED' || (c.status === 'PAUSED' && !c.publishedAt);
    if (!approvedNotLive) return MSG.fundingNotOpen;
    if ((c.cashPrizePoolPaisa ?? 0) - c.fundedAmountPaisa <= 0 || c.fundingStatus === 'FUNDED') return MSG.alreadyFunded;
    if (!['UNFUNDED', 'FAILED', 'PENDING'].includes(c.fundingStatus)) return MSG.fundingNotOpen;
    return null;
  }

  /**
   * Starts one funding attempt for the outstanding amount. Any earlier attempt
   * still pending is re-checked with its gateway first (so a payment the
   * business already completed is never charged twice), then superseded.
   */
  async initiateFunding(userId: string, id: string, provider: R.FundingProvider, platform: 'web' | 'mobile') {
    let c = await this.owned(userId, id);
    if (!availableProviders().includes(provider)) throw fail(MSG.providerUnavailable, HttpStatus.SERVICE_UNAVAILABLE);

    const pending = await prisma.competitionFunding.findMany({ where: { competitionId: id, kind: 'CHARGE', status: { in: ['INITIATED', 'PENDING'] } } });
    for (const f of pending) await this.reconcileFunding(f.id).catch((err) => logger.warn({ err, fundingId: f.id }, 'competition funding: pre-initiate reconcile failed'));
    c = await this.owned(userId, id);
    const block = this.fundingBlock(c);
    if (block) {
      if (block === MSG.alreadyFunded) return { alreadyFunded: true as const, paymentUrl: null };
      throw fail(block, HttpStatus.CONFLICT);
    }

    const funding = await prisma.$transaction(async (tx) => {
      await lockCompetition(tx, id);
      const fresh = await tx.competition.findUniqueOrThrow({ where: { id } });
      const freshBlock = this.fundingBlock(fresh);
      if (freshBlock) throw fail(freshBlock, HttpStatus.CONFLICT);
      const amountPaisa = (fresh.cashPrizePoolPaisa ?? 0) - fresh.fundedAmountPaisa;
      // A late success on a superseded attempt is still recorded (see applyOutcome).
      await tx.competitionFunding.updateMany({
        where: { competitionId: id, kind: 'CHARGE', status: { in: ['INITIATED', 'PENDING'] } },
        data: { status: 'CANCELLED', failureReason: 'Superseded by a new payment attempt' },
      });
      const f = await tx.competitionFunding.create({
        data: { competitionId: id, kind: 'CHARGE', amountPaisa, provider, idempotencyKey: `${id}:${randomUUID()}`, initiatedById: userId, status: 'INITIATED' },
      });
      await tx.competition.update({ where: { id }, data: { fundingStatus: 'PENDING' } });
      await audit(tx, { actorId: userId, actorType: 'USER', action: AuditAction.COMPETITION_FUNDING_INITIATED, competitionId: id, newValue: { fundingId: f.id, provider, amountPaisa } });
      return f;
    });

    try {
      if (provider === 'khalti') {
        const { pidx, paymentUrl } = await initiateKhaltiPayment({
          amountPaisa: funding.amountPaisa,
          purchaseOrderId: funding.id,
          purchaseOrderName: `Prize pool: ${c.title}`.slice(0, 100),
          returnUrl: khaltiReturnUrl(platform),
          websiteUrl: env.FRONTEND_URL.split(',')[0].trim(),
        });
        await prisma.competitionFunding.update({ where: { id: funding.id }, data: { providerRef: pidx, status: 'PENDING' } });
        return { alreadyFunded: false as const, paymentUrl, fundingId: funding.id };
      }
      // eSewa: our own checkout page auto-posts the signed form.
      await prisma.competitionFunding.update({ where: { id: funding.id }, data: { providerRef: funding.id, status: 'PENDING' } });
      const qs = platform === 'web' ? '?platform=web' : '';
      return { alreadyFunded: false as const, paymentUrl: `${env.ESEWA_RETURN_BASE_URL}/api/payments/competition/esewa/checkout/${funding.id}${qs}`, fundingId: funding.id };
    } catch (err) {
      await this.applyOutcome(funding.id, 'FAILED', { reason: err instanceof AppError ? err.message : 'Could not start the payment' });
      throw err;
    }
  }

  async esewaCheckoutForm(fundingId: string, platform: 'web' | 'mobile'): Promise<EsewaFormFields> {
    const f = await prisma.competitionFunding.findUnique({ where: { id: fundingId } });
    if (!f || f.provider !== 'esewa' || f.status !== 'PENDING' || !f.providerRef) throw fail(MSG.fundingMismatch, HttpStatus.BAD_REQUEST);
    return buildEsewaSignedFields({
      appId: f.id, transactionUuid: f.providerRef, totalAmountNpr: npr(f.amountPaisa), platform,
      callbackPath: '/api/payments/competition/esewa',
    });
  }

  /** Khalti redirect → verified with Khalti's lookup API before anything changes. */
  async confirmKhalti(fundingId: string, pidx: string) {
    const f = await prisma.competitionFunding.findUnique({ where: { id: fundingId } });
    if (!f || f.provider !== 'khalti' || f.providerRef !== pidx) throw fail(MSG.fundingMismatch, HttpStatus.BAD_REQUEST);
    if (f.status === 'SUCCEEDED') return { competitionId: f.competitionId, outcome: 'SUCCEEDED' as const };
    const result = await lookupKhaltiPayment(pidx);
    let outcome = R.khaltiOutcome(result.status);
    let reason: string | undefined = outcome === 'SUCCEEDED' ? undefined : `Khalti: ${result.status}`;
    if (outcome === 'SUCCEEDED' && result.totalAmountPaisa !== f.amountPaisa) {
      reportError(new Error('Competition funding amount mismatch'), { event: LogEvent.PAYMENT_AMOUNT_MISMATCH, method: 'khalti', fundingId, expected: f.amountPaisa, got: result.totalAmountPaisa });
      outcome = 'FAILED';
      reason = 'Amount mismatch — Kolab will review';
    }
    await this.applyOutcome(fundingId, outcome, { providerTxnId: result.transactionId, reason });
    return { competitionId: f.competitionId, outcome };
  }

  /** eSewa redirect → signature + transaction match + eSewa status API. */
  async confirmEsewa(fundingId: string, data: string) {
    const f = await prisma.competitionFunding.findUnique({ where: { id: fundingId } });
    if (!f || f.provider !== 'esewa') throw fail(MSG.fundingMismatch, HttpStatus.BAD_REQUEST);
    if (f.status === 'SUCCEEDED') return { competitionId: f.competitionId, outcome: 'SUCCEEDED' as const };
    const decoded = decodeEsewaResponse(data);
    verifyEsewaSignature(decoded);
    if (decoded.transaction_uuid !== f.providerRef) throw fail(MSG.fundingMismatch, HttpStatus.BAD_REQUEST);
    if (decoded.total_amount && Math.round(parseEsewaAmount(decoded.total_amount) * 100) !== f.amountPaisa) {
      reportError(new Error('Competition funding amount mismatch'), { event: LogEvent.PAYMENT_AMOUNT_MISMATCH, method: 'esewa', fundingId, expected: f.amountPaisa, got: decoded.total_amount });
      await this.applyOutcome(fundingId, 'FAILED', { reason: 'Amount mismatch — Kolab will review' });
      return { competitionId: f.competitionId, outcome: 'FAILED' as const };
    }
    return this.reconcileFunding(fundingId);
  }

  /** Re-checks one attempt with its gateway (callbacks, sweep, admin "check now"). */
  async reconcileFunding(fundingId: string) {
    const f = await prisma.competitionFunding.findUnique({ where: { id: fundingId } });
    if (!f || f.kind !== 'CHARGE') throw fail(MSG.fundingMismatch, HttpStatus.NOT_FOUND);
    if (f.status === 'SUCCEEDED') return { competitionId: f.competitionId, outcome: 'SUCCEEDED' as const };
    if (!f.providerRef) {
      // Gateway never handed back a reference — nothing can have been charged.
      await this.applyOutcome(fundingId, 'CANCELLED', { reason: 'Payment was never started at the gateway' });
      return { competitionId: f.competitionId, outcome: 'CANCELLED' as const };
    }
    let outcome: ReturnType<typeof R.khaltiOutcome>;
    let providerTxnId: string | null = null;
    if (f.provider === 'khalti') {
      const r = await lookupKhaltiPayment(f.providerRef);
      outcome = R.khaltiOutcome(r.status);
      providerTxnId = r.transactionId;
      if (outcome === 'SUCCEEDED' && r.totalAmountPaisa !== f.amountPaisa) outcome = 'FAILED';
    } else {
      const r = await checkEsewaStatus({ transactionUuid: f.providerRef, totalAmountNpr: npr(f.amountPaisa) });
      outcome = R.esewaOutcome(r.status);
      providerTxnId = r.refId;
      // NOT_FOUND right after redirecting just means "not paid yet".
      if (outcome === 'CANCELLED' && Date.now() - f.initiatedAt.getTime() < 30 * 60_000) outcome = 'PENDING';
    }
    await this.applyOutcome(fundingId, outcome, { providerTxnId, reason: outcome === 'SUCCEEDED' ? undefined : `${f.provider}: ${outcome.toLowerCase()}` });
    return { competitionId: f.competitionId, outcome };
  }

  /**
   * The single place a funding attempt's outcome is written. Runs under the
   * competition lock; a row already SUCCEEDED is left alone (duplicate
   * callback). A success on a superseded/cancelled attempt is still recorded —
   * the money really arrived — and flagged for refund if the pool was full.
   */
  private async applyOutcome(fundingId: string, outcome: 'SUCCEEDED' | 'PENDING' | 'FAILED' | 'CANCELLED', d: { providerTxnId?: string | null; reason?: string }) {
    const now = new Date();
    const res = await prisma.$transaction(async (tx) => {
      const head = await tx.competitionFunding.findUniqueOrThrow({ where: { id: fundingId }, select: { competitionId: true } });
      await lockCompetition(tx, head.competitionId);
      const f = await tx.competitionFunding.findUniqueOrThrow({ where: { id: fundingId } });
      const c = await tx.competition.findUniqueOrThrow({ where: { id: f.competitionId }, include: { business: { select: { userId: true } } } });
      if (f.status === 'SUCCEEDED') return { kind: 'noop' as const, c, f };

      if (outcome === 'PENDING') {
        await tx.competitionFunding.update({ where: { id: f.id }, data: { lastCheckedAt: now } });
        return { kind: 'noop' as const, c, f };
      }

      if (outcome === 'SUCCEEDED') {
        const pool = c.cashPrizePoolPaisa ?? 0;
        const duplicate = c.fundedAmountPaisa >= pool;
        const funded = c.fundedAmountPaisa + f.amountPaisa;
        await tx.competitionFunding.update({ where: { id: f.id }, data: { status: 'SUCCEEDED', providerTxnId: d.providerTxnId ?? null, confirmedAt: now, lastCheckedAt: now, failureReason: null, isDuplicate: duplicate } });
        const fundingStatus: R.FundingStatus = funded >= pool ? 'FUNDED' : 'PARTIALLY_FUNDED';
        await tx.competition.update({
          where: { id: c.id },
          data: { fundedAmountPaisa: funded, ...(c.fundingStatus === 'REFUND_PENDING' ? {} : { fundingStatus }), ...(fundingStatus === 'FUNDED' && !c.fundedAt ? { fundedAt: now } : {}) },
        });
        await audit(tx, { actorType: 'SYSTEM', action: AuditAction.COMPETITION_FUNDING_CONFIRMED, competitionId: c.id, oldValue: { fundingStatus: c.fundingStatus, fundedAmountPaisa: c.fundedAmountPaisa }, newValue: { fundingStatus, fundedAmountPaisa: funded }, metadata: { fundingId: f.id, provider: f.provider, providerRef: f.providerRef, providerTxnId: d.providerTxnId, duplicate } });
        return { kind: duplicate ? 'duplicate' as const : fundingStatus === 'FUNDED' ? 'funded' as const : 'partial' as const, c, f };
      }

      // FAILED / CANCELLED
      if (f.status === 'FAILED' || f.status === 'CANCELLED') {
        await tx.competitionFunding.update({ where: { id: f.id }, data: { lastCheckedAt: now } });
        return { kind: 'noop' as const, c, f };
      }
      await tx.competitionFunding.update({ where: { id: f.id }, data: { status: outcome, failureReason: d.reason ?? null, lastCheckedAt: now } });
      const stillPending = await tx.competitionFunding.count({ where: { competitionId: c.id, kind: 'CHARGE', status: { in: ['INITIATED', 'PENDING'] }, id: { not: f.id } } });
      if (c.fundingStatus === 'PENDING' && !stillPending) {
        await tx.competition.update({ where: { id: c.id }, data: { fundingStatus: c.fundedAmountPaisa > 0 ? 'PARTIALLY_FUNDED' : 'FAILED' } });
      }
      await audit(tx, { actorType: 'SYSTEM', action: AuditAction.COMPETITION_FUNDING_FAILED, competitionId: c.id, metadata: { fundingId: f.id, provider: f.provider, outcome, reason: d.reason } });
      return { kind: 'failed' as const, c, f };
    });

    const { c, f } = res;
    if (res.kind === 'funded') {
      void N.fundingConfirmed(c.business.userId, c, f.id, npr(f.amountPaisa)).catch((err) => logger.warn({ err }, 'competition funding: notify failed'));
      // Go live now if approval already happened (the sweep re-checks funding).
      const { competitionService } = await import('./competition.service');
      await competitionService.runLifecycleSweep(new Date(), c.id).catch((err) => logger.warn({ err }, 'competition funding: publish sweep failed'));
    } else if (res.kind === 'duplicate') {
      void N.adminPaymentAttention(c, `A second prize pool payment of NPR ${npr(f.amountPaisa)} was received for “${c.title}” after it was already funded. Refund it to the business.`).catch(() => {});
    } else if (res.kind === 'failed' && f.initiatedById) {
      void N.fundingFailed(c.business.userId, c, f.id).catch(() => {});
    }
  }

  // ── Hooks called by CompetitionService inside its transactions ────────────

  /** Results published → one payout per published cash award. Returns what to notify after commit. */
  async createPayoutsForResults(tx: Tx, competitionId: string, actorId: string) {
    const c = await tx.competition.findUniqueOrThrow({ where: { id: competitionId } });
    if (!c.prizePaymentMethod) return { method: null, created: [] as Array<{ payoutId: string; userId: string; prizeTitle: string; amountNpr: number }> };
    const method = c.prizePaymentMethod;
    const awards = await tx.competitionAward.findMany({
      where: { competitionId, isPublished: true, payout: null },
      include: { prize: true, participant: { include: { creator: { select: { id: true, fullName: true, userId: true } } } } },
    });
    const cash = awards.map((a) => ({ a, paisa: R.toPaisa(a.prize.amount) ?? 0 })).filter((x) => x.paisa > 0);

    if (method === 'KOLAB') {
      const existing = await tx.competitionPayout.aggregate({ where: { competitionId, status: { not: 'CANCELLED' } }, _sum: { netPaisa: true } });
      const total = (existing._sum.netPaisa ?? 0) + cash.reduce((s, x) => s + x.paisa, 0);
      if (total > c.fundedAmountPaisa) throw fail(MSG.overFunded, HttpStatus.CONFLICT);
    }

    const created: Array<{ payoutId: string; userId: string; prizeTitle: string; amountNpr: number }> = [];
    const status = R.initialPayoutStatus(method);
    for (const { a, paisa } of cash) {
      const p = await tx.competitionPayout.create({
        data: {
          competitionId, awardId: a.id, prizeId: a.prizeId, prizeTitle: a.prize.title, prizeKind: a.prize.kind,
          participantId: a.participantId, creatorId: a.participant.creator.id, creatorName: a.participant.creator.fullName ?? 'Creator',
          method, grossPaisa: paisa, deductionsPaisa: 0, netPaisa: paisa, status,
          events: { create: { fromStatus: null, toStatus: status, actorId, actorType: 'USER', note: 'Results published' } },
        },
      });
      created.push({ payoutId: p.id, userId: a.participant.creator.userId, prizeTitle: a.prize.title, amountNpr: npr(paisa) });
    }
    if (created.length) {
      await audit(tx, { actorId, actorType: 'USER', action: AuditAction.COMPETITION_PAYOUTS_CREATED, competitionId, newValue: { method, payouts: created.map((x) => x.payoutId) } });
    }
    return { method, created };
  }

  /** Results reopened → untouched payouts are cancelled; anything with money in motion blocks the reopen. */
  async cancelPayoutsForReopen(tx: Tx, competitionId: string, actorId: string, reason: string) {
    const rows = await tx.competitionPayout.findMany({ where: { competitionId, status: { not: 'CANCELLED' } } });
    if (rows.some((p) => !R.PAYOUT_UNTOUCHED.includes(p.status as R.PayoutStatus))) throw fail(MSG.paymentsInProgress, HttpStatus.CONFLICT, 'PAYMENTS_IN_PROGRESS');
    const now = new Date();
    for (const p of rows) {
      await tx.competitionPayout.update({ where: { id: p.id }, data: { status: 'CANCELLED', awardId: null, cancelledAt: now, cancelReason: `Results reopened: ${reason}` } });
      await tx.competitionPayoutEvent.create({ data: { payoutId: p.id, fromStatus: p.status, toStatus: 'CANCELLED', actorId, actorType: 'USER', note: `Results reopened: ${reason}` } });
    }
    if (rows.length) await audit(tx, { actorId, actorType: 'USER', action: AuditAction.COMPETITION_PAYOUTS_CANCELLED, competitionId, metadata: { reason, payouts: rows.map((p) => p.id) } });
  }

  /** Competition cancelled → any Kolab-held prize money must go back to the business. */
  async onCancelled(tx: Tx, competitionId: string, actorId: string) {
    const c = await tx.competition.findUniqueOrThrow({ where: { id: competitionId } });
    await tx.competitionFunding.updateMany({ where: { competitionId, kind: 'CHARGE', status: { in: ['INITIATED', 'PENDING'] } }, data: { status: 'CANCELLED', failureReason: 'Competition cancelled' } });
    if (c.fundedAmountPaisa > 0) {
      await tx.competition.update({ where: { id: competitionId }, data: { fundingStatus: 'REFUND_PENDING' } });
      await audit(tx, { actorId, actorType: 'USER', action: AuditAction.COMPETITION_FUNDING_REFUND, competitionId, newValue: { fundingStatus: 'REFUND_PENDING' }, metadata: { heldPaisa: c.fundedAmountPaisa } });
      return { refundDue: npr(c.fundedAmountPaisa), title: c.title };
    }
    if (c.fundingStatus === 'PENDING') await tx.competition.update({ where: { id: competitionId }, data: { fundingStatus: 'UNFUNDED' } });
    return null;
  }

  // ── Payout transitions ────────────────────────────────────────────────────

  private async move(
    payout: { id: string; competitionId: string; status: string; method: string },
    action: R.PayoutAction,
    actor: { id: string; type: R.PayoutActor },
    data: Prisma.CompetitionPayoutUncheckedUpdateManyInput,
    note?: string | null,
    guard?: (tx: Tx) => Promise<void>,
  ) {
    const to = R.payoutTransition(action, payout.method as R.PrizePaymentMethod, payout.status as R.PayoutStatus, actor.type);
    if (!to) throw fail(MSG.invalidAction, HttpStatus.CONFLICT, 'INVALID_PAYOUT_TRANSITION');
    return prisma.$transaction(async (tx) => {
      await lockCompetition(tx, payout.competitionId);
      if (guard) await guard(tx);
      const res = await tx.competitionPayout.updateMany({ where: { id: payout.id, status: payout.status as R.PayoutStatus }, data: { ...data, status: to } });
      if (res.count !== 1) throw fail(MSG.changedMeanwhile, HttpStatus.CONFLICT);
      await tx.competitionPayoutEvent.create({ data: { payoutId: payout.id, fromStatus: payout.status as R.PayoutStatus, toStatus: to, actorId: actor.id, actorType: actor.type, note: note ?? null, metadata: { action } } });
      await audit(tx, {
        actorId: actor.id, actorType: actor.type === 'ADMIN' ? 'ADMIN' : actor.type === 'SYSTEM' ? 'SYSTEM' : 'USER',
        action: AuditAction.COMPETITION_PAYOUT_UPDATED, competitionId: payout.competitionId,
        oldValue: { status: payout.status }, newValue: { status: to }, metadata: { payoutId: payout.id, action, note },
      });
      return tx.competitionPayout.findUniqueOrThrow({ where: { id: payout.id }, include: { competition: { select: { id: true, title: true, business: { select: { userId: true } } } } } });
    });
  }

  private async creatorUserId(creatorId: string) {
    return (await prisma.creatorProfile.findUniqueOrThrow({ where: { id: creatorId }, select: { userId: true } })).userId;
  }

  /** Organizer records a direct payment it made (with optional proof image). */
  async reportDirectPayment(userId: string, id: string, payoutId: string, input: ReportDirectPaymentInput, evidence?: Buffer) {
    const c = await this.owned(userId, id);
    const p = await prisma.competitionPayout.findFirst({ where: { id: payoutId, competitionId: c.id } });
    if (!p) throw fail(MSG.payoutNotFound, HttpStatus.NOT_FOUND);
    if (p.method !== 'DIRECT') throw fail(MSG.notDirect, HttpStatus.CONFLICT);
    if (!R.payoutTransition('report_payment', 'DIRECT', p.status as R.PayoutStatus, 'BUSINESS')) throw fail(MSG.invalidAction, HttpStatus.CONFLICT);
    const amountPaisa = R.toPaisa(input.amount);
    if (amountPaisa == null || amountPaisa <= 0) throw fail('Enter the amount you paid', HttpStatus.BAD_REQUEST);
    if (amountPaisa > p.netPaisa) throw fail(MSG.overpay, HttpStatus.BAD_REQUEST);
    if (input.paidOn.getTime() > Date.now() + 60_000) throw fail(MSG.futureDate, HttpStatus.BAD_REQUEST);
    const reference = input.reference?.trim() || null;
    if (!reference && !evidence && !p.evidenceUrl) throw fail(MSG.evidenceRequired, HttpStatus.BAD_REQUEST);

    const evidenceUrl = evidence
      ? await uploadImage(evidence, 'competitions/payment-proofs', `prize_${p.id}_${Date.now()}`, [{ width: 1600, height: 1600, crop: 'limit' }])
      : p.evidenceUrl;
    const now = new Date();
    const updated = await this.move(p, 'report_payment', { id: userId, type: 'BUSINESS' }, {
      reportedAmountPaisa: amountPaisa, reportedPaidOn: input.paidOn, reportedMethod: input.method,
      reportedReference: reference, evidenceUrl, reportedAt: now, disputedAt: null, disputeReason: null,
    }, input.note ?? null);
    void N.paymentReported(await this.creatorUserId(p.creatorId), updated.competition, p.id, npr(amountPaisa), now).catch(() => {});
    return payoutDto(updated, 'ORGANIZER');
  }

  /** Winner confirms the prize arrived. */
  async confirmReceipt(userId: string, id: string, payoutId: string) {
    const p = await this.participantPayout(userId, id, payoutId);
    const updated = await this.move(p, 'confirm_receipt', { id: userId, type: 'CREATOR' }, { confirmedAt: new Date() });
    void N.paymentConfirmed(updated.competition.business.userId, updated.competition, p.id, p.creatorName).catch(() => {});
    return payoutDto(updated, 'CREATOR');
  }

  /** Winner reports a problem — the organizer and Kolab admins are told. */
  async dispute(userId: string, id: string, payoutId: string, reason: string) {
    const p = await this.participantPayout(userId, id, payoutId);
    const now = new Date();
    const updated = await this.move(p, 'dispute', { id: userId, type: 'CREATOR' }, { disputedAt: now, disputeReason: reason }, reason);
    void N.paymentDisputed(updated.competition.business.userId, updated.competition, p.id, p.creatorName, reason, now).catch(() => {});
    return payoutDto(updated, 'CREATOR');
  }

  // ── Kolab admin ───────────────────────────────────────────────────────────

  private assertPaymentAdmin(email?: string | null) {
    if (!isCompetitionPaymentAdmin(email)) throw fail(MSG.notPaymentAdmin, HttpStatus.FORBIDDEN, 'NOT_PAYMENT_ADMIN');
  }

  async adminList(q: PaymentsAdminListQuery) {
    const where: Prisma.CompetitionWhereInput = {
      prizePaymentMethod: q.method ? q.method : { not: null },
      ...(q.q ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { business: { businessName: { contains: q.q, mode: 'insensitive' } } }] } : {}),
      ...(q.attention === 'true' ? {
        OR: [
          { fundingStatus: { in: ['REFUND_PENDING', 'PENDING'] } },
          { payouts: { some: { status: { in: ['NOT_READY', 'APPROVED', 'PROCESSING', 'FAILED', 'DISPUTED'] } } } },
          { fundings: { some: { isDuplicate: true } } },
        ],
      } : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.competition.count({ where }),
      prisma.competition.findMany({
        where, orderBy: { updatedAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit,
        include: {
          business: { select: { id: true, businessName: true } },
          payouts: { select: { method: true, status: true, netPaisa: true, reportedAmountPaisa: true } },
          fundings: { select: { kind: true, status: true, amountPaisa: true } },
        },
      }),
    ]);
    return {
      items: rows.map((c) => ({
        id: c.id, title: c.title, status: c.status, organizer: c.business,
        ...paymentConfigView(c),
        totals: totals(c, c.payouts, c.fundings),
      })),
      pagination: { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) },
    };
  }

  async adminDetail(id: string, adminEmail?: string) {
    const c = await prisma.competition.findUnique({ where: { id }, include: { business: { select: { id: true, businessName: true } } } });
    if (!c) throw fail(MSG.notFound, HttpStatus.NOT_FOUND);
    const [fundings, payouts] = await Promise.all([
      prisma.competitionFunding.findMany({ where: { competitionId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.competitionPayout.findMany({ where: { competitionId: id }, orderBy: { createdAt: 'asc' }, include: { events: { orderBy: { createdAt: 'asc' } } } }),
    ]);
    const accounts = new Map<string, unknown>();
    for (const p of payouts) if (!accounts.has(p.creatorId)) accounts.set(p.creatorId, await this.winnerAccount(p.creatorId));
    return {
      id: c.id, title: c.title, status: c.status, organizer: c.business,
      config: paymentConfigView(c),
      kolabPaymentsEnabled: kolabPaymentsEnabled(),
      fundings: fundings.map(fundingDto),
      payouts: payouts.map((p) => ({ ...payoutDto(p, 'ADMIN'), winnerPayoutAccount: accounts.get(p.creatorId) ?? null })),
      totals: totals(c, payouts, fundings),
      refundable: npr(await this.refundablePaisa(prisma, c)),
      viewerIsPaymentAdmin: isCompetitionPaymentAdmin(adminEmail),
    };
  }

  async adminCheckFunding(adminEmail: string | undefined, id: string, fundingId: string) {
    this.assertPaymentAdmin(adminEmail);
    const f = await prisma.competitionFunding.findFirst({ where: { id: fundingId, competitionId: id } });
    if (!f) throw fail(MSG.fundingMismatch, HttpStatus.NOT_FOUND);
    await this.reconcileFunding(fundingId);
    return this.adminDetail(id, adminEmail);
  }

  async adminPayoutAction(adminId: string, adminEmail: string | undefined, id: string, payoutId: string, input: AdminPayoutActionInput) {
    this.assertPaymentAdmin(adminEmail);
    const p = await prisma.competitionPayout.findFirst({ where: { id: payoutId, competitionId: id } });
    if (!p) throw fail(MSG.payoutNotFound, HttpStatus.NOT_FOUND);
    const note = input.note?.trim() || null;
    const needReason = () => { if (!note || note.length < 5) throw fail(MSG.reasonRequired, HttpStatus.BAD_REQUEST); };
    const now = new Date();
    const admin = { id: adminId, type: 'ADMIN' as const };
    let data: Prisma.CompetitionPayoutUncheckedUpdateManyInput = {};
    let guard: ((tx: Tx) => Promise<void>) | undefined;

    switch (input.action) {
      case 'approve':
        data = { approvedById: adminId, approvedAt: now };
        break;
      case 'start_processing': {
        const dest = await this.winnerAccount(p.creatorId);
        if (!dest) throw fail(MSG.noPayoutAccount, HttpStatus.CONFLICT, 'NO_PAYOUT_ACCOUNT');
        data = { processingAt: now, payoutChannel: dest.type, payoutDestination: dest as Prisma.InputJsonValue, failureReason: null };
        break;
      }
      case 'mark_paid': {
        const ref = input.reference?.trim();
        if (!ref) throw fail(MSG.referenceRequired, HttpStatus.BAD_REQUEST);
        data = { providerRef: ref, completedAt: now, adminNote: note ?? undefined };
        // Never pay out more than Kolab actually holds for this competition.
        guard = async (tx) => {
          const paid = await tx.competitionPayout.aggregate({ where: { competitionId: id, method: 'KOLAB', status: 'PAID' }, _sum: { netPaisa: true } });
          const refunded = await tx.competitionFunding.aggregate({ where: { competitionId: id, kind: 'REFUND', status: 'SUCCEEDED' }, _sum: { amountPaisa: true } });
          const received = await tx.competitionFunding.aggregate({ where: { competitionId: id, kind: 'CHARGE', status: 'SUCCEEDED' }, _sum: { amountPaisa: true } });
          if ((paid._sum.netPaisa ?? 0) + p.netPaisa > (received._sum.amountPaisa ?? 0) - (refunded._sum.amountPaisa ?? 0)) throw fail(MSG.overFunded, HttpStatus.CONFLICT);
        };
        break;
      }
      case 'mark_failed':
        needReason();
        data = { failureReason: note };
        break;
      case 'retry':
        data = { failureReason: null, approvedById: adminId, approvedAt: now };
        break;
      case 'admin_verify':
        needReason();
        if (p.method === 'DIRECT' && !p.reportedAt) throw fail(MSG.noEvidenceToVerify, HttpStatus.CONFLICT);
        data = { adminVerifiedById: adminId, adminVerifiedAt: now, adminNote: note };
        break;
      case 'resolve_unpaid':
        needReason();
        data = { adminNote: note };
        break;
      case 'cancel':
        needReason();
        data = { cancelledAt: now, cancelReason: note, awardId: null };
        break;
    }

    const updated = await this.move(p, input.action, admin, data, note, guard);
    const winner = await this.creatorUserId(p.creatorId);
    const c = updated.competition;
    if (p.method === 'KOLAB' && ['approve', 'start_processing', 'mark_paid', 'mark_failed', 'retry'].includes(input.action)) {
      const status = updated.status as 'APPROVED' | 'PROCESSING' | 'PAID' | 'FAILED';
      void N.payoutUpdate(winner, c, p.id, status, npr(p.netPaisa), now).catch(() => {});
    }
    if (['admin_verify', 'resolve_unpaid', 'cancel'].includes(input.action)) {
      const outcome = input.action === 'admin_verify' ? 'VERIFIED' : input.action === 'resolve_unpaid' ? 'UNPAID' : 'CANCELLED';
      void N.disputeResolved([winner, c.business.userId], c, p.id, outcome, now).catch(() => {});
    }
    return this.adminDetail(id, adminEmail);
  }

  /** Money Kolab still holds that isn't owed to a winner. */
  private async refundablePaisa(db: Tx | typeof prisma, c: { id: string; status: string; fundedAmountPaisa: number; cashPrizePoolPaisa: number | null }) {
    if (c.fundedAmountPaisa <= 0) return 0;
    if (c.status === 'CANCELLED') {
      const paid = await db.competitionPayout.aggregate({ where: { competitionId: c.id, method: 'KOLAB', status: 'PAID' }, _sum: { netPaisa: true } });
      return Math.max(0, c.fundedAmountPaisa - (paid._sum.netPaisa ?? 0));
    }
    if (c.status === 'COMPLETED') {
      const owed = await db.competitionPayout.aggregate({ where: { competitionId: c.id, method: 'KOLAB', status: { not: 'CANCELLED' } }, _sum: { netPaisa: true } });
      return Math.max(0, c.fundedAmountPaisa - (owed._sum.netPaisa ?? 0));
    }
    // Still running: only an over-payment beyond the pool can go back.
    return Math.max(0, c.fundedAmountPaisa - (c.cashPrizePoolPaisa ?? 0));
  }

  /**
   * Records a refund to the business that a payment admin has made through the
   * provider / bank (no automated refund API is integrated). A new REFUND row;
   * nothing is deleted or edited.
   */
  async adminRecordRefund(adminId: string, adminEmail: string | undefined, id: string, input: AdminRefundInput) {
    this.assertPaymentAdmin(adminEmail);
    const amountPaisa = R.toPaisa(input.amount);
    if (!amountPaisa || amountPaisa <= 0) throw fail('Enter the refunded amount', HttpStatus.BAD_REQUEST);
    const c0 = await prisma.competition.findUnique({ where: { id }, include: { business: { select: { userId: true } } } });
    if (!c0) throw fail(MSG.notFound, HttpStatus.NOT_FOUND);
    await prisma.$transaction(async (tx) => {
      await lockCompetition(tx, id);
      const c = await tx.competition.findUniqueOrThrow({ where: { id } });
      const refundable = await this.refundablePaisa(tx, c);
      if (refundable <= 0) throw fail(MSG.refundNotAllowed, HttpStatus.CONFLICT);
      if (amountPaisa > refundable) throw fail(MSG.refundTooLarge, HttpStatus.BAD_REQUEST);
      const funded = c.fundedAmountPaisa - amountPaisa;
      await tx.competitionFunding.create({
        data: {
          competitionId: id, kind: 'REFUND', amountPaisa, provider: 'manual', providerRef: `${id}:${input.reference.trim()}`,
          providerTxnId: input.reference.trim(), status: 'SUCCEEDED', idempotencyKey: `${id}:refund:${randomUUID()}`,
          initiatedById: adminId, confirmedAt: new Date(), failureReason: input.note ?? null,
        },
      });
      const fundingStatus: R.FundingStatus = c.status === 'CANCELLED'
        ? (funded <= 0 ? 'REFUNDED' : 'REFUND_PENDING')
        : c.fundingStatus;
      await tx.competition.update({ where: { id }, data: { fundedAmountPaisa: funded, fundingStatus } });
      await audit(tx, { actorId: adminId, actorType: 'ADMIN', action: AuditAction.COMPETITION_FUNDING_REFUND, competitionId: id, oldValue: { fundedAmountPaisa: c.fundedAmountPaisa, fundingStatus: c.fundingStatus }, newValue: { fundedAmountPaisa: funded, fundingStatus }, metadata: { amountPaisa, reference: input.reference, note: input.note } });
    }).catch((err) => {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw fail('This refund reference was already recorded.', HttpStatus.CONFLICT);
      throw err;
    });
    return this.adminDetail(id, adminEmail);
  }

  // ── Sweep ─────────────────────────────────────────────────────────────────

  /** Re-checks stale pending funding attempts with their gateway; expires abandoned ones. */
  async reconcileSweep(now = new Date()) {
    const stale = new Date(now.getTime() - 10 * 60_000);
    const rows = await prisma.competitionFunding.findMany({
      where: { kind: 'CHARGE', status: { in: ['INITIATED', 'PENDING'] }, initiatedAt: { lte: stale }, OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lte: stale } }] },
      take: 50, orderBy: { initiatedAt: 'asc' },
    });
    let checked = 0;
    for (const f of rows) {
      try {
        const r = await this.reconcileFunding(f.id);
        checked++;
        if (r.outcome === 'PENDING' && now.getTime() - f.initiatedAt.getTime() > 24 * 3_600_000) {
          await this.applyOutcome(f.id, 'CANCELLED', { reason: 'Expired — not completed within 24 hours' });
        }
      } catch (err) {
        logger.warn({ err, fundingId: f.id }, 'competition funding reconcile failed');
        await prisma.competitionFunding.update({ where: { id: f.id }, data: { lastCheckedAt: now } }).catch(() => {});
      }
    }
    return { checked };
  }
}

export const competitionPaymentService = new CompetitionPaymentService();
