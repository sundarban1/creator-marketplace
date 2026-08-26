import { z } from 'zod';

// A creator's saved payout account. Fixed channel set — BANK / ESEWA / KHALTI —
// deliberately not tied to the admin PaymentMethod catalog (that governs the
// business→platform payin side only).

const bankSchema = z.object({
  type:          z.literal('BANK'),
  accountName:   z.string().trim().min(1, 'Account name is required').max(120),
  bankName:      z.string().trim().min(1, 'Bank name is required').max(120),
  accountNumber: z.string().trim().min(1, 'Account number is required').max(40),
  branch:        z.string().trim().max(120).optional(),
  label:         z.string().trim().max(60).optional(),
  isDefault:     z.boolean().optional(),
});

const walletSchema = z.object({
  type:        z.enum(['ESEWA', 'KHALTI']),
  accountName: z.string().trim().min(1, 'Account name is required').max(120),
  walletId:    z.string().trim().min(1, 'ID / mobile number is required').max(40),
  label:       z.string().trim().max(60).optional(),
  isDefault:   z.boolean().optional(),
});

export const createPayoutMethodSchema = z.discriminatedUnion('type', [bankSchema, walletSchema]);
export const updatePayoutMethodSchema = createPayoutMethodSchema;

export type CreatePayoutMethodInput = z.infer<typeof createPayoutMethodSchema>;
