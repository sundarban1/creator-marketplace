import { z } from 'zod';

export const generateCampaignSchema = z.object({
  prompt: z.string().min(3, 'Please describe what you want to promote').max(500),
});
export type GenerateCampaignInput = z.infer<typeof generateCampaignSchema>;

export const suggestDescriptionSchema = z.object({
  title:        z.string().max(120).optional(),
  category:     z.string().max(60).optional(),
  platform:     z.string().max(60).optional(),
  deliverables: z.string().max(300).optional(),
}).refine((d) => !!(d.title || d.category || d.platform || d.deliverables), {
  message: 'Add a title, category, platform, or deliverables first so there is something to base a description on',
});
export type SuggestDescriptionInput = z.infer<typeof suggestDescriptionSchema>;

// Field keys the AI is allowed to flag as "not confident" — kept in sync with
// FormData in mobile create-campaign.tsx so the chip renderer can key off them.
export const NEEDS_INPUT_FIELDS = [
  'location', 'budgetMin', 'budgetMax', 'creatorsNeeded', 'deadline', 'platform', 'category',
] as const;

// Kept in sync with GOAL_OPTIONS in mobile create-campaign.tsx — the Goal chip picker
// only ever renders these exact labels, so the AI must pick one of them verbatim.
export const GOAL_OPTIONS = ['Brand Awareness', 'More Customers', 'Sales', 'Followers & Engagement'] as const;

// Kept in sync with CREATOR_TYPES in mobile create-campaign.tsx — this field means
// "which creators should promote this" (chip picker), not end-consumer demographics.
export const CREATOR_TYPES = [
  'Food Creator', 'Travel Creator', 'Lifestyle Creator', 'Fashion Creator',
  'Tech Creator', 'Fitness Creator', 'Student Creator', 'Any Creator',
] as const;

// Kept in sync with DELIVERABLE_TYPES keys in mobile create-campaign.tsx — the
// deliverables counter list only recognizes these exact keys.
export const DELIVERABLE_KEYS = [
  'REEL', 'STORY', 'PHOTO_POST', 'CAROUSEL_POST', 'VISIT_STORE',
  'PRODUCT_REVIEW_VIDEO', 'EVENT_COVERAGE_VIDEO', 'MENTION_IN_CAPTION', 'TAG_BUSINESS', 'GOOGLE_REVIEW',
] as const;

const deliverablesSchema = z.object(
  Object.fromEntries(DELIVERABLE_KEYS.map((k) => [k, z.number().int().min(0).max(10).default(0)])) as Record<(typeof DELIVERABLE_KEYS)[number], z.ZodDefault<z.ZodNumber>>,
).refine((d) => Object.values(d).some((n) => n > 0), { message: 'At least one deliverable count must be > 0' });

export const aiCampaignDraftSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  objective: z.string().min(3).max(300),
  category: z.string().min(1),
  secondaryCategories: z.array(z.string()).max(3).default([]),
  platform: z.string().min(1),
  secondaryPlatforms: z.array(z.string()).max(3).default([]),
  contentGuidelines: z.array(z.string().max(200)).min(1).max(8),
  goal: z.enum(GOAL_OPTIONS),
  targetAudience: z.array(z.enum(CREATOR_TYPES)).min(1).max(3)
    .refine((arr) => !(arr.includes('Any Creator') && arr.length > 1), {
      message: '"Any Creator" cannot be combined with other creator types',
    }),
  suggestedDurationDays: z.number().int().min(1).max(180),
  creatorsNeeded: z.number().int().min(1).max(50),
  budgetMin: z.number().min(0),
  budgetMax: z.number().min(0),
  paymentType: z.string().min(1).default('Fixed Fee'),
  deliverables: deliverablesSchema,
  hashtags: z.array(z.string().regex(/^#?[A-Za-z0-9_]+$/).max(40)).min(1).max(10),
  sampleCaption: z.string().min(5).max(600),
  approvalRequirements: z.string().min(3).max(400),
  location: z.string().max(120).nullable().default(null),
  needsInput: z.array(z.enum(NEEDS_INPUT_FIELDS)).max(2).default([]),
}).refine((d) => d.budgetMax >= d.budgetMin, {
  message: 'budgetMax must be >= budgetMin',
  path: ['budgetMax'],
});
export type AiCampaignDraft = z.infer<typeof aiCampaignDraftSchema>;
