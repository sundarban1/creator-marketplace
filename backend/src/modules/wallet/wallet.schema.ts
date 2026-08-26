import { z } from 'zod';

// A manual withdrawal request. The amount is re-validated server-side in
// WalletService.createWithdrawalRequest against the configured minimum and the
// creator's live withdrawable balance — the client value is never trusted.
export const createWithdrawalSchema = z.object({
  amount:         z.number().positive('Amount must be greater than zero').finite(),
  payoutMethodId: z.string().min(1, 'Select a payout method'),
});

export type CreateWithdrawalInput = z.infer<typeof createWithdrawalSchema>;
