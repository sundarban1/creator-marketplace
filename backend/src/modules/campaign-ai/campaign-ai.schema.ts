import { z } from 'zod';

export const generateCampaignSchema = z.object({
  prompt: z.string().min(3, 'Please describe what you want to promote').max(500),
  // 'voice' — a transcribed recording, where the actual spoken language (not
  // the app's UI language setting) must decide the output language. Omitted
  // for the Text prompt mode.
  inputSource: z.enum(['voice', 'text']).optional(),
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
  'REEL', 'STORY', 'PHOTO_POST', 'VISIT_STORE',
  'PRODUCT_REVIEW_VIDEO', 'EVENT_COVERAGE_VIDEO', 'MENTION_IN_CAPTION', 'TAG_BUSINESS', 'GOOGLE_REVIEW',
] as const;

const deliverablesSchema = z.object(
  Object.fromEntries(DELIVERABLE_KEYS.map((k) => [k, z.number().int().min(0).max(10).default(0)])) as Record<(typeof DELIVERABLE_KEYS)[number], z.ZodDefault<z.ZodNumber>>,
).refine((d) => Object.values(d).some((n) => n > 0), { message: 'At least one deliverable count must be > 0' });

// Same shape as deliverablesSchema but WITHOUT the "at least one > 0" refine — used for
// per-role requirements, where a non-Content-Creator role (Model, Photographer, DJ, ...)
// legitimately has an all-zero deliverables object and carries its content ask in
// `description` instead (see aiRequirementSchema below).
const requirementDeliverablesSchema = z.object(
  Object.fromEntries(DELIVERABLE_KEYS.map((k) => [k, z.number().int().min(0).max(10).default(0)])) as Record<(typeof DELIVERABLE_KEYS)[number], z.ZodDefault<z.ZodNumber>>,
);

// Kept in sync with OFFERING_OPTIONS in mobile create-campaign.tsx — the
// "What are you offering?" chip list (Free Invitation flow + the legacy Open
// Event editor's Creator Benefits section) only recognizes these exact labels.
export const BENEFIT_OPTIONS = [
  'Free Event Access', 'Food & Drinks', 'Free Products / Gifts',
  'Free Service / Experience', 'Product Launch / Preview', 'Other',
] as const;

// Shown to the AI so it understands what each offering category actually means —
// kept in sync with the descriptions surfaced in the mobile UI.
export const BENEFIT_DESCRIPTIONS: Record<(typeof BENEFIT_OPTIONS)[number], string> = {
  'Free Event Access': 'Entry/admission to the event itself.',
  'Food & Drinks': 'Complimentary food and beverages at the event.',
  'Free Products / Gifts': 'A free sample, trial product, or take-home gift.',
  'Free Service / Experience': 'A free session, treatment, or hands-on experience with the brand\'s service.',
  'Product Launch / Preview': 'Early or exclusive access to a new product or menu before public release.',
  'Other': 'Something else the business is offering that doesn\'t fit the other categories.',
};

// Kept in sync with EXCHANGE_TYPES in mobile create-campaign.tsx — captures what the
// business wants back from attendees in exchange for the free experience (as opposed
// to `benefits`, which captures what the business is offering).
export const EXCHANGE_OPTIONS = [
  'Social media post', 'Reel / short video', 'Video content', 'Photos', 'Story mention',
  'Honest review', 'Event promotion (pre-event post)', 'Mention / tag the business',
  'Just attend & share organically', 'Other',
] as const;

// Shown to the AI so it understands what each exchange option actually means.
export const EXCHANGE_DESCRIPTIONS: Record<(typeof EXCHANGE_OPTIONS)[number], string> = {
  'Social media post': 'A dedicated feed post about the event or business.',
  'Reel / short video': 'A short-form vertical video (Reel/TikTok-style) about the experience.',
  'Video content': 'Longer-form video content, e.g. a vlog or YouTube segment.',
  'Photos': 'Photos shared publicly of the event or business.',
  'Story mention': 'A mention of the event or business in an ephemeral story.',
  'Honest review': 'A genuine written or spoken review of the experience.',
  'Event promotion (pre-event post)': 'A post made before the event to help promote attendance.',
  'Mention / tag the business': 'Tagging or naming the business in any content posted.',
  'Just attend & share organically': 'No specific content is required — attending and sharing naturally if they wish is enough.',
  'Other': 'Some other ask not covered by the options above.',
};

// Field keys the AI is allowed to flag as "not confident" for OPEN_EVENT drafts.
export const EVENT_NEEDS_INPUT_FIELDS = ['location', 'capacity', 'platform', 'category'] as const;

export const aiEventDraftSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  category: z.string().min(1),
  secondaryCategories: z.array(z.string()).max(3).default([]),
  platform: z.string().min(1),
  secondaryPlatforms: z.array(z.string()).max(3).default([]),
  benefits: z.array(z.enum(BENEFIT_OPTIONS)).min(1).max(6),
  exchangeType: z.array(z.enum(EXCHANGE_OPTIONS)).min(1).max(6),
  expectedContent: z.string().max(300).default(''),
  capacity: z.number().int().min(1).max(500),
  location: z.string().max(120).nullable().default(null),
  needsInput: z.array(z.enum(EVENT_NEEDS_INPUT_FIELDS)).max(2).default([]),
});
export type AiEventDraft = z.infer<typeof aiEventDraftSchema>;

// One role the AI inferred from the brief when it clearly asks for multiple
// distinct provider types/counts (e.g. "two TikTok creators and a photographer")
// — mirrors campaignRequirementSchema in campaign.schema.ts, except `category`
// is a free-text name here (matched against real CREATOR categories after the
// model responds, same fuzzy-match step the top-level category/platform go
// through) rather than an already-resolved categoryId.
const aiRequirementSchema = z.object({
  category: z.string().min(1),
  quantity: z.number().int().positive().max(20),
  budgetType: z.enum(['FIXED', 'RANGE', 'NEGOTIABLE']).default('FIXED'),
  budgetFixed: z.number().positive().optional(),
  budgetMin: z.number().min(0).optional(),
  budgetMax: z.number().min(0).optional(),
  // This role's own content ask — same shape/keys as the top-level
  // `deliverables` below, but scoped to what THIS provider type should
  // produce (e.g. a DJ role gets EVENT_COVERAGE_VIDEO, a photographer gets
  // PHOTO_POST), not the campaign-wide default. Only meaningful for a
  // Content Creator role — other roles leave this all-zero and use
  // `description` instead.
  deliverables: requirementDeliverablesSchema,
  // Free-text brief of what THIS role should actually do — filled for every
  // role EXCEPT Content Creator (which uses `deliverables` instead). Empty
  // string for Content Creator roles.
  description: z.string().max(300).default(''),
}).refine((r) => r.budgetType !== 'FIXED' || (r.budgetFixed != null && r.budgetFixed > 0), {
  message: 'budgetFixed is required when budgetType is FIXED',
  path: ['budgetFixed'],
}).refine((r) => r.budgetType !== 'RANGE' || (r.budgetMin != null && r.budgetMax != null && r.budgetMax >= r.budgetMin), {
  message: 'budgetMin and budgetMax are required when budgetType is RANGE',
  path: ['budgetMax'],
});
export type AiRequirementDraft = z.infer<typeof aiRequirementSchema>;

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
  // Empty for the common single-role case — only populated when the brief
  // clearly names multiple distinct provider types/counts. See CampaignRequirement.
  requirements: z.array(aiRequirementSchema).max(10).default([]),
}).refine((d) => d.budgetMax >= d.budgetMin, {
  message: 'budgetMax must be >= budgetMin',
  path: ['budgetMax'],
});
export type AiCampaignDraft = z.infer<typeof aiCampaignDraftSchema>;
