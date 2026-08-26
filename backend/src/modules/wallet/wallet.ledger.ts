import { Prisma } from '@prisma/client';
import prisma from '../../prisma';

// Single well-defined way to append to the creator wallet ledger
// (WalletTransaction). Append-only by design — there is deliberately no update
// or delete helper here, matching audit.service.ts. Realized wallet balance is
// Σ COMPLETED rows signed by `direction`.

type LedgerClient = Prisma.TransactionClient | typeof prisma;

export interface RecordWalletTransactionInput {
  creatorId: string;
  type: Prisma.WalletTransactionCreateInput['type'];
  direction: Prisma.WalletTransactionCreateInput['direction'];
  /** Always positive — the sign is carried by `direction`. */
  amount: number;
  description: string;
  referenceType?: string;
  referenceId?: string;
  createdByAdminId?: string;
}

/**
 * Write a ledger row. Pass a transaction client (`tx`) when the write must be
 * part of a larger atomic operation (e.g. mark-paid) — a duplicate then throws
 * P2002 and rolls the whole transaction back, which is the idempotency backstop.
 */
export function recordWalletTransaction(client: LedgerClient, input: RecordWalletTransactionInput) {
  return client.walletTransaction.create({
    data: {
      creatorId:        input.creatorId,
      type:             input.type,
      direction:        input.direction,
      amount:           input.amount,
      description:      input.description,
      referenceType:    input.referenceType,
      referenceId:      input.referenceId,
      createdByAdminId: input.createdByAdminId,
    },
  });
}

/**
 * Fire-and-safe variant for side-effect call sites that are NOT inside a
 * transaction (payment release, referral release). A row that already exists for
 * this (referenceId, type) is silently skipped so the caller can be re-run.
 */
export async function recordWalletTransactionIdempotent(input: RecordWalletTransactionInput) {
  try {
    return await recordWalletTransaction(prisma, input);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return null;
    throw err;
  }
}
