import { z } from 'zod';

export const createCampaignSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().default(''),
  template: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  goals: z.array(z.string()).default([]),
  platform: z.string().default(''),
  minFollowers: z.number().int().min(0).default(0),
  contentType: z.string().default(''),
  deliverables: z.string().default(''),
  deadline: z.string().datetime({ message: 'Invalid deadline date' }),
  location: z.string().optional(),
  budgetMin: z.number().min(0, 'Budget minimum must be non-negative').default(0),
  budgetMax: z.number().min(0, 'Budget maximum must be non-negative').default(0),
  paymentType:    z.string().default('Fixed Fee'),
  creatorsNeeded: z.number().int().positive().default(1),
  isFeatured:     z.boolean().optional().default(false),
  campaignType: z.enum(['PAID_CAMPAIGN', 'OPEN_EVENT']).default('PAID_CAMPAIGN'),
  capacity:     z.number().int().positive().optional(),
  eventDate:    z.string().datetime().optional(),
  venue:        z.string().optional(),
  benefits:     z.array(z.string()).default([]),
}).refine((data) => data.budgetMax >= data.budgetMin, {
  message: 'Budget maximum must be greater than or equal to budget minimum',
  path: ['budgetMax'],
});

export const updateCampaignSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  template: z.string().optional(),
  category: z.string().optional(),
  goals: z.array(z.string()).optional(),
  platform: z.string().optional(),
  minFollowers: z.number().int().min(0).optional(),
  contentType: z.string().optional(),
  deliverables: z.string().optional(),
  deadline: z.string().datetime().optional(),
  location: z.string().optional().nullable(),
  budgetMin: z.number().min(0).optional(),
  budgetMax: z.number().min(0).optional(),
  paymentType:    z.string().optional(),
  creatorsNeeded: z.number().int().positive().optional(),
  status:         z.enum(['ACTIVE', 'PAUSED', 'CLOSED']).optional(),
  isFeatured:     z.boolean().optional(),
  campaignType: z.enum(['PAID_CAMPAIGN', 'OPEN_EVENT']).optional(),
  capacity:     z.number().int().positive().optional(),
  eventDate:    z.string().datetime().optional(),
  venue:        z.string().optional(),
  benefits:     z.array(z.string()).optional(),
  eventStatus:  z.enum(['OPEN', 'FULL', 'CLOSED']).optional(),
});

export const campaignListQuerySchema = z.object({
  search:       z.string().optional(),
  category:     z.string().optional(),
  platform:     z.string().optional(),
  minBudget:    z.string().optional().transform((v) => (v ? parseFloat(v) : undefined)),
  maxBudget:    z.string().optional().transform((v) => (v ? parseFloat(v) : undefined)),
  status:       z.enum(['ACTIVE', 'PAUSED', 'CLOSED']).optional(),
  isFeatured:   z.string().optional().transform((v) => v === 'true' ? true : v === 'false' ? false : undefined),
  deadlineFrom: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  deadlineTo:   z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  campaignType: z.enum(['PAID_CAMPAIGN', 'OPEN_EVENT']).optional(),
  page:         z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
  limit:        z.string().optional().transform((v) => (v ? parseInt(v) : 10)),
});

export const applyToCampaignSchema = z.object({
  coverLetter: z.string().min(50, 'Cover letter must be at least 50 characters'),
  proposedRate: z.number().min(0, 'Proposed rate must be non-negative').default(0),
  timeline: z.string().min(1, 'Timeline is required'),
  socialHandles: z.record(z.string()).default({}),
  portfolioUrl: z.string().url('Invalid portfolio URL').optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CampaignListQuery = z.infer<typeof campaignListQuerySchema>;
export type ApplyToCampaignInput = z.infer<typeof applyToCampaignSchema>;
