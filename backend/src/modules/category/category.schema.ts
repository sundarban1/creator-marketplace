import { z } from 'zod';

export const createCategorySchema = z.object({
  icon:   z.string().min(1, 'Icon is required').max(8),
  iconBg: z.string().min(1, 'Icon background color is required'),
  name:   z.string().min(1, 'Name is required'),
  key:    z.string().min(1, 'Key is required').regex(/^[a-z0-9-]+$/, 'Key must be lowercase letters, numbers, and dashes only'),
  scope:  z.enum(['CREATOR', 'BUSINESS', 'BOTH']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const updateCategorySchema = createCategorySchema;

export const updateCategoryStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
