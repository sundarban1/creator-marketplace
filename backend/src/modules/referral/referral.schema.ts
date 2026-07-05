import { z } from 'zod';

export const applyReferralCodeSchema = z.object({
  code: z.string().min(4).max(20),
});

export type ApplyReferralCodeInput = z.infer<typeof applyReferralCodeSchema>;
