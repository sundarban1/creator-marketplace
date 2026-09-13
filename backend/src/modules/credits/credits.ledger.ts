import { Prisma } from '@prisma/client';
import prisma from '../../prisma';

// Business-side mirror of points.ledger.ts — see that file for the full
// rationale. Writes BusinessCreditsLedger and keeps BusinessCreditsAccount's
// cached balance in lockstep in the same call.

type LedgerClient = Prisma.TransactionClient | typeof prisma;

export interface RecordCreditsTransactionInput {
  businessId: string;
  type: Prisma.BusinessCreditsLedgerCreateInput['type'];
  direction: Prisma.BusinessCreditsLedgerCreateInput['direction'];
  /** Always positive whole credits — the sign is carried by `direction`. */
  amount: number;
  description: string;
  referenceType?: string;
  referenceId?: string;
  createdByAdminId?: string;
}

export async function recordCreditsTransaction(client: LedgerClient, input: RecordCreditsTransactionInput) {
  const row = await client.businessCreditsLedger.create({
    data: {
      businessId:       input.businessId,
      type:             input.type,
      direction:        input.direction,
      amount:           input.amount,
      description:      input.description,
      referenceType:    input.referenceType,
      referenceId:      input.referenceId,
      createdByAdminId: input.createdByAdminId,
    },
  });

  const delta = input.direction === 'CREDIT' ? input.amount : -input.amount;
  await client.businessCreditsAccount.upsert({
    where:  { businessId: input.businessId },
    create: {
      businessId:     input.businessId,
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

/** Fire-and-safe variant for call sites outside an existing transaction. */
export async function recordCreditsTransactionIdempotent(input: RecordCreditsTransactionInput) {
  try {
    return await prisma.$transaction((tx) => recordCreditsTransaction(tx, input));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return null;
    throw err;
  }
}
