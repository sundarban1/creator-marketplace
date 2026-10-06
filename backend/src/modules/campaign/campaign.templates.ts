import type { DraftCampaignInput } from './campaign.schema';

// Built-in campaign templates (UX spec §23). Kept in code rather than the DB so
// they ship with the app and can't be edited away; a business's own templates
// live in CampaignTemplate. Text (name, description, starter brief) comes from
// the i18n dict `campaignTemplates` so templates read naturally in Nepali too.
//
// Deliberately NO budget and no creator requirements: a template suggests the
// shape of a campaign, never money or hard requirements the business didn't
// choose (the same never-invent rule as AI extraction, §30). Everything it
// fills is marked AI_SUGGESTED so the review screen shows "Suggested by Kolab".

export const SYSTEM_TEMPLATE_KEYS = [
  'restaurant', 'productLaunch', 'storeOpening', 'eventPromotion', 'ugc',
  'hotel', 'education', 'festival', 'brandAwareness',
] as const;
export type SystemTemplateKey = (typeof SYSTEM_TEMPLATE_KEYS)[number];

interface SystemTemplateShape {
  icon: string;
  goal: 'Brand Awareness' | 'More Customers' | 'Sales' | 'Followers & Engagement';
  creatorsVisit: boolean;
  creatorsNeeded: number;
  platforms: string[];
  deliverableItems: { type: string; platform: string | null; quantity: number }[];
}

export const SYSTEM_TEMPLATES: Record<SystemTemplateKey, SystemTemplateShape> = {
  restaurant:     { icon: 'utensils', goal: 'More Customers', creatorsVisit: true, creatorsNeeded: 3, platforms: ['Instagram', 'TikTok'],
                    deliverableItems: [{ type: 'REEL', platform: 'Instagram', quantity: 1 }, { type: 'STORY', platform: 'Instagram', quantity: 2 }] },
  productLaunch:  { icon: 'rocket', goal: 'Sales', creatorsVisit: false, creatorsNeeded: 5, platforms: ['Instagram', 'TikTok'],
                    deliverableItems: [{ type: 'PRODUCT_REVIEW', platform: 'Instagram', quantity: 1 }, { type: 'TIKTOK_VIDEO', platform: 'TikTok', quantity: 1 }] },
  storeOpening:   { icon: 'store', goal: 'More Customers', creatorsVisit: true, creatorsNeeded: 4, platforms: ['Instagram', 'Facebook'],
                    deliverableItems: [{ type: 'REEL', platform: 'Instagram', quantity: 1 }, { type: 'STORY', platform: 'Instagram', quantity: 3 }] },
  eventPromotion: { icon: 'calendar-check', goal: 'Brand Awareness', creatorsVisit: true, creatorsNeeded: 5, platforms: ['Instagram', 'TikTok'],
                    deliverableItems: [{ type: 'EVENT_COVERAGE', platform: 'Instagram', quantity: 1 }, { type: 'STORY', platform: 'Instagram', quantity: 3 }] },
  ugc:            { icon: 'video', goal: 'Sales', creatorsVisit: false, creatorsNeeded: 3, platforms: [],
                    deliverableItems: [{ type: 'UGC_VIDEO', platform: null, quantity: 2 }] },
  hotel:          { icon: 'hotel', goal: 'Brand Awareness', creatorsVisit: true, creatorsNeeded: 2, platforms: ['Instagram', 'YouTube'],
                    deliverableItems: [{ type: 'REEL', platform: 'Instagram', quantity: 2 }, { type: 'YOUTUBE_VIDEO', platform: 'YouTube', quantity: 1 }] },
  education:      { icon: 'graduation-cap', goal: 'More Customers', creatorsVisit: false, creatorsNeeded: 3, platforms: ['TikTok', 'YouTube'],
                    deliverableItems: [{ type: 'TIKTOK_VIDEO', platform: 'TikTok', quantity: 2 }, { type: 'YOUTUBE_SHORT', platform: 'YouTube', quantity: 1 }] },
  festival:       { icon: 'star', goal: 'Sales', creatorsVisit: false, creatorsNeeded: 5, platforms: ['Instagram', 'Facebook', 'TikTok'],
                    deliverableItems: [{ type: 'REEL', platform: 'Instagram', quantity: 1 }, { type: 'TIKTOK_VIDEO', platform: 'TikTok', quantity: 1 }] },
  brandAwareness: { icon: 'bullhorn', goal: 'Brand Awareness', creatorsVisit: false, creatorsNeeded: 5, platforms: ['Instagram', 'TikTok'],
                    deliverableItems: [{ type: 'REEL', platform: 'Instagram', quantity: 1 }, { type: 'TIKTOK_VIDEO', platform: 'TikTok', quantity: 1 }] },
};

export interface TemplateCopy { name: string; summary: string; brief: string; talkingPoints: string[] }

// Draft body for a built-in template, in the request's language.
export function systemTemplatePayload(key: SystemTemplateKey, copy: TemplateCopy): DraftCampaignInput {
  const t = SYSTEM_TEMPLATES[key];
  const suggested = 'AI_SUGGESTED' as const;
  return {
    title: copy.name,
    description: copy.brief,
    goals: [t.goal],
    platforms: t.platforms,
    creatorsNeeded: t.creatorsNeeded,
    locationType: t.creatorsVisit ? 'ONSITE' : 'REMOTE',
    locationScope: t.creatorsVisit ? 'SPECIFIC' : 'NATIONWIDE',
    deliverableItems: t.deliverableItems,
    brief: { content: { talkingPoints: copy.talkingPoints, creatorsVisit: t.creatorsVisit } },
    aiProvenance: {
      title: suggested, description: suggested, goal: suggested, platforms: suggested,
      creatorsNeeded: suggested, deliverableItems: suggested, locationType: suggested,
    },
  };
}

// Fields copied from a campaign into a template / new draft. Dates and draft
// state are never carried over — a reused campaign gets its own timing.
export const REUSABLE_FIELDS = [
  'title', 'description', 'category', 'goals', 'platforms', 'minFollowers', 'deliverables', 'locationType',
  'locations', 'locationScope', 'deliverableItems', 'brief', 'budgetMin', 'budgetMax', 'budgetRateType',
  'budgetInputType', 'paymentType', 'creatorsNeeded', 'hashtags', 'featureImageUrl',
] as const;

export const MAX_TEMPLATES_PER_BUSINESS = 20;
