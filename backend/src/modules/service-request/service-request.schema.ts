import { z } from 'zod';

export const createServiceRequestSchema = z.object({
  serviceId: z.string().min(1, 'Service is required'),
  message:   z.string().trim().min(10, 'Message must be at least 10 characters').max(1000, 'Message must be at most 1000 characters'),
  budget:    z.number().positive('Budget must be greater than 0').optional(),
});

export const respondServiceRequestSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED']),
});

export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>;
export type RespondServiceRequestInput = z.infer<typeof respondServiceRequestSchema>;
