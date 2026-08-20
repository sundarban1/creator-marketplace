import { z } from 'zod';

const pricingModel = z.enum(['PER_PROJECT', 'PER_HOUR', 'PER_DAY', 'PER_CAMPAIGN', 'CUSTOM_QUOTE']);

export const createServiceSchema = z.object({
  categoryId:    z.string().min(1, 'Category is required'),
  name:          z.string().trim().min(3, 'Name must be at least 3 characters').max(100, 'Name must be at most 100 characters'),
  description:   z.string().trim().min(50, 'Description must be at least 50 characters').max(1000, 'Description must be at most 1000 characters'),
  startingPrice: z.number().positive('Starting price must be greater than 0').optional(),
  pricingModel,
  deliveryTime:  z.string().max(50).optional(),
  whatsIncluded: z.array(z.string().trim().min(1)).max(10, 'At most 10 items allowed').optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

export const updateServiceStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'HIDDEN', 'REPORTED', 'REMOVED']),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
