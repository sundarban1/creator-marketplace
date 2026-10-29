import { Prisma, CampaignEventActor } from '@prisma/client';
import { randomInt } from 'crypto';

// ───────────────────────────────────────────────────────────────────────────────
// Refund requests — the shared primitives used by the escrow flow (which
// creates them) and the admin refund module (which moves them to COMPLETED).
//
// Money model: payment_transactions stays the financial source of truth. A
// refund request is an obligation, not a movement — the REFUND /
// PARTIAL_REFUND ledger row is written only when an admin records a verified
// transfer (see refund.admin.service.ts). Amounts are Decimal(12,2).
// ───────────────────────────────────────────────────────────────────────────────

export const REFUND_REASON = {
  DEADLINE_MISSED:            'DEADLINE_MISSED',
  EXTENSION_REJECTED:         'EXTENSION_REJECTED',
  EXTENSION_EXPIRED:          'EXTENSION_EXPIRED',
  BUSINESS_CANCELLED_OVERDUE: 'BUSINESS_CANCELLED_OVERDUE',
  CONFIRMATION_TIMEOUT:       'CONFIRMATION_TIMEOUT',
  DISPUTE_BUSINESS_WON:       'DISPUTE_BUSINESS_WON',
  DISPUTE_SPLIT:              'DISPUTE_SPLIT',
  LATE_PAYMENT:               'LATE_PAYMENT',
  OTHER:                      'OTHER',
} as const;
export type RefundReasonCode = (typeof REFUND_REASON)[keyof typeof REFUND_REASON];

// Kolab's published policy: the creator fee held in escrow is refundable in
// full; the platform service fee and VAT charged on top of it are not, and are
// never held in escrow, so they're not part of the refundable amount.
export const REFUND_POLICY_NOTE =
  'The escrowed creator fee is refunded in full. The platform service fee and VAT charged at checkout are non-refundable under Kolab’s refund policy and are not included.';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newRefundReference(): string {
  let out = 'RF-';
  for (let i = 0; i < 8; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export function refundIdempotencyKey(applicationId: string, partial: boolean): string {
  return partial ? `refund:${applicationId}:partial` : `refund:${applicationId}`;
}

/** Rupees → Decimal with 2 places, never via float arithmetic past this point. */
export function money(n: number | string | Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(n).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/**
 * What can still be refunded on an engagement: escrowed in, minus what was
 * paid out to the creator, minus refunds already completed. Read inside the
 * caller's transaction (after its row lock) so it can't race another refund.
 */
export async function remainingRefundableInTx(tx: Prisma.TransactionClient, applicationId: string): Promise<Prisma.Decimal> {
  const rows = await tx.paymentTransaction.groupBy({
    by: ['type'],
    where: { applicationId },
    _sum: { amount: true },
  });
  const sum = (t: string) => money(rows.find((r) => r.type === t)?._sum.amount ?? 0);
  const remaining = sum('ESCROW_IN').minus(sum('PAYOUT')).minus(sum('REFUND')).minus(sum('PARTIAL_REFUND'));
  return remaining.isNegative() ? money(0) : remaining;
}

export async function recordRefundEventTx(
  tx: Prisma.TransactionClient,
  input: {
    refundRequestId: string;
    action: string;
    fromStatus?: string | null;
    toStatus: string;
    actorId?: string | null;
    actorType: CampaignEventActor;
    note?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await tx.refundRequestEvent.create({
    data: {
      refundRequestId: input.refundRequestId,
      action:          input.action,
      fromStatus:      input.fromStatus ?? null,
      toStatus:        input.toStatus,
      actorId:         input.actorId ?? null,
      actorType:       input.actorType,
      note:            input.note ?? null,
      metadata:        (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export interface CreateRefundRequestInput {
  applicationId: string;
  campaignId: string;
  businessId: string;
  creatorId?: string | null;
  paymentMethod?: string | null;
  amount: number;
  partial: boolean;
  reasonCode: RefundReasonCode;
  reason: string;
  escrowStatusBefore: string;
  actorType: CampaignEventActor;
  actorId?: string | null;
}

/**
 * Idempotently open a refund request for an engagement. Must run inside the
 * transaction that holds the application's row lock. Returns `created: false`
 * (and the existing row) when a request for the same obligation already
 * exists — a re-run job or double click never opens a second one.
 */
export async function createRefundRequestInTx(
  tx: Prisma.TransactionClient,
  input: CreateRefundRequestInput,
): Promise<{ created: boolean; id: string; referenceCode: string }> {
  const idempotencyKey = refundIdempotencyKey(input.applicationId, input.partial);
  const existing = await tx.refundRequest.findUnique({
    where: { idempotencyKey },
    select: { id: true, referenceCode: true, status: true },
  });
  if (existing) {
    // A request voided because the deliverable was reopened (admin exceptional
    // extension) comes back to life if that reopened deliverable fails again —
    // still one request per obligation, never a second row.
    if (existing.status === 'CANCELLED') {
      await tx.refundRequest.update({
        where: { id: existing.id },
        data: {
          status: 'PENDING', reasonCode: input.reasonCode, reason: input.reason,
          refundableAmount: money(input.amount), escrowStatusBefore: input.escrowStatusBefore,
        },
      });
      await recordRefundEventTx(tx, {
        refundRequestId: existing.id, action: 'reopened', fromStatus: 'CANCELLED', toStatus: 'PENDING',
        actorId: input.actorId, actorType: input.actorType, note: input.reason,
        metadata: { reasonCode: input.reasonCode },
      });
      return { created: true, id: existing.id, referenceCode: existing.referenceCode };
    }
    return { created: false, id: existing.id, referenceCode: existing.referenceCode };
  }

  const escrowIn = await tx.paymentTransaction.findFirst({
    where: { applicationId: input.applicationId, type: 'ESCROW_IN' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, amount: true, reference: true, method: true },
  });
  const original = money(escrowIn?.amount ?? input.amount);
  const refundable = money(input.amount);

  let referenceCode = newRefundReference();
  for (let i = 0; i < 5 && (await tx.refundRequest.findUnique({ where: { referenceCode }, select: { id: true } })); i++) {
    referenceCode = newRefundReference();
  }

  const row = await tx.refundRequest.create({
    data: {
      referenceCode,
      idempotencyKey,
      applicationId:        input.applicationId,
      campaignId:           input.campaignId,
      businessId:           input.businessId,
      creatorId:            input.creatorId ?? null,
      paymentTransactionId: escrowIn?.id ?? null,
      paymentReference:     escrowIn?.reference ?? null,
      paymentMethod:        input.paymentMethod ?? escrowIn?.method ?? null,
      reasonCode:           input.reasonCode,
      reason:               input.reason,
      partial:              input.partial,
      originalAmount:       original,
      deductionAmount:      money(0),
      refundableAmount:     refundable,
      calculationNote:      input.partial
        ? `Business share of a split settlement: Rs. ${refundable.toFixed(2)} of Rs. ${original.toFixed(2)} escrowed. ${REFUND_POLICY_NOTE}`
        : REFUND_POLICY_NOTE,
      escrowStatusBefore:   input.escrowStatusBefore,
      initiatedByType:      input.actorType,
      initiatedById:        input.actorId ?? null,
    },
    select: { id: true, referenceCode: true },
  });
  await recordRefundEventTx(tx, {
    refundRequestId: row.id,
    action:          'created',
    toStatus:        'PENDING',
    actorId:         input.actorId,
    actorType:       input.actorType,
    note:            input.reason,
    metadata:        { reasonCode: input.reasonCode, amount: refundable.toFixed(2) },
  });
  return { created: true, ...row };
}
