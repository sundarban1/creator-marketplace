import { z } from 'zod';

export const createPaymentMethodSchema = z.object({
  key:     z.string().min(1, 'Key is required').regex(/^[a-z0-9-]+$/, 'Key must be lowercase letters, numbers, or hyphens'),
  name:    z.string().min(1, 'Name is required'),
  iconUrl: z.string().url().nullable().optional(),
  color:   z.string().optional(),
  order:   z.number().int().optional(),
  status:  z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const updatePaymentMethodSchema = createPaymentMethodSchema;

export const updatePaymentMethodStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;
