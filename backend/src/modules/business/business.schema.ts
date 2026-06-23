import { z } from 'zod';

export const updateBusinessProfileSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters').optional(),
  description: z.string().max(1000).optional(),
  logoUrl: z.string().url('Invalid logo URL').optional().nullable(),
  website: z.string().url('Invalid website URL').optional().nullable(),
  categories: z.array(z.string()).optional(),
  panNo: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  showPublicProfile:   z.boolean().optional(),
  hideContactDetails:  z.boolean().optional(),
  allowDirectMessages: z.boolean().optional(),
  socialLinks: z.object({
    facebook:  z.string().optional(),
    instagram: z.string().optional(),
    tiktok:    z.string().optional(),
    linkedin:  z.string().optional(),
  }).optional(),
});

export type UpdateBusinessProfileInput = z.infer<typeof updateBusinessProfileSchema>;
