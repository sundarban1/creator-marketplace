import type { Promotion } from '@prisma/client';

type PromotionWithBusiness = Promotion & {
  business: { id: string; businessName: string | null; logoUrl: string | null; location: string | null };
};

export function toPromotionDto(row: PromotionWithBusiness) {
  return {
    id:                   row.id,
    businessId:           row.businessId,
    businessName:         row.business.businessName,
    businessLogoUrl:      row.business.logoUrl,
    businessLocation:     row.business.location,
    title:                row.title,
    description:          row.description,
    imageUrl:             row.imageUrl,
    discountType:         row.discountType,
    discountValue:        row.discountValue,
    minSpend:             row.minSpend,
    maxDiscountCap:       row.maxDiscountCap,
    dailyRedemptionLimit: row.dailyRedemptionLimit,
    totalRedemptionLimit: row.totalRedemptionLimit,
    validFrom:            row.validFrom,
    validUntil:           row.validUntil,
    status:               row.status,
    createdAt:            row.createdAt,
    updatedAt:            row.updatedAt,
  };
}

/** Adds business-management-only figures — never sent to a creator. */
export function toPromotionManageDto(row: PromotionWithBusiness, stats: { redemptions: number; creditsEarned: number }) {
  return { ...toPromotionDto(row), ...stats };
}
