import { z } from 'zod';

export const createReportSchema = z.object({
  targetType:  z.enum(['USER', 'BUSINESS', 'SERVICE', 'OPPORTUNITY', 'POST', 'MESSAGE', 'REVIEW']),
  targetId:    z.string().min(1, 'Target is required'),
  reason:      z.enum(['SPAM', 'SCAM', 'FRAUD', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'FAKE_PROFILE', 'PAYMENT_ISSUE', 'OTHER']),
  description: z.string().trim().max(1000).optional(),
});

export const updateReportStatusSchema = z.object({
  status:     z.enum(['UNDER_REVIEW', 'ACTION_TAKEN', 'DISMISSED']),
  actionNote: z.string().trim().max(1000).optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateReportStatusInput = z.infer<typeof updateReportStatusSchema>;
