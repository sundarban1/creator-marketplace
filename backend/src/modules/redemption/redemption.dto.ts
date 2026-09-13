import type { RedemptionSession } from '@prisma/client';

type FullSession = RedemptionSession & {
  promotion: { title: string };
  creator: { userId: string; fullName: string | null };
  business: { userId: string; businessName: string | null };
};

export function toRedemptionSessionDto(row: FullSession) {
  return {
    id:                row.id,
    promotionId:       row.promotionId,
    promotionTitle:    row.promotion.title,
    creatorName:       row.creator.fullName,
    businessName:      row.business.businessName,
    status:            row.status,
    promotionSnapshot: row.promotionSnapshot,
    billAmount:        row.billAmount,
    discountAmount:    row.discountAmount,
    pointsCost:        row.pointsCost,
    creditsEarned:     row.creditsEarned,
    issuedAt:          row.issuedAt,
    expiresAt:         row.expiresAt,
    scannedAt:         row.scannedAt,
    billEnteredAt:     row.billEnteredAt,
    confirmedAt:       row.confirmedAt,
    cancelledAt:       row.cancelledAt,
  };
}
