import { z } from 'zod';

const VALID_PAYMENT_METHODS = ['esewa', 'khalti', 'fonepay'] as const;

export const withdrawSchema = z.object({
  amount: z.number().positive('Amount must be greater than zero'),
  method: z.enum(VALID_PAYMENT_METHODS, { errorMap: () => ({ message: 'Invalid payment method' }) }),
});

export type WithdrawInput = z.infer<typeof withdrawSchema>;
