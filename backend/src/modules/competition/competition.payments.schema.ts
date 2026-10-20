import { z } from 'zod';

// Request shapes for prize-payment endpoints. Every status rule lives in
// competition.payments.rules.ts; these only validate input.

export const initiateFundingSchema = z.object({
  provider: z.enum(['khalti', 'esewa']),
  platform: z.enum(['web', 'mobile']).default('mobile'),
});

// Multipart (optional `evidence` image) — numbers and dates arrive as strings.
export const reportDirectPaymentSchema = z.object({
  amount:    z.coerce.number().positive('Enter the amount you paid').max(100_000_000),
  paidOn:    z.coerce.date(),
  method:    z.enum(['BANK_TRANSFER', 'ESEWA', 'KHALTI', 'FONEPAY', 'CASH', 'CHEQUE', 'OTHER']),
  reference: z.string().trim().max(120).optional().nullable(),
  note:      z.string().trim().max(500).optional().nullable(),
});

export const disputePayoutSchema = z.object({
  reason: z.string().trim().min(10, 'Tell us what went wrong (at least 10 characters)').max(1000),
});

export const adminPayoutActionSchema = z.object({
  action:    z.enum(['approve', 'start_processing', 'mark_paid', 'mark_failed', 'retry', 'cancel', 'admin_verify', 'resolve_unpaid']),
  reference: z.string().trim().max(120).optional().nullable(),
  note:      z.string().trim().max(1000).optional().nullable(),
});

export const adminRefundSchema = z.object({
  amount:    z.number().positive().max(100_000_000),
  reference: z.string().trim().min(3, 'Enter the refund transaction reference').max(120),
  note:      z.string().trim().max(1000).optional().nullable(),
});

export const paymentsAdminListQuerySchema = z.object({
  method:    z.enum(['KOLAB', 'DIRECT']).optional(),
  attention: z.enum(['true', 'false']).optional(),
  q:         z.string().trim().max(100).optional(),
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(25),
});

export type ReportDirectPaymentInput = z.infer<typeof reportDirectPaymentSchema>;
export type AdminPayoutActionInput = z.infer<typeof adminPayoutActionSchema>;
export type AdminRefundInput = z.infer<typeof adminRefundSchema>;
export type PaymentsAdminListQuery = z.infer<typeof paymentsAdminListQuerySchema>;
