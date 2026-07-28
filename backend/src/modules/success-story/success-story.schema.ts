import { z } from 'zod';

export const createSuccessStorySchema = z.object({
  name:     z.string().min(1, 'Name is required'),
  role:     z.string().min(1, 'Role is required'),
  quote:    z.string().min(1, 'Quote is required'),
  photoUrl: z.string().url().nullable().optional(),
  order:    z.number().int().optional(),
  status:   z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const updateSuccessStorySchema = createSuccessStorySchema;

export const updateSuccessStoryStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export type CreateSuccessStoryInput = z.infer<typeof createSuccessStorySchema>;
export type UpdateSuccessStoryInput = z.infer<typeof updateSuccessStorySchema>;
