import { z } from 'zod';

// One role-slot for a multi-requirement campaign (§ CampaignRequirement).
// Optional on createCampaignSchema — omitting `requirements` entirely keeps
// a campaign in the simple single-category mode every existing campaign uses.
export const campaignRequirementSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  quantity:   z.number().int().positive().default(1),
  budgetType: z.enum(['FIXED', 'RANGE', 'NEGOTIABLE']).default('FIXED'),
  budgetFixed: z.number().positive().optional(),
  budgetMin:   z.number().min(0).optional(),
  budgetMax:   z.number().min(0).optional(),
  deliverables: z.string().max(1000).optional(),
  description:  z.string().max(1000).optional(),
  format:       z.array(z.string().max(20)).max(10).default([]),
  deadline:     z.string().datetime().optional(),
}).refine((r) => r.budgetType !== 'FIXED' || (r.budgetFixed != null && r.budgetFixed > 0), {
  message: 'budgetFixed is required and must be > 0 when budgetType is FIXED',
  path: ['budgetFixed'],
}).refine((r) => r.budgetType !== 'RANGE' || (r.budgetMin != null && r.budgetMax != null && r.budgetMax >= r.budgetMin), {
  message: 'budgetMin and budgetMax are required when budgetType is RANGE, with budgetMax >= budgetMin',
  path: ['budgetMax'],
});

export const createCampaignSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().default(''),
  template: z.string().optional(),
  featureImageUrl: z.string().url().optional(),
  category: z.string().min(1, 'Category is required'),
  goals: z.array(z.string()).default([]),
  platforms: z.array(z.string()).max(3, 'You can select up to 3 platforms').default([]),
  minFollowers: z.number().int().min(0).default(0),
  contentType: z.string().default(''),
  deliverables: z.string().default(''),
  deadline: z.string().datetime({ message: 'Invalid deadline date' }),
  location: z.string().optional(),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  locationType: z.enum(['ONSITE', 'REMOTE']).optional().default('ONSITE'),
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
  approvalRequirements: z.string().max(400).optional(),
  aiGenerated:           z.boolean().optional().default(false),
  aiPrompt:              z.string().max(500).optional(),
  aiSuggestedCategories: z.array(z.string()).default([]),
  aiSuggestedPlatforms:  z.array(z.string()).default([]),
  aiNeedsInputFields:    z.array(z.string()).default([]),
  // Omit for the simple single-category flow every existing campaign uses.
  // When present, requirements are the source of truth for "what providers
  // are needed" — category/budgetMin/budgetMax/creatorsNeeded above still
  // get saved (so old clients reading a campaign don't see blank fields) but
  // become informational summaries rather than what applicants apply against.
  requirements: z.array(campaignRequirementSchema).max(10, 'At most 10 requirements').optional(),
}).refine((data) => data.budgetMax >= data.budgetMin, {
  message: 'Budget maximum must be greater than or equal to budget minimum',
  path: ['budgetMax'],
});

export const updateCampaignSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  template: z.string().optional(),
  featureImageUrl: z.string().url().optional().nullable(),
  category: z.string().optional(),
  goals: z.array(z.string()).optional(),
  platforms: z.array(z.string()).max(3, 'You can select up to 3 platforms').optional(),
  minFollowers: z.number().int().min(0).optional(),
  contentType: z.string().optional(),
  deliverables: z.string().optional(),
  objective: z.string().max(300).optional(),
  contentGuidelines: z.array(z.string()).optional(),
  targetAudience: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
  deadline: z.string().datetime().optional(),
  location: z.string().optional().nullable(),
  locationLat: z.number().min(-90).max(90).optional().nullable(),
  locationLng: z.number().min(-180).max(180).optional().nullable(),
  locationType: z.enum(['ONSITE', 'REMOTE']).optional(),
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
  category:     z.string().optional().transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined)),
  platform:     z.string().optional().transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined)),
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
  search:   z.string().optional(),
  category: z.string().optional().transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined)),
  platform: z.string().optional().transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined)),
  page:  z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
  limit: z.string().optional().transform((v) => (v ? parseInt(v) : 10)),
});

export const applyToCampaignSchema = z.object({
  coverLetter: z.string().min(50, 'Cover letter must be at least 50 characters'),
  proposedRate: z.number().min(0, 'Proposed rate must be non-negative').default(0),
  timeline: z.string().min(1, 'Timeline is required'),
  socialHandles: z.record(z.string()).default({}),
  portfolioUrl: z.string().url('Invalid portfolio URL').optional(),
  // Set only when applying to one role of a multi-requirement campaign —
  // omitted entirely for the simple single-category case (the common one).
  requirementId: z.string().optional(),
});

export const submitReviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().max(1000).optional(),
});

export const deliverableVideoCompleteSchema = z.object({
  publicId: z.string().min(1),
  // Client-measured duration, used only as a display fallback for the narrow
  // window where Cloudinary hasn't finished indexing the asset yet — see
  // completeDeliverableVideo. Cloudinary's own duration wins when present.
  clientDurationSec: z.number().min(0).max(7200).optional(),
});

export const renameDeliverableVideoSchema = z.object({
  publicId: z.string().min(1),
  label:    z.string().min(1).max(60),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CampaignListQuery = z.infer<typeof campaignListQuerySchema>;
export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;
export type ApplyToCampaignInput = z.infer<typeof applyToCampaignSchema>;
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
export type DeliverableVideoCompleteInput = z.infer<typeof deliverableVideoCompleteSchema>;
export type RenameDeliverableVideoInput   = z.infer<typeof renameDeliverableVideoSchema>;
