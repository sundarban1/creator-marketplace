import { z } from 'zod';

// Validated dynamically against the admin-managed PaymentMethod catalog (and
// against the creator's own saved methods) in WalletService.withdraw — see
// creator.schema.ts's updatePaymentMethodsSchema for the same pattern.
export const withdrawSchema = z.object({
  amount: z.number().positive('Amount must be greater than zero'),
  method: z.string().min(1, 'Payment method is required'),
});

export type WithdrawInput = z.infer<typeof withdrawSchema>;
