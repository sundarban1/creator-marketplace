import { z } from 'zod';

export const createPlatformSchema = z.object({
  icon:   z.string().min(1, 'Icon is required'),
  iconBg: z.string().min(1, 'Icon background color is required'),
  color:  z.string().min(1, 'Icon color is required'),
  name:   z.string().min(1, 'Name is required'),
  key:    z.string().min(1, 'Key is required').regex(/^[a-z0-9-]+$/, 'Key must be lowercase letters, numbers, and dashes only'),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const updatePlatformSchema = createPlatformSchema;

export const updatePlatformStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export type CreatePlatformInput = z.infer<typeof createPlatformSchema>;
export type UpdatePlatformInput = z.infer<typeof updatePlatformSchema>;
