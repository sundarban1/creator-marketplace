import type { WalletTransaction } from '@prisma/client';

/** `businessName` is only set for a PROMO_REDEMPTION_DEBIT row — the business the points were spent at. */
export function toPointsLedgerDto(row: WalletTransaction, businessName: string | null = null) {
  return {
    id:          row.id,
    type:        row.type,
    direction:   row.direction,
    amount:      row.amount,
    description: row.description,
    businessName,
    createdAt:   row.createdAt,
  };
}
