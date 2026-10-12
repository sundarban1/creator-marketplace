import { z } from 'zod';

export const createPartnerSchema = z.object({
  name:       z.string().trim().min(1, 'Name is required').max(120),
  logoUrl:    z.string().url('Logo is required'),
  websiteUrl: z.string().url().nullable().optional(),
  order:      z.number().int().optional(),
  status:     z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const updatePartnerSchema = createPartnerSchema;

export const updatePartnerStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;
