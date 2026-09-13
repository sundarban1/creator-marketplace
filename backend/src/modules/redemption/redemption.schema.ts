import { z } from 'zod';

export const issueRedemptionSchema = z.object({
  promotionId: z.string().min(1, 'promotionId is required'),
});

export const enterBillSchema = z.object({
  billAmount: z.number().positive('Bill amount must be greater than zero'),
});

export const cancelRedemptionSchema = z.object({
  reason: z.string().trim().max(200).optional(),
});

export type IssueRedemptionInput = z.infer<typeof issueRedemptionSchema>;
export type EnterBillInput = z.infer<typeof enterBillSchema>;
export type CancelRedemptionInput = z.infer<typeof cancelRedemptionSchema>;
