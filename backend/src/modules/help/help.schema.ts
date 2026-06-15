import { z } from 'zod';

export const createHelpArticleSchema = z.object({
  question: z.string().min(5, 'Question must be at least 5 characters'),
  answer:   z.string().min(10, 'Answer must be at least 10 characters'),
  category: z.string().min(1).optional(),
  order:    z.number().int().min(0).optional(),
  published: z.boolean().optional(),
});

export const updateHelpArticleSchema = z.object({
  question:  z.string().min(5).optional(),
  answer:    z.string().min(10).optional(),
  category:  z.string().min(1).optional(),
  order:     z.number().int().min(0).optional(),
  published: z.boolean().optional(),
});

export type CreateHelpArticleInput = z.infer<typeof createHelpArticleSchema>;
export type UpdateHelpArticleInput = z.infer<typeof updateHelpArticleSchema>;
