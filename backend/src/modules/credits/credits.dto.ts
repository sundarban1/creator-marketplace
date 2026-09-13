import type { BusinessCreditsLedger } from '@prisma/client';

export function toCreditsLedgerDto(row: BusinessCreditsLedger) {
  return {
    id:          row.id,
    type:        row.type,
    direction:   row.direction,
    amount:      row.amount,
    description: row.description,
    createdAt:   row.createdAt,
  };
}
