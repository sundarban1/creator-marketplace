import { request } from '@/lib/api';

// Guided campaign creator endpoints (backend: campaign drafts/validate/publish
// + campaign-ai recommend/improve/ask). Works on the raw API campaign shape —
// the creator needs every field, not the display-mapped `Campaign` type.

export type LocationScope = 'SPECIFIC' | 'NATIONWIDE' | 'ANYWHERE';
export type Provenance = 'USER' | 'AI_EXTRACTED' | 'AI_SUGGESTED';
export interface CampaignLocation { name: string; lat?: number | null; lng?: number | null }
export interface DeliverableItem {
  type: string;
  platform?: string | null;
  quantity: number;
  format?: string | null;
  durationSec?: number | null;
  notes?: string | null;
}
export interface CampaignBrief {
  audience?: { ageMin?: number | null; ageMax?: number | null; genders?: string[]; locations?: string[]; interests?: string[]; languages?: string[]; notes?: string };
  creatorRequirements?: { tiers?: ('NANO' | 'MICRO' | 'MID' | 'MACRO')[]; minEngagementRate?: number | null; languages?: string[]; notes?: string };
  content?: { keyMessages?: string[]; talkingPoints?: string[]; mentions?: string[]; contentStyle?: string; dos?: string[]; donts?: string[]; productInfo?: string; creatorsVisit?: boolean | null };
  commercial?: { usageRights?: string; licensingDays?: number | null; exclusivity?: boolean; exclusivityDays?: number | null };
  approval?: { draftRequired?: boolean; revisionRounds?: number | null; approvalDeadline?: string | null; reportingRequired?: boolean; notes?: string };
  attachments?: { url: string; name: string }[];
}

/** Raw campaign as the API returns it (fields the guided creator reads). */
export interface GuidedCampaign {
  id: string;
  title: string;
  description: string;
  category: string;
  goals?: string[];
  platforms: string[];
  status: string;
  campaignType?: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
  creatorsNeeded?: number;
  location?: string | null;
  locationType?: 'ONSITE' | 'REMOTE' | null;
  locations?: CampaignLocation[];
  locationScope?: LocationScope;
  deliverableItems?: DeliverableItem[];
  brief?: CampaignBrief;
  budgetMin: number;
  budgetMax: number;
  budgetRateType?: 'FIXED' | 'RANGE' | null;
  budgetInputType?: 'PER_CREATOR' | 'TOTAL' | null;
  paymentType?: string;
  deadline: string;
  startDate?: string | null;
  applicationDeadline?: string | null;
  minFollowers?: number;
  hashtags?: string[];
  featureImageUrl?: string | null;
  aiPrompt?: string | null;
  aiGenerated?: boolean;
  aiProvenance?: Record<string, Provenance>;
  draftStep?: string | null;
  updatedAt?: string | null;
}

export interface GuidedDraftPayload {
  title?: string;
  description?: string;
  featureImageUrl?: string | null;
  category?: string;
  goals?: string[];
  platforms?: string[];
  minFollowers?: number;
  deadline?: string;
  locationType?: 'ONSITE' | 'REMOTE';
  budgetMin?: number;
  budgetMax?: number;
  budgetRateType?: 'FIXED' | 'RANGE';
  budgetInputType?: 'PER_CREATOR' | 'TOTAL';
  paymentType?: string;
  creatorsNeeded?: number;
  hashtags?: string[];
  aiGenerated?: boolean;
  aiPrompt?: string;
  locations?: CampaignLocation[];
  locationScope?: LocationScope;
  deliverableItems?: DeliverableItem[];
  brief?: CampaignBrief;
  startDate?: string | null;
  applicationDeadline?: string | null;
  aiProvenance?: Record<string, Provenance>;
  draftStep?: string | null;
}

export interface AiClarifyingQuestion {
  id: 'CREATORS_VISIT' | 'LOCATION';
  field: string;
  question: string;
  options: { value: string; label: string }[];
  suggested: string | null;
}

/** /ai/generate response, including the guided-creator `guided` block. */
export interface GuidedAiDraft {
  title: string;
  description: string;
  category: string;
  platform: string;
  goal?: string;
  creatorsNeeded: number;
  budgetStatus: 'STATED_PER_CREATOR' | 'STATED_TOTAL' | 'AMBIGUOUS' | 'NOT_STATED';
  statedAmount: number | null;
  budgetRateType: 'FIXED' | 'RANGE';
  budgetMin: number;
  budgetMax: number;
  hashtags: string[];
  featureImageUrl?: string | null;
  aiFallback?: boolean;
  guided?: {
    locations: { name: string }[];
    locationScope: LocationScope | null;
    locationType: 'ONSITE' | 'REMOTE' | null;
    deliverableItems: DeliverableItem[];
    startDate: string | null;
    deadline: string;
    minFollowers: number;
    brief: CampaignBrief;
    aiProvenance: Record<string, Provenance>;
    missingInformation: string[];
    clarifyingQuestions: AiClarifyingQuestion[];
    suggestions: { field: string; value: unknown; reason: string }[];
  };
}

export interface GuidedAiContext {
  title?: string;
  description?: string;
  category?: string;
  goal?: string;
  platforms?: string[];
  creatorsNeeded?: number;
  budgetMin?: number;
  budgetMax?: number;
  locations?: { name: string }[];
  locationType?: 'ONSITE' | 'REMOTE';
  deliverableItems?: { type: string; platform?: string | null; quantity: number }[];
  deadline?: string;
}

export type RecommendField = 'creatorsNeeded' | 'budget' | 'deliverables';

export interface SystemTemplate { key: string; icon: string; name: string; summary: string }
export interface MyTemplate { id: string; name: string; summary: string | null; sourceCampaignId: string | null; updatedAt: string }

// The AI draft takes 10–20s server-side; match the existing create flow's
// generous client deadline (campaignService.generateWithAi).
const AI_TIMEOUT_MS = 80_000;

export const guidedCampaignService = {
  async generate(prompt: string, inputSource: 'voice' | 'text'): Promise<GuidedAiDraft> {
    const res = await request<GuidedAiDraft>('POST', '/api/campaigns/ai/generate', { prompt, inputSource }, undefined, AI_TIMEOUT_MS);
    return res.data;
  },
  async getCampaign(id: string): Promise<GuidedCampaign> {
    return (await request<GuidedCampaign>('GET', `/api/campaigns/${id}`)).data;
  },
  async createDraft(body: GuidedDraftPayload): Promise<GuidedCampaign> {
    return (await request<GuidedCampaign>('POST', '/api/campaigns/drafts', body)).data;
  },
  async saveDraft(id: string, body: GuidedDraftPayload): Promise<GuidedCampaign> {
    return (await request<GuidedCampaign>('PATCH', `/api/campaigns/drafts/${id}`, body)).data;
  },
  async latestDraft(): Promise<GuidedCampaign | null> {
    return (await request<GuidedCampaign | null>('GET', '/api/campaigns/drafts/latest')).data;
  },
  async publishDraft(id: string): Promise<GuidedCampaign> {
    return (await request<GuidedCampaign>('POST', `/api/campaigns/drafts/${id}/publish`)).data;
  },
  async update(id: string, body: Record<string, unknown>): Promise<GuidedCampaign> {
    return (await request<GuidedCampaign>('PUT', `/api/campaigns/${id}`, body)).data;
  },
  async deleteCampaign(id: string): Promise<void> {
    await request('DELETE', `/api/campaigns/${id}`);
  },
  async recommend<T>(field: RecommendField, draft: GuidedAiContext): Promise<{ value: T; reason: string; estimate: boolean }> {
    return (await request<{ value: T; reason: string; estimate: boolean }>('POST', '/api/campaigns/ai/recommend', { field, draft })).data;
  },
  async improve(field: 'idea' | 'description', text: string, draft: GuidedAiContext): Promise<string | null> {
    return (await request<{ suggestion: string | null }>('POST', '/api/campaigns/ai/improve', { field, text, draft })).data.suggestion;
  },
  /** "Ask Kolab" (§17) — one question about the campaign so far. */
  async ask(question: string, step: string, draft: GuidedAiContext): Promise<{ answer: string; fallback: boolean }> {
    return (await request<{ answer: string; fallback: boolean }>('POST', '/api/campaigns/ai/ask', { question, step, draft }, undefined, AI_TIMEOUT_MS)).data;
  },
  // ── Templates (§23) ──
  async templates(): Promise<{ system: SystemTemplate[]; mine: MyTemplate[] }> {
    return (await request<{ system: SystemTemplate[]; mine: MyTemplate[] }>('GET', '/api/campaigns/templates')).data;
  },
  async saveTemplate(campaignId: string, name: string): Promise<{ id: string; name: string }> {
    return (await request<{ id: string; name: string }>('POST', '/api/campaigns/templates', { campaignId, name })).data;
  },
  async deleteTemplate(id: string): Promise<void> {
    await request('DELETE', `/api/campaigns/templates/${id}`);
  },
  /** New draft from a built-in template, a saved template, or a past campaign. */
  async draftFrom(source: 'system' | 'template' | 'campaign', id: string): Promise<GuidedCampaign> {
    return (await request<GuidedCampaign>('POST', '/api/campaigns/drafts/from', { source, id })).data;
  },
  async platforms(): Promise<string[]> {
    return (await request<string[]>('GET', '/api/campaigns/platforms')).data;
  },
};
