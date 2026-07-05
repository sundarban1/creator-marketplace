import { z } from 'zod';

export const generateCampaignSchema = z.object({
  prompt: z.string().min(3, 'Please describe what you want to promote').max(500),
});
export type GenerateCampaignInput = z.infer<typeof generateCampaignSchema>;

// Field keys the AI is allowed to flag as "not confident" — kept in sync with
// FormData in mobile create-campaign.tsx so the chip renderer can key off them.
export const NEEDS_INPUT_FIELDS = [
  'location', 'budgetMin', 'budgetMax', 'creatorsNeeded', 'deadline', 'platform', 'category',
] as const;

export const aiCampaignDraftSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  objective: z.string().min(3).max(300),
  category: z.string().min(1),
  secondaryCategories: z.array(z.string()).max(3).default([]),
  platform: z.string().min(1),
  secondaryPlatforms: z.array(z.string()).max(3).default([]),
  contentGuidelines: z.array(z.string().max(200)).min(1).max(8),
  targetAudience: z.array(z.string().max(120)).min(1).max(6),
  suggestedDurationDays: z.number().int().min(1).max(180),
  creatorsNeeded: z.number().int().min(1).max(50),
  budgetMin: z.number().min(0),
  budgetMax: z.number().min(0),
  paymentType: z.string().min(1).default('Fixed Fee'),
  deliverables: z.string().min(1).max(300),
  hashtags: z.array(z.string().regex(/^#?[A-Za-z0-9_]+$/).max(40)).min(1).max(10),
  sampleCaption: z.string().min(5).max(600),
  callToAction: z.string().min(3).max(150),
  approvalRequirements: z.string().min(3).max(400),
  location: z.string().max(120).nullable().default(null),
  needsInput: z.array(z.enum(NEEDS_INPUT_FIELDS)).max(2).default([]),
}).refine((d) => d.budgetMax >= d.budgetMin, {
  message: 'budgetMax must be >= budgetMin',
  path: ['budgetMax'],
});
export type AiCampaignDraft = z.infer<typeof aiCampaignDraftSchema>;
