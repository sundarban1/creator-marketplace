import type { CampaignBrief } from '@/services/guidedCampaign';

// One description of the advanced brief (§8–9), shared by the requirements
// step (editing), the review screen and the event details pages (display), so
// a field added here shows up everywhere. Labels are i18n keys under `guided.`.

export type BriefFieldKind = 'list' | 'text' | 'longtext' | 'number' | 'bool' | 'tiers' | 'date';

export interface BriefFieldDef {
  key: string;
  label: string; // i18n key
  kind: BriefFieldKind;
  placeholder?: string; // i18n key
  // Short "Why are we asking?" explanation (i18n key) for fields businesses find confusing.
  why?: string;
  min?: number;
  max?: number;
}

export interface BriefSectionDef {
  key: keyof CampaignBrief;
  title: string; // i18n key
  hint: string; // i18n key
  fields: BriefFieldDef[];
}

export const CREATOR_TIERS = ['NANO', 'MICRO', 'MID', 'MACRO'] as const;

export const BRIEF_SECTIONS: BriefSectionDef[] = [
  {
    key: 'content', title: 'guided.secContent', hint: 'guided.secContentHint',
    fields: [
      { key: 'keyMessages', label: 'guided.fKeyMessages', kind: 'list', placeholder: 'guided.phKeyMessages' },
      { key: 'talkingPoints', label: 'guided.fTalkingPoints', kind: 'list', placeholder: 'guided.phTalkingPoints' },
      { key: 'mentions', label: 'guided.fMentions', kind: 'list', placeholder: 'guided.phMentions' },
      { key: 'contentStyle', label: 'guided.fContentStyle', kind: 'text', placeholder: 'guided.phContentStyle' },
      { key: 'dos', label: 'guided.fDos', kind: 'list', placeholder: 'guided.phDos' },
      { key: 'donts', label: 'guided.fDonts', kind: 'list', placeholder: 'guided.phDonts' },
      { key: 'productInfo', label: 'guided.fProductInfo', kind: 'longtext', placeholder: 'guided.phProductInfo' },
    ],
  },
  {
    key: 'creatorRequirements', title: 'guided.secCreatorReq', hint: 'guided.secCreatorReqHint',
    fields: [
      { key: 'tiers', label: 'guided.fTiers', kind: 'tiers', why: 'guided.whyTiers' },
      { key: 'minEngagementRate', label: 'guided.fEngagement', kind: 'number', min: 0, max: 100, why: 'guided.whyEngagement' },
      { key: 'languages', label: 'guided.fLanguages', kind: 'list', placeholder: 'guided.phLanguages' },
      { key: 'notes', label: 'guided.fNotes', kind: 'longtext' },
    ],
  },
  {
    key: 'audience', title: 'guided.secAudience', hint: 'guided.secAudienceHint',
    fields: [
      { key: 'ageMin', label: 'guided.fAgeMin', kind: 'number', min: 13, max: 100 },
      { key: 'ageMax', label: 'guided.fAgeMax', kind: 'number', min: 13, max: 100 },
      { key: 'genders', label: 'guided.fGenders', kind: 'list', placeholder: 'guided.phGenders' },
      { key: 'locations', label: 'guided.fAudienceLocations', kind: 'list', placeholder: 'guided.phAudienceLocations' },
      { key: 'interests', label: 'guided.fInterests', kind: 'list', placeholder: 'guided.phInterests' },
      { key: 'languages', label: 'guided.fLanguages', kind: 'list', placeholder: 'guided.phLanguages' },
    ],
  },
  {
    key: 'commercial', title: 'guided.secCommercial', hint: 'guided.secCommercialHint',
    fields: [
      { key: 'usageRights', label: 'guided.fUsageRights', kind: 'text', placeholder: 'guided.phUsageRights', why: 'guided.whyUsageRights' },
      { key: 'licensingDays', label: 'guided.fLicensingDays', kind: 'number', min: 1, max: 3650 },
      { key: 'exclusivity', label: 'guided.fExclusivity', kind: 'bool', why: 'guided.whyExclusivity' },
      { key: 'exclusivityDays', label: 'guided.fExclusivityDays', kind: 'number', min: 1, max: 365 },
    ],
  },
  {
    key: 'approval', title: 'guided.secApproval', hint: 'guided.secApprovalHint',
    fields: [
      { key: 'draftRequired', label: 'guided.fDraftRequired', kind: 'bool', why: 'guided.whyDraftRequired' },
      { key: 'revisionRounds', label: 'guided.fRevisionRounds', kind: 'number', min: 0, max: 10 },
      { key: 'approvalDeadline', label: 'guided.fApprovalDeadline', kind: 'date' },
      { key: 'reportingRequired', label: 'guided.fReporting', kind: 'bool', why: 'guided.whyReporting' },
      { key: 'notes', label: 'guided.fNotes', kind: 'longtext' },
    ],
  },
];

function filled(v: unknown): boolean {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.values(v as Record<string, unknown>).some(filled);
  if (typeof v === 'string') return v.trim().length > 0;
  return true;
}

// creatorsVisit lives in brief.content but is the "visit" answer, not an
// advanced requirement — never counts as a filled section.
function sectionValue(brief: CampaignBrief, key: keyof CampaignBrief): unknown {
  const v = brief[key];
  if (key === 'content' && v && typeof v === 'object') {
    const rest = { ...(v as Record<string, unknown>) };
    delete rest.creatorsVisit;
    return rest;
  }
  return v;
}

export function sectionFilled(brief: CampaignBrief, key: keyof CampaignBrief): boolean {
  return filled(sectionValue(brief, key));
}

export function countFilledSections(brief: CampaignBrief | null | undefined): number {
  if (!brief) return 0;
  return BRIEF_SECTIONS.filter((s) => sectionFilled(brief, s.key)).length + (filled(brief.attachments) ? 1 : 0);
}

// Deliverable content formats (backend DELIVERABLE_ITEM_TYPES) with the
// platforms each one belongs to — keeps the editor's platform list sensible.
export const DELIVERABLE_TYPES: { type: string; platforms: string[] }[] = [
  { type: 'REEL', platforms: ['Instagram', 'Facebook'] },
  { type: 'TIKTOK_VIDEO', platforms: ['TikTok'] },
  { type: 'STORY', platforms: ['Instagram', 'Facebook'] },
  { type: 'PHOTO_POST', platforms: ['Instagram', 'Facebook'] },
  { type: 'YOUTUBE_SHORT', platforms: ['YouTube'] },
  { type: 'YOUTUBE_VIDEO', platforms: ['YouTube'] },
  { type: 'UGC_VIDEO', platforms: [] },
  { type: 'PRODUCT_REVIEW', platforms: ['Instagram', 'TikTok', 'YouTube', 'Facebook'] },
  { type: 'EVENT_COVERAGE', platforms: ['Instagram', 'TikTok', 'YouTube', 'Facebook'] },
  { type: 'GOOGLE_REVIEW', platforms: ['Google'] },
  { type: 'BLOG_POST', platforms: [] },
  { type: 'LIVE_STREAM', platforms: ['Instagram', 'TikTok', 'YouTube', 'Facebook'] },
];

// Platform worth showing next to a deliverable — hidden when the content type
// already implies it ("TikTok video · TikTok").
export function shownPlatform(type: string, platform?: string | null): string | null {
  if (!platform) return null;
  const def = DELIVERABLE_TYPES.find((d) => d.type === type);
  return def && def.platforms.length === 1 && def.platforms[0] === platform ? null : platform;
}
