import { z } from 'zod';

export const applyBusinessReferralCodeSchema = z.object({
  code: z.string().min(4).max(20),
});

export type ApplyBusinessReferralCodeInput = z.infer<typeof applyBusinessReferralCodeSchema>;
