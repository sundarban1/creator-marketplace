import { z } from 'zod';

// Server-side validation only — the client's numbers are never trusted for the
// actual discount/points/credits math, which is recomputed at redemption time
// (see redemption.service.ts). This just keeps a business from publishing a
// nonsensical promotion.
const discountType = z.enum(['PERCENTAGE', 'FIXED']);

function withCrossFieldChecks<
  T extends { validFrom?: Date; validUntil?: Date; discountType?: z.infer<typeof discountType>; discountValue?: number },
>(schema: z.ZodType<T>) {
  return schema
    .refine(
      (data) => !data.validFrom || !data.validUntil || data.validUntil > data.validFrom,
      { message: '"Valid until" must be after "Valid from"', path: ['validUntil'] },
    )
    .refine(
      (data) =>
        data.discountType !== 'PERCENTAGE' ||
        data.discountValue == null ||
        (data.discountValue > 0 && data.discountValue <= 100),
      { message: 'A percentage discount must be between 1 and 100', path: ['discountValue'] },
    );
}

export const createPromotionSchema = withCrossFieldChecks(
  z.object({
    title:                z.string().trim().min(3, 'Title must be at least 3 characters').max(100),
    description:          z.string().trim().max(500).optional(),
    imageUrl:             z.string().url().optional(),
    discountType,
    discountValue:        z.number().positive('Discount value must be greater than zero'),
    minSpend:             z.number().min(0).default(0),
    maxDiscountCap:       z.number().positive().optional(),
    dailyRedemptionLimit: z.number().int().positive().optional(),
    totalRedemptionLimit: z.number().int().positive().optional(),
    validFrom:            z.coerce.date(),
    validUntil:           z.coerce.date(),
  }),
);

export const updatePromotionSchema = withCrossFieldChecks(
  z.object({
    title:                z.string().trim().min(3, 'Title must be at least 3 characters').max(100).optional(),
    description:          z.string().trim().max(500).optional(),
    imageUrl:             z.string().url().optional(),
    discountType:         discountType.optional(),
    discountValue:        z.number().positive('Discount value must be greater than zero').optional(),
    minSpend:             z.number().min(0).optional(),
    maxDiscountCap:       z.number().positive().optional(),
    dailyRedemptionLimit: z.number().int().positive().optional(),
    totalRedemptionLimit: z.number().int().positive().optional(),
    validFrom:            z.coerce.date().optional(),
    validUntil:           z.coerce.date().optional(),
  }),
);

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;
