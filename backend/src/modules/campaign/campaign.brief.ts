import { z } from 'zod';

// Shapes for the guided campaign creator's structured fields (Campaign.locations,
// deliverableItems, brief, aiProvenance). One flexible structure for every
// business size — every section and field is optional; nothing here is
// required to publish (see campaign.rules.ts for what is).

const shortText = (max: number) => z.string().trim().max(max);
const textList = (maxItems: number, maxLen: number) => z.array(shortText(maxLen).min(1)).max(maxItems);

export const campaignLocationSchema = z.object({
  name: shortText(120).min(1, 'Location name is required'),
  lat:  z.number().min(-90).max(90).nullable().optional(),
  lng:  z.number().min(-180).max(180).nullable().optional(),
});
export type CampaignLocation = z.infer<typeof campaignLocationSchema>;

export const deliverableItemSchema = z.object({
  // Free-form key (REEL, TIKTOK_VIDEO, STORY, PHOTO_POST, YOUTUBE_VIDEO, UGC_VIDEO,
  // REVIEW, …) so a new content format never needs a migration.
  type:        shortText(40).min(1, 'Deliverable type is required'),
  platform:    shortText(40).nullable().optional(),
  quantity:    z.number().int().min(1, 'Each deliverable needs at least 1').max(50, 'At most 50 of one deliverable'),
  format:      shortText(60).nullable().optional(),
  durationSec: z.number().int().min(1).max(3600).nullable().optional(),
  notes:       shortText(300).nullable().optional(),
});
export type DeliverableItem = z.infer<typeof deliverableItemSchema>;

export const CREATOR_TIERS = ['NANO', 'MICRO', 'MID', 'MACRO'] as const;

export const campaignBriefSchema = z.object({
  audience: z.object({
    ageMin:     z.number().int().min(13).max(100).nullable().optional(),
    ageMax:     z.number().int().min(13).max(100).nullable().optional(),
    genders:    textList(4, 20).optional(),
    locations:  textList(20, 120).optional(),
    interests:  textList(20, 60).optional(),
    languages:  textList(10, 40).optional(),
    notes:      shortText(500).optional(),
  }).refine((a) => a.ageMin == null || a.ageMax == null || a.ageMax >= a.ageMin, {
    message: 'Maximum age must be at least the minimum age', path: ['ageMax'],
  }).optional(),
  creatorRequirements: z.object({
    tiers:             z.array(z.enum(CREATOR_TIERS)).max(4).optional(),
    minEngagementRate: z.number().min(0).max(100).nullable().optional(),
    languages:         textList(10, 40).optional(),
    notes:             shortText(500).optional(),
  }).optional(),
  content: z.object({
    keyMessages:   textList(10, 200).optional(),
    talkingPoints: textList(15, 200).optional(),
    mentions:      textList(10, 60).optional(),
    contentStyle:  shortText(200).optional(),
    dos:           textList(15, 200).optional(),
    donts:         textList(15, 200).optional(),
    productInfo:   shortText(1000).optional(),
    // "Should creators visit you?" — null = not answered / not sure.
    creatorsVisit: z.boolean().nullable().optional(),
  }).optional(),
  commercial: z.object({
    usageRights:     shortText(300).optional(),
    licensingDays:   z.number().int().min(1).max(3650).nullable().optional(),
    exclusivity:     z.boolean().optional(),
    exclusivityDays: z.number().int().min(1).max(365).nullable().optional(),
  }).optional(),
  approval: z.object({
    draftRequired:     z.boolean().optional(),
    revisionRounds:    z.number().int().min(0).max(10).nullable().optional(),
    approvalDeadline:  z.string().datetime().nullable().optional(),
    reportingRequired: z.boolean().optional(),
    notes:             shortText(500).optional(),
  }).optional(),
  attachments: z.array(z.object({
    url:  z.string().url(),
    name: shortText(120).min(1),
  })).max(10).optional(),
});
export type CampaignBrief = z.infer<typeof campaignBriefSchema>;

export const PROVENANCE = ['USER', 'AI_EXTRACTED', 'AI_SUGGESTED'] as const;
export const aiProvenanceSchema = z.record(z.string().max(60), z.enum(PROVENANCE))
  .refine((r) => Object.keys(r).length <= 60, { message: 'Too many provenance entries' });

// Fields shared by create, update and draft autosave.
export const guidedCampaignFields = {
  locations:           z.array(campaignLocationSchema).max(20, 'At most 20 locations').optional(),
  locationScope:       z.enum(['SPECIFIC', 'NATIONWIDE', 'ANYWHERE']).optional(),
  deliverableItems:    z.array(deliverableItemSchema).max(20, 'At most 20 deliverables').optional(),
  brief:               campaignBriefSchema.optional(),
  startDate:           z.string().datetime({ message: 'Invalid start date' }).nullable().optional(),
  applicationDeadline: z.string().datetime({ message: 'Invalid application deadline' }).nullable().optional(),
  aiProvenance:        aiProvenanceSchema.optional(),
  draftStep:           z.string().max(40).nullable().optional(),
};

// Human summary of structured deliverables for the legacy `deliverables`
// text column (shown on creator-facing cards that predate deliverableItems).
export function summarizeDeliverables(items: DeliverableItem[]): string {
  return items
    .map((d) => {
      const label = d.type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
        .replace(/\btiktok\b/i, 'TikTok').replace(/\byoutube\b/i, 'YouTube').replace(/\bugc\b/i, 'UGC');
      return `${d.quantity}× ${label}${d.platform ? ` (${d.platform})` : ''}`;
    })
    .join(', ');
}

// Number of advanced brief sections the business actually filled in — an
// input to the internal complexity level (campaign.rules.ts).
export function countFilledBriefSections(brief: CampaignBrief | null | undefined): number {
  if (!brief) return 0;
  const filled = (v: unknown): boolean => {
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.values(v as Record<string, unknown>).some(filled);
    if (typeof v === 'string') return v.trim().length > 0;
    return true;
  };
  return (['audience', 'creatorRequirements', 'content', 'commercial', 'approval', 'attachments'] as const)
    .filter((k) => filled(brief[k])).length;
}
