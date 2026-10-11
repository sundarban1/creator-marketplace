import { z } from 'zod';

export const createPortfolioItemSchema = z.object({
  title:       z.string().trim().max(150).optional(),
  description: z.string().trim().max(1000).optional(),
  category:    z.string().trim().max(100).optional(),
  mediaUrl:    z.string().url('Must be a valid URL').optional(),
  mediaType:   z.enum(['IMAGE', 'VIDEO']).optional(),
  externalUrl: z.string().url('Must be a valid URL').optional(),
}).refine((v) => v.mediaUrl || v.externalUrl, {
  message: 'Either mediaUrl or externalUrl is required',
});

// Nullable so an edit can clear a field (e.g. swap a photo for a link).
export const updatePortfolioItemSchema = z.object({
  title:       z.string().trim().max(150).nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  category:    z.string().trim().max(100).nullable().optional(),
  mediaUrl:    z.string().url('Must be a valid URL').nullable().optional(),
  mediaType:   z.enum(['IMAGE', 'VIDEO']).nullable().optional(),
  externalUrl: z.string().url('Must be a valid URL').nullable().optional(),
});

export type CreatePortfolioItemInput = z.infer<typeof createPortfolioItemSchema>;
export type UpdatePortfolioItemInput = z.infer<typeof updatePortfolioItemSchema>;
