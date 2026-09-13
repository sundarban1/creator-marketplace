import { Prisma } from '@prisma/client';
import prisma from '../../prisma';

// Single well-defined way to append to the creator Kolab Points ledger
// (CreatorPointsLedger) and keep CreatorPointsAccount's cached balance in
// lockstep. Append-only by design — there is deliberately no update/delete
// helper here, matching wallet.ledger.ts. Realized balance is always Σ
// COMPLETED ledger rows signed by `direction`; the account row exists purely
// so mobile screens don't need a live groupBy on every render and must never
// be trusted over a reconciliation recompute against the ledger.

type LedgerClient = Prisma.TransactionClient | typeof prisma;

export interface RecordPointsTransactionInput {
  creatorId: string;
  type: Prisma.CreatorPointsLedgerCreateInput['type'];
  direction: Prisma.CreatorPointsLedgerCreateInput['direction'];
  /** Always positive whole points — the sign is carried by `direction`. */
  amount: number;
  description: string;
  referenceType?: string;
  referenceId?: string;
  createdByAdminId?: string;
}

/**
 * Write a ledger row and update the cached account balance together. Pass a
 * transaction client (`tx`) when this must be part of a larger atomic
 * operation (e.g. a redemption confirm) — a duplicate (referenceId, type)
 * then throws P2002 and rolls the whole transaction back, which is the
 * idempotency backstop. Callers that need to guard against insufficient
 * balance (e.g. a DEBIT) must lock and check CreatorPointsAccount themselves
 * before calling this — it only records, it never validates.
 */
export async function recordPointsTransaction(client: LedgerClient, input: RecordPointsTransactionInput) {
  const row = await client.creatorPointsLedger.create({
    data: {
      creatorId:        input.creatorId,
      type:              input.type,
      direction:         input.direction,
      amount:            input.amount,
      description:       input.description,
      referenceType:     input.referenceType,
      referenceId:       input.referenceId,
      createdByAdminId:  input.createdByAdminId,
    },
  });

  const delta = input.direction === 'CREDIT' ? input.amount : -input.amount;
  await client.creatorPointsAccount.upsert({
    where:  { creatorId: input.creatorId },
    create: {
      creatorId:      input.creatorId,
      balance:        delta,
      lifetimeEarned: input.direction === 'CREDIT' ? input.amount : 0,
      lifetimeSpent:  input.direction === 'DEBIT' ? input.amount : 0,
    },
    update: {
      balance:        { increment: delta },
      ...(input.direction === 'CREDIT'
        ? { lifetimeEarned: { increment: input.amount } }
        : { lifetimeSpent: { increment: input.amount } }),
    },
  });

  return row;
}

/**
 * Fire-and-safe variant for call sites that are NOT already inside a
 * transaction (e.g. escrow.service.ts's campaign-completion trigger). Wraps
 * the ledger write + account update in its own transaction so the two never
 * drift apart, and silently skips a row that already exists for this
 * (referenceId, type) so the caller can be re-run.
 */
export async function recordPointsTransactionIdempotent(input: RecordPointsTransactionInput) {
  try {
    return await prisma.$transaction((tx) => recordPointsTransaction(tx, input));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return null;
    throw err;
  }
}
