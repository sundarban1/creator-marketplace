import type { CreatorPointsLedger } from '@prisma/client';

export function toPointsLedgerDto(row: CreatorPointsLedger) {
  return {
    id:          row.id,
    type:        row.type,
    direction:   row.direction,
    amount:      row.amount,
    description: row.description,
    createdAt:   row.createdAt,
  };
}
