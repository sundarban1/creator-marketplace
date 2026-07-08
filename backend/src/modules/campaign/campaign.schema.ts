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
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
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
  status:       z.enum(['DRAFT', 'ACTIVE']).optional().default('ACTIVE'),
  objective:            z.string().max(300).optional(),
  contentGuidelines:    z.array(z.string()).default([]),
  targetAudience:       z.array(z.string()).default([]),
  hashtags:             z.array(z.string()).default([]),
  sampleCaption:        z.string().max(600).optional(),
  callToAction:         z.string().max(150).optional(),
  approvalRequirements: z.string().max(400).optional(),
  aiGenerated:           z.boolean().optional().default(false),
  aiPrompt:              z.string().max(500).optional(),
  aiSuggestedCategories: z.array(z.string()).default([]),
  aiSuggestedPlatforms:  z.array(z.string()).default([]),
  aiNeedsInputFields:    z.array(z.string()).default([]),
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
  locationLat: z.number().min(-90).max(90).optional().nullable(),
  locationLng: z.number().min(-180).max(180).optional().nullable(),
  budgetMin: z.number().min(0).optional(),
  budgetMax: z.number().min(0).optional(),
  paymentType:    z.string().optional(),
  creatorsNeeded: z.number().int().positive().optional(),
  status:         z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'CANCELLED']).optional(),
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
  status:       z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'CANCELLED']).optional(),
  isFeatured:   z.string().optional().transform((v) => v === 'true' ? true : v === 'false' ? false : undefined),
  deadlineFrom: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  deadlineTo:   z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  campaignType: z.enum(['PAID_CAMPAIGN', 'OPEN_EVENT']).optional(),
  page:         z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
  limit:        z.string().optional().transform((v) => (v ? parseInt(v) : 10)),
});

export const nearbyQuerySchema = z.object({
  lat:      z.string().transform((v, ctx) => {
    const n = parseFloat(v);
    if (Number.isNaN(n) || n < -90 || n > 90) { ctx.addIssue({ code: 'custom', message: 'Invalid latitude' }); return z.NEVER; }
    return n;
  }),
  lng:      z.string().transform((v, ctx) => {
    const n = parseFloat(v);
    if (Number.isNaN(n) || n < -180 || n > 180) { ctx.addIssue({ code: 'custom', message: 'Invalid longitude' }); return z.NEVER; }
    return n;
  }),
  radiusKm: z.string().optional().transform((v, ctx) => {
    const n = v ? parseFloat(v) : 25;
    if (Number.isNaN(n) || n <= 0 || n > 200) { ctx.addIssue({ code: 'custom', message: 'radiusKm must be between 0 and 200' }); return z.NEVER; }
    return n;
  }),
  page:  z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
  limit: z.string().optional().transform((v) => (v ? parseInt(v) : 10)),
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
export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;
export type ApplyToCampaignInput = z.infer<typeof applyToCampaignSchema>;
