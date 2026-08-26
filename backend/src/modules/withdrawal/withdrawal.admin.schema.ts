import { z } from 'zod';

export const rejectWithdrawalSchema = z.object({
  reason: z.string().trim().min(3, 'A rejection reason is required').max(500),
});

// Text fields of the multipart "Mark as Paid" request — the screenshot file is
// handled separately by multer. `paymentDate` arrives as an ISO / yyyy-mm-dd
// string from the admin form.
export const markWithdrawalPaidSchema = z.object({
  transactionReference: z.string().trim().min(1, 'Transaction reference is required').max(200),
  paymentDate:          z.coerce.date({ errorMap: () => ({ message: 'A valid payment date is required' }) }),
  adminNotes:           z.string().trim().max(1000).optional(),
});

export type RejectWithdrawalInput = z.infer<typeof rejectWithdrawalSchema>;
export type MarkWithdrawalPaidInput = z.infer<typeof markWithdrawalPaidSchema>;
