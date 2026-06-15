import { z } from 'zod';

export const createCampaignSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().default(''),
  category: z.string().min(1, 'Category is required'),
  platform: z.string().min(1, 'Platform is required'),
  minFollowers: z.number().int().min(0).default(0),
  contentType: z.string().min(1, 'Content type is required'),
  deliverables: z.string().min(1, 'Deliverables are required'),
  deadline: z.string().datetime({ message: 'Invalid deadline date' }),
  location: z.string().optional(),
  budgetMin: z.number().positive('Budget minimum must be positive'),
  budgetMax: z.number().positive('Budget maximum must be positive'),
  paymentType:    z.string().min(1, 'Payment type is required'),
  creatorsNeeded: z.number().int().positive().default(1),
  isFeatured:     z.boolean().optional().default(false),
}).refine((data) => data.budgetMax >= data.budgetMin, {
  message: 'Budget maximum must be greater than or equal to budget minimum',
  path: ['budgetMax'],
});

export const updateCampaignSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  category: z.string().optional(),
  platform: z.string().optional(),
  minFollowers: z.number().int().min(0).optional(),
  contentType: z.string().optional(),
  deliverables: z.string().optional(),
  deadline: z.string().datetime().optional(),
  location: z.string().optional().nullable(),
  budgetMin: z.number().positive().optional(),
  budgetMax: z.number().positive().optional(),
  paymentType:    z.string().optional(),
  creatorsNeeded: z.number().int().positive().optional(),
  status:         z.enum(['ACTIVE', 'PAUSED', 'CLOSED']).optional(),
  isFeatured:     z.boolean().optional(),
});

export const campaignListQuerySchema = z.object({
  category:   z.string().optional(),
  platform:   z.string().optional(),
  minBudget:  z.string().optional().transform((v) => (v ? parseFloat(v) : undefined)),
  maxBudget:  z.string().optional().transform((v) => (v ? parseFloat(v) : undefined)),
  status:     z.enum(['ACTIVE', 'PAUSED', 'CLOSED']).optional(),
  isFeatured: z.string().optional().transform((v) => v === 'true' ? true : v === 'false' ? false : undefined),
  page:       z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
  limit:      z.string().optional().transform((v) => (v ? parseInt(v) : 10)),
});

export const applyToCampaignSchema = z.object({
  coverLetter: z.string().min(50, 'Cover letter must be at least 50 characters'),
  proposedRate: z.number().positive('Proposed rate must be positive'),
  timeline: z.string().min(1, 'Timeline is required'),
  socialHandles: z.record(z.string()).default({}),
  portfolioUrl: z.string().url('Invalid portfolio URL').optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CampaignListQuery = z.infer<typeof campaignListQuerySchema>;
export type ApplyToCampaignInput = z.infer<typeof applyToCampaignSchema>;
