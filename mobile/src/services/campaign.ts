import { request, API_BASE, ensureFreshAccessToken, getApiLanguage } from '@/lib/api';
import type { ApiCampaign } from '@/lib/api';
import type { Campaign, EventQuestion } from '@/types';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { startBackgroundChunkedUpload } from '@/services/backgroundVideoUploadManager';
import type { VideoUploadPlan } from '@/services/cloudinaryVideoUpload';
import type { PickedFile } from '@/utilities/chatAttachments';
import type { ApiReviewReceived } from '@/services/creator';
import { storage } from '@/utilities/storage';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/utilities/constants';

// Submission-side work status. Widened for the escrow state machine —
// REVISION/CONTENT_OVERDUE/CREATOR_FAILED are backend-only automatic states the
// UI should treat gracefully (see engagementState for the single label to
// switch on).
export type WorkStatusValue =
  | 'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED'
  | 'DISPUTED' | 'REVISION' | 'CONTENT_OVERDUE' | 'CREATOR_FAILED';

// The single derived engagement label emitted by the backend
// (application-state-machine.deriveEngagementState). Prefer switching on this.
export type EngagementStateValue =
  | 'PROPOSAL_PENDING' | 'PROPOSAL_REJECTED' | 'PROPOSAL_EXPIRED' | 'PROPOSAL_WITHDRAWN'
  | 'CREATOR_SELECTED' | 'PAYMENT_EXPIRED' | 'ESCROW_FUNDED' | 'CREATOR_CONFIRMATION_EXPIRED'
  | 'IN_PROGRESS' | 'REVISION_REQUESTED' | 'CONTENT_OVERDUE' | 'CREATOR_FAILED'
  | 'BUSINESS_REVIEW' | 'PAYMENT_RELEASE_PENDING' | 'DISPUTED'
  | 'PAYMENT_RELEASED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'CANCELLED' | 'COMPLETED';

export interface EngagementDispute {
  status: string;
  reason: string;
  raisedByRole: string;
  resolution: string | null;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface DeliverableVideo {
  publicId:    string;
  url:         string;
  // Cloudinary derives this automatically. For an R2-stored video it's the
  // client's own locally-extracted poster frame (see
  // createDeliverableVideoUploadTask below) — absent if that best-effort
  // upload failed or was skipped.
  thumbnailUrl?: string;
  durationSec: number;
  format:      string;
  sizeBytes:   number;
  label:       string;
  uploadedAt:  string;
  // Server-verified, defaults to READY for entries persisted before this field
  // existed. See backend's VideoAssetStatus for why PROCESSING/READY both
  // currently resolve within the same request (no async job exists yet).
  status:      'PROCESSING' | 'READY' | 'FAILED';
}

export interface DeliverableFile {
  id:               string;
  publicId:         string;
  url:              string;
  fileType:         'IMAGE' | 'DOCUMENT';
  originalFileName: string;
  mimeType:         string;
  sizeBytes:        number;
  uploadedAt:       string;
}

export interface AiRequirementDraft {
  category: string;
  categoryId: string;
  quantity: number;
  budgetType: 'FIXED' | 'RANGE' | 'NEGOTIABLE';
  budgetFixed?: number;
  budgetMin?: number;
  budgetMax?: number;
  deliverables: Record<string, number>;
  // Free-text brief of what this role should do — only meaningful for
  // non-Content-Creator roles (Content Creator roles use `deliverables` instead).
  description: string;
  completionType: 'SERVICE' | 'DELIVERABLE';
  completionReason: string;
}

export interface AiCampaignDraft {
  title: string;
  description: string;
  category: string;
  platforms: string[];
  goal: string;
  suggestedDurationDays: number;
  creatorsNeeded: number;
  budgetMin: number;
  budgetMax: number;
  paymentType: string;
  deliverables: Record<string, number>;
  hashtags: string[];
  sampleCaption: string;
  location: string | null;
  completionType: 'SERVICE' | 'DELIVERABLE';
  completionReason: string;
  needsInput: string[];
  aiSuggestedCategories: string[];
  // Empty for the common single-role case — populated only when the AI
  // detected the brief clearly asks for multiple distinct provider types.
  requirements: AiRequirementDraft[];
  // A real stock photo the backend found for this draft's subject (the model
  // returns a search phrase, the backend resolves it — see utils/imageSearch.ts
  // there). Null whenever the backend has no UNSPLASH_ACCESS_KEY configured or
  // the search came back empty, in which case the local category/keyword photo
  // map in features/creator/data/templateImages.ts takes over.
  featureImageUrl?: string | null;
  // true when the backend's own OpenAI call failed and it served a canned
  // template instead (see campaign-ai.service.ts). Optional so an older
  // backend that doesn't send it is simply treated as a real AI draft.
  aiFallback?: boolean;
}

export interface AiEventDraft {
  title: string;
  description: string;
  category: string;
  platforms: string[];
  benefits: string[];
  // What the business wants back from attendees — ['Just attend & share
  // organically'] alone means no content is expected (expectedContent stays '').
  exchangeType: string[];
  expectedContent: string;
  capacity: number;
  location: string | null;
  // The specific place named in the prompt ("our Durbarmarg outlet"), as
  // opposed to `location`, which is the broader city/area. Null when the brand
  // didn't name one.
  venue: string | null;
  // Calendar date the AI resolved from what the brand actually said about
  // timing ("this Saturday", "on the 14th"), as YYYY-MM-DD — null when no
  // timing was mentioned, in which case the flow keeps its own default.
  eventDate: string | null;
  // 24-hour HH:MM start time, null when the brand didn't state one.
  eventTime: string | null;
  completionType: 'SERVICE' | 'DELIVERABLE';
  completionReason: string;
  needsInput: string[];
  aiSuggestedCategories: string[];
  // See AiCampaignDraft.featureImageUrl.
  featureImageUrl?: string | null;
  // See AiCampaignDraft.aiFallback.
  aiFallback?: boolean;
}

// Draft generation runs well past the shared request() default of 30s, and this
// deadline has to stay ABOVE the backend's own OpenAI budget (~71s worst case,
// see REQUEST_TIMEOUT_MS in campaign-ai.service.ts). If the phone gives up
// first, the brand gets this file's caller-side generic template instead of the
// closer-to-right draft the server was still assembling.
const AI_DRAFT_TIMEOUT_MS = 80_000;

// A voice prompt is a Whisper transcription of up to a 2-minute recording, and
// the backend accepts 2,500 characters (see generateCampaignSchema). Clamping
// here rather than letting an over-long transcript come back as a plain 400 —
// which the create-event screen can only read as "the request never came back"
// and answer with a fabricated template. Trimming at a sentence boundary keeps
// the brand's opening description, which carries the intent, intact.
export const MAX_AI_PROMPT_CHARS = 2400;

export function clampAiPrompt(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_AI_PROMPT_CHARS) return trimmed;
  const head = trimmed.slice(0, MAX_AI_PROMPT_CHARS);
  const lastBreak = Math.max(head.lastIndexOf('. '), head.lastIndexOf('। '), head.lastIndexOf('? '), head.lastIndexOf('! '));
  return (lastBreak > MAX_AI_PROMPT_CHARS * 0.6 ? head.slice(0, lastBreak + 1) : head).trim();
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, string> = {
  Instagram:    '📸',
  TikTok:       '🎵',
  YouTube:      '▶️',
  'Twitter / X': '🐦',
  LinkedIn:     '💼',
};

function formatBudget(min: number, max: number, paymentType?: string): string {
  if (paymentType === 'Product Exchange' || (min === 0 && max === 0)) return 'Free Product Exchange';
  const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;
  return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function mapStatus(s: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'EXPIRED'): Campaign['status'] {
  if (s === 'ACTIVE') return 'active';
  if (s === 'CLOSED') return 'closed';
  if (s === 'PENDING_APPROVAL') return 'pending_approval';
  if (s === 'EXPIRED') return 'expired';
  return 'draft'; // DRAFT and PAUSED both surface as 'draft' in the mobile UI
}

function isNewCampaign(createdAt: string): boolean {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  return diffMs < 7 * 24 * 60 * 60 * 1000; // within last 7 days
}

// ── Transformer ────────────────────────────────────────────────────────────────

export function toCampaign(api: ApiCampaign): Campaign {
  return {
    id:           api.id,
    title:        api.title,
    description:  api.description,
    deliverables: api.deliverables,
    paymentType:  api.paymentType,
    brand:        api.business.businessName,
    brandLogoUrl: api.business.logoUrl ?? undefined,
    platforms:     api.platforms,
    platformIcons: api.platforms.map((p) => PLATFORM_ICONS[p] ?? '📱'),
    budget:       formatBudget(api.budgetMin, api.budgetMax, api.paymentType),
    budgetRaw:    api.budgetMin,
    budgetMax:    api.budgetMax,
    template:     api.template ?? undefined,
    featureImageUrl: api.featureImageUrl ?? undefined,
    category:     api.category,
    categoryKey:  api.categoryKey,
    goals:        Array.isArray(api.goals) ? api.goals : [],
    minFollowers:    formatFollowers(api.minFollowers),
    minFollowersRaw: api.minFollowers,
    deadline:     api.deadline,
    contentType:  api.contentType,
    proposals:    api._count?.applications ?? 0,
    recentProposals: api.recentProposals,
    isNew:        isNewCampaign(api.createdAt),
    isFeatured:   api.isFeatured,
    status:       mapStatus(api.status),
    location:     api.location ?? undefined,
    locationLat:  api.locationLat ?? null,
    locationLng:  api.locationLng ?? null,
    locationType: api.locationType ?? 'ONSITE',
    createdAt:    api.createdAt,
    campaignType:  (api as any).campaignType ?? 'PAID_CAMPAIGN',
    eventStatus:   (api as any).eventStatus,
    capacity:      (api as any).capacity,
    eventDate:     (api as any).eventDate,
    eventTime:     (api as any).eventTime ?? null,
    venue:         (api as any).venue ?? undefined,
    benefits:      Array.isArray((api as any).benefits) ? (api as any).benefits : [],
    paymentStatus: api.paymentStatus ?? 'UNPAID',
    paidAt:        api.paidAt ?? null,
    creatorsNeeded: api.creatorsNeeded,
    targetAudience:       api.targetAudience ?? [],
    hashtags:             api.hashtags ?? [],
    sampleCaption:        api.sampleCaption ?? undefined,
    aiGenerated:           api.aiGenerated ?? false,
    aiSuggestedCategories: api.aiSuggestedCategories ?? [],
    distanceKm:            api.distanceKm,
    requirements:          api.requirements,
    completionType:   api.completionType ?? null,
    completionReason: api.completionReason ?? null,
  };
}

function toApiStatus(s: Campaign['status']): 'ACTIVE' | 'PAUSED' | 'CLOSED' {
  if (s === 'active') return 'ACTIVE';
  if (s === 'closed') return 'CLOSED';
  return 'PAUSED';
}

// ── Service ─────────────────────────────────────────────────────────────────────

export const campaignService = {
  async listMy(params?: {
    page?:   number;
    limit?:  number;
    status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'CANCELLED';
    search?: string;
  }): Promise<{ campaigns: Campaign[]; total: number }> {
    const res = await request<ApiCampaign[]>('GET', '/api/campaigns/my', undefined, {
      page:   params?.page  ?? 1,
      limit:  params?.limit ?? 50,
      status: params?.status,
      search: params?.search?.trim() || undefined,
    });
    return {
      campaigns: res.data.map((c) => toCampaign({ ...c, business: c.business ?? { businessName: '', logoUrl: null } })),
      total:     res.pagination?.total ?? res.data.length,
    };
  },

  async list(params?: {
    search?:       string;
    category?:     string[];
    platform?:     string[];
    minBudget?:    number;
    maxBudget?:    number;
    isFeatured?:   boolean;
    dateFrom?:     Date;
    dateTo?:       Date;
    campaignType?: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
    page?:         number;
    limit?:        number;
  }): Promise<{ campaigns: Campaign[]; total: number; page: number; totalPages: number }> {
    const res = await request<ApiCampaign[]>('GET', '/api/campaigns', undefined, {
      search:       params?.search   || undefined,
      category:     params?.category?.length ? params.category.join(',') : undefined,
      platform:     params?.platform?.length ? params.platform.join(',') : undefined,
      minBudget:    params?.minBudget,
      maxBudget:    params?.maxBudget,
      isFeatured:   params?.isFeatured !== undefined ? String(params.isFeatured) : undefined,
      deadlineFrom: params?.dateFrom?.toISOString(),
      deadlineTo:   params?.dateTo?.toISOString(),
      campaignType: params?.campaignType,
      page:         params?.page  ?? 1,
      limit:        params?.limit ?? 50,
    });
    return {
      campaigns:  res.data.map(toCampaign),
      total:      res.pagination?.total      ?? res.data.length,
      page:       res.pagination?.page       ?? 1,
      totalPages: res.pagination?.totalPages ?? 1,
    };
  },

  // Backend-scored fit against the creator's own categories/platforms/budget/
  // location (see CampaignService.getRecommendedForCreator) — for the
  // creator home page's "Recommended Opportunities" rail. Not paginated,
  // just a fixed-size best-match list, so no `page`/`total` in the return.
  async recommended(params?: { limit?: number }): Promise<{ campaigns: Campaign[] }> {
    const res = await request<ApiCampaign[]>('GET', '/api/campaigns/recommended', undefined, {
      limit: params?.limit ?? 10,
    });
    return { campaigns: res.data.map(toCampaign) };
  },

  async nearby(params: {
    lat: number;
    lng: number;
    radiusKm?: number;
    search?:   string;
    category?: string[];
    platform?: string[];
    page?:     number;
    limit?:    number;
  }): Promise<{ campaigns: Campaign[]; total: number; page: number; totalPages: number }> {
    const res = await request<ApiCampaign[]>('GET', '/api/campaigns/nearby', undefined, {
      lat:      params.lat,
      lng:      params.lng,
      radiusKm: params.radiusKm ?? 25,
      search:   params.search || undefined,
      category: params.category?.length ? params.category.join(',') : undefined,
      platform: params.platform?.length ? params.platform.join(',') : undefined,
      page:     params.page  ?? 1,
      limit:    params.limit ?? 10,
    });
    return {
      campaigns:  res.data.map(toCampaign),
      total:      res.pagination?.total      ?? res.data.length,
      page:       res.pagination?.page       ?? 1,
      totalPages: res.pagination?.totalPages ?? 1,
    };
  },

  // The creator's own shortlist ("saved events"), newest-saved first. Ids for
  // the card/detail bookmark icons come from useShortlistedCampaigns instead —
  // this is the full list, for the Saved Events screen.
  async listShortlisted(): Promise<{ campaigns: Campaign[] }> {
    const res = await request<{ campaigns: ApiCampaign[] }>('GET', '/api/creator/campaigns/shortlist/list');
    return { campaigns: res.data.campaigns.map(toCampaign) };
  },

  async getById(id: string): Promise<Campaign> {
    const res = await request<ApiCampaign>('GET', `/api/campaigns/${id}`);
    return toCampaign(res.data);
  },

  // Free-event Q&A ("Ask Organizer"). Shared page — readable by the owning
  // business and every accepted creator; only accepted creators post questions,
  // only the business answers. 403 for anyone else.
  async getEventQuestions(campaignId: string): Promise<EventQuestion[]> {
    const res = await request<EventQuestion[]>('GET', `/api/campaigns/${campaignId}/questions`);
    return res.data;
  },

  async askEventQuestion(campaignId: string, question: string): Promise<void> {
    await request('POST', `/api/campaigns/${campaignId}/questions`, { question });
  },

  async answerEventQuestion(campaignId: string, questionId: string, answer: string): Promise<void> {
    await request('PUT', `/api/campaigns/${campaignId}/questions/${questionId}/answer`, { answer });
  },

  // The confirmed creator's dynamic open-event invitation PNG. 404 unless the
  // caller is an ACCEPTED creator on this OPEN_EVENT. The backend renders on
  // demand if it was never generated, so this can be a little slow the first time.
  async getEventInvitation(campaignId: string): Promise<{ imageUrl: string; format: string; width: number; height: number; version: number }> {
    const res = await request<{ invitation: { imageUrl: string; format: string; width: number; height: number; version: number } }>(
      'GET', `/api/campaigns/${campaignId}/invitation`,
    );
    return res.data.invitation;
  },

  async apply(campaignId: string, payload: {
    coverLetter:  string;
    proposedRate: number;
    timeline:     string;
    socialHandles?: Record<string, string>;
    portfolioUrl?:  string;
    // Which role on a multi-role campaign this application is for — omit
    // for the simple single-category campaigns every existing campaign uses.
    requirementId?: string;
  }): Promise<void> {
    await request('POST', `/api/campaigns/${campaignId}/apply`, payload);
  },

  async getFeaturedQuota(): Promise<{ paywallEnabled: boolean; freeQuota: number; used: number; remaining: number; price: number; unlimited: boolean }> {
    const res = await request<{ paywallEnabled: boolean; freeQuota: number; used: number; remaining: number; price: number; unlimited: boolean }>('GET', '/api/campaigns/featured-quota');
    return res.data;
  },

  async create(data: {
    title: string;
    description: string;
    template?: string;
    featureImageUrl?: string;
    category: string;
    goals?: string[];
    platforms: string[];
    minFollowers: number;
    contentType: string;
    deliverables: string;
    deadline: string;
    location?: string;
    locationLat?: number;
    locationLng?: number;
    locationType?: 'ONSITE' | 'REMOTE';
    budgetMin: number;
    budgetMax: number;
    paymentType: string;
    creatorsNeeded?: number;
    isFeatured?: boolean;
    campaignType?: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
    capacity?:     number;
    eventDate?:    string;
    eventTime?:    string;
    venue?:        string;
    benefits?:     string[];
    status?:               'DRAFT' | 'ACTIVE';
    targetAudience?:       string[];
    hashtags?:             string[];
    sampleCaption?:        string;
    aiGenerated?:           boolean;
    aiPrompt?:              string;
    aiSuggestedCategories?: string[];
    // Omit for the single-role campaigns every existing campaign uses — see
    // CampaignRequirement. When present, category/budgetMin/budgetMax/
    // creatorsNeeded above are still sent as an informational summary.
    requirements?: {
      categoryId: string;
      quantity: number;
      budgetType: 'FIXED' | 'RANGE' | 'NEGOTIABLE';
      budgetFixed?: number;
      budgetMin?: number;
      budgetMax?: number;
      deliverables?: string;
      deadline?: string;
    }[];
  }): Promise<Campaign> {
    const res = await request<ApiCampaign>('POST', '/api/campaigns', data);
    return toCampaign(res.data);
  },

  async generateWithAi(prompt: string, inputSource?: 'voice' | 'text'): Promise<AiCampaignDraft> {
    const res = await request<AiCampaignDraft>('POST', '/api/campaigns/ai/generate', { prompt, inputSource }, undefined, AI_DRAFT_TIMEOUT_MS);
    return res.data;
  },

  async generateEventWithAi(prompt: string, inputSource?: 'voice' | 'text'): Promise<AiEventDraft> {
    const res = await request<AiEventDraft>('POST', '/api/campaigns/ai/generate-event', { prompt, inputSource }, undefined, AI_DRAFT_TIMEOUT_MS);
    return res.data;
  },

  async suggestDescription(input: {
    title?:        string;
    category?:     string;
    platform?:     string;
    deliverables?: string;
  }): Promise<string> {
    const res = await request<{ description: string }>('POST', '/api/campaigns/ai/suggest-description', input);
    return res.data.description;
  },

  async update(id: string, data: {
    title?: string;
    description?: string;
    featureImageUrl?: string | null;
    template?: string;
    category?: string;
    goals?: string[];
    platforms?: string[];
    minFollowers?: number;
    contentType?: string;
    deliverables?: string;
    targetAudience?: string[];
    hashtags?: string[];
    paymentType?: string;
    status?: Campaign['status'];
    budgetMin?: number;
    budgetMax?: number;
    creatorsNeeded?: number;
    deadline?: string;
    location?: string | null;
    locationLat?: number | null;
    locationLng?: number | null;
    locationType?: 'ONSITE' | 'REMOTE';
    isFeatured?: boolean;
    campaignType?: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
    capacity?: number;
    eventDate?: string;
    // "HH:mm". Locked by the backend once a creator is confirmed — only send
    // it while the edit screen still allows changing it. null clears it.
    eventTime?: string | null;
    venue?: string | null;
    benefits?: string[];
    eventStatus?: 'OPEN' | 'FULL' | 'CLOSED';
    // Locked by the backend once proposals exist (it decides whether the
    // provider is ever asked to upload anything) — only send it while the
    // edit screen still allows changing it.
    completionType?: 'SERVICE' | 'DELIVERABLE';
    completionReason?: string;
  }): Promise<void> {
    await request('PUT', `/api/campaigns/${id}`, {
      ...data,
      status: data.status !== undefined ? toApiStatus(data.status) : undefined,
    });
  },

  async getBusinessProposals(params?: {
    page?: number;
    limit?: number;
    status?: 'PENDING' | 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
    campaignType?: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
  }): Promise<{
    proposals: Array<{
      id: string;
      status: 'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'expired';
      workStatus: WorkStatusValue;
      // The application's own payment status — distinct from campaign.paymentStatus,
      // which tracks the campaign record itself and isn't updated by the per-application
      // pay/release flow. Use this one to know if THIS creator's payment was released.
      paymentStatus: 'UNPAID' | 'PAID' | 'RELEASED';
      proposedRate: string;
      coverLetter: string;
      createdAt: string;
      campaign: {
        id: string; title: string; platforms: string[];
        campaignType: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
        paymentStatus: 'UNPAID' | 'PAID' | 'RELEASED';
        featureImageUrl?: string;
      };
      creator: { id: string; fullName: string; avatarUrl: string | null; location: string | null };
    }>;
    total: number;
  }> {
    const res = await request<Array<{
      id: string; status: string; proposedRate: number; coverLetter: string; createdAt: string;
      workStatus?: string;
      paymentStatus?: string;
      campaign: { id: string; title: string; platforms: string[]; campaignType?: string; paymentStatus?: string; featureImageUrl?: string | null };
      creator: { id: string; fullName: string; avatarUrl: string | null; location: string | null };
    }>>('GET', '/api/campaigns/applications/business', undefined, {
      page:         params?.page  ?? 1,
      limit:        params?.limit ?? 50,
      status:       params?.status,
      campaignType: params?.campaignType,
    });
    return {
      proposals: res.data.map((a) => ({
        id: a.id,
        status: a.status.toLowerCase() as 'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'expired',
        workStatus: (a.workStatus ?? 'NONE') as WorkStatusValue,
        paymentStatus: (a.paymentStatus ?? 'UNPAID') as 'UNPAID' | 'PAID' | 'RELEASED',
        proposedRate: `Rs. ${a.proposedRate.toLocaleString()}`,
        coverLetter: a.coverLetter ?? '',
        createdAt: a.createdAt,
        campaign: {
          id: a.campaign.id,
          title: a.campaign.title,
          platforms: a.campaign.platforms,
          campaignType: (a.campaign.campaignType ?? 'PAID_CAMPAIGN') as 'PAID_CAMPAIGN' | 'OPEN_EVENT',
          paymentStatus: (a.campaign.paymentStatus ?? 'UNPAID') as 'UNPAID' | 'PAID' | 'RELEASED',
          featureImageUrl: a.campaign.featureImageUrl ?? undefined,
        },
        creator: a.creator,
      })),
      total: res.pagination?.total ?? res.data.length,
    };
  },

  async payForCampaign(campaignId: string, method: string): Promise<void> {
    await request('POST', `/api/campaigns/${campaignId}/pay`, { method });
  },

  async payForApplication(appId: string, method?: string): Promise<void> {
    await request('PUT', `/api/campaigns/applications/${appId}/pay`, method ? { method } : undefined);
  },

  // Khalti only (see getTiktokAuthorizeUrl above for the same "backend hands
  // back a browser URL, we open it, the redirect lands on our API" pattern) —
  // other payment methods still go through the mock payForApplication above.
  async initiateKhaltiPayment(appId: string): Promise<string> {
    const res = await request<{ paymentUrl: string }>('POST', `/api/campaigns/applications/${appId}/pay/khalti/initiate`);
    return res.data.paymentUrl;
  },

  // eSewa — same "backend hands back a browser URL, we open it, the redirect
  // lands on our API" pattern as Khalti above.
  async initiateEsewaPayment(appId: string): Promise<string> {
    const res = await request<{ paymentUrl: string }>('POST', `/api/campaigns/applications/${appId}/pay/esewa/initiate`);
    return res.data.paymentUrl;
  },

  async submitWork(appId: string, data: { note?: string; urls?: string }): Promise<void> {
    await request('PUT', `/api/campaigns/applications/${appId}/submit`, data);
  },

  // ── Deliverable videos ──────────────────────────────────────────────────────
  // Mirrors chat.ts's createVideoUploadTask (signed direct-to-Cloudinary upload
  // -> verify+persist) but scoped to an application instead of a conversation,
  // with no duration cap and a 3-video ceiling enforced server-side (see
  // CampaignService.completeDeliverableVideo). Unlike chat, compression is NOT
  // done inside this task — useDeliverableVideoUploads (the queue hook) does it
  // once up front and caches the result, so a retry re-uploads the same
  // compressed file instead of recompressing the original on every attempt.

  async requestDeliverableVideoSignature(appId: string, sizeBytes: number, mimeType: string): Promise<VideoUploadPlan> {
    const res = await request<VideoUploadPlan>(
      'POST', `/api/campaigns/applications/${appId}/deliverables/video/signature`,
      { sizeBytes, mimeType: mimeType === 'video/quicktime' ? 'video/quicktime' : 'video/mp4' },
    );
    return res.data;
  },

  async removeDeliverableVideo(appId: string, publicId: string): Promise<void> {
    await request('DELETE', `/api/campaigns/applications/${appId}/deliverables/video`, undefined, { publicId });
  },

  async renameDeliverableVideo(appId: string, publicId: string, label: string): Promise<void> {
    await request('PATCH', `/api/campaigns/applications/${appId}/deliverables/video/label`, { publicId, label });
  },

  // ── Deliverable files (images / PDF / DOCX) ─────────────────────────────────
  // XHR instead of fetch, unlike video's signed direct-to-Cloudinary flow —
  // files are <=5MB so they're proxied through the backend in one request, but
  // XHR (not fetch) is what lets onProgress report real upload percentage. The
  // optional AbortSignal is what lets useDeliverableFileUploads support
  // cancelling an in-flight upload.
  async uploadDeliverableFile(
    appId: string,
    file: PickedFile,
    signal?: AbortSignal,
    onProgress?: (fraction: number) => void,
  ): Promise<DeliverableFile> {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);

    type Result = { status: number; json: { success: boolean; data: DeliverableFile; message?: string } | null };
    const send = (token: string) => new Promise<Result>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/api/campaigns/applications/${appId}/deliverables/file`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('X-Language', getApiLanguage());

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(e.loaded / e.total);
      };
      xhr.onload = () => {
        try {
          resolve({ status: xhr.status, json: JSON.parse(xhr.responseText) });
        } catch {
          resolve({ status: xhr.status, json: null });
        }
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.onabort = () => reject(Object.assign(new Error('Upload cancelled'), { name: 'AbortError' }));

      if (signal) {
        if (signal.aborted) { xhr.abort(); return; }
        signal.addEventListener('abort', () => xhr.abort());
      }
      xhr.send(form);
    });

    // This uses a raw XHR (for real upload-progress events) instead of
    // lib/api.ts's request(), so it doesn't get that helper's refresh-on-401
    // interceptor for free — an access token that's expired/near-expiry when
    // the creator picks a file otherwise surfaces as a raw "Token has expired"
    // error with no retry. Mirror the same recovery here.
    let { status, json } = await send(storage.get(ACCESS_TOKEN_KEY) ?? '');
    if (status === 401 && storage.get(REFRESH_TOKEN_KEY)) {
      const fresh = await ensureFreshAccessToken();
      if (fresh) ({ status, json } = await send(fresh));
    }

    if (status >= 200 && status < 300 && json) return json.data;
    throw new Error(json?.message ?? 'Upload failed');
  },

  async removeDeliverableFile(appId: string, fileId: string): Promise<void> {
    await request('DELETE', `/api/campaigns/applications/${appId}/deliverables/file`, undefined, { fileId });
  },

  // `fileUri` must already be compressed (or the original, if compression is
  // skipped/failed upstream) — this signs, hands off to
  // backgroundVideoUploadManager (chunked upload via react-native-background-upload,
  // survives the app backgrounding/closing), which calls the complete endpoint
  // itself once all chunks land.
  createDeliverableVideoUploadTask(
    appId: string,
    fileUri: string,
    mimeType: string,
    onProgress: (fraction: number) => void,
    onFinalizing?: () => void,
    durationSec?: number,
  ): { start: () => Promise<DeliverableVideo>; cancel: () => void } {
    let cancelled = false;
    let innerTask: ReturnType<typeof startBackgroundChunkedUpload> | null = null;

    return {
      start: async () => {
        if (cancelled) throw new Error('Upload cancelled');
        const info = await FileSystem.getInfoAsync(fileUri);
        if (!info.exists || info.isDirectory) throw new Error('Video file could not be read for upload');
        const signature = await campaignService.requestDeliverableVideoSignature(appId, info.size, mimeType);
        if (cancelled) throw new Error('Upload cancelled');

        // Best-effort poster frame, same as chat's createVideoUploadTask — a
        // failure here (corrupt frame, unsupported codec, etc.) must never
        // block the deliverable submission itself, only the review cards end
        // up showing a plain placeholder instead of a thumbnail.
        let thumbnailUri: string | undefined;
        try {
          thumbnailUri = (await VideoThumbnails.getThumbnailAsync(fileUri, { time: 0, quality: 0.6 })).uri;
        } catch { /* proceed without a thumbnail */ }
        if (cancelled) throw new Error('Upload cancelled');

        innerTask = startBackgroundChunkedUpload(
          { targetType: 'deliverable', appId, durationSec },
          fileUri, mimeType, signature, onProgress, onFinalizing, thumbnailUri,
        );
        return await innerTask.result as DeliverableVideo;
      },
      cancel: () => { cancelled = true; innerTask?.cancel(); },
    };
  },

  async approveWork(appId: string): Promise<void> {
    await request('PUT', `/api/campaigns/applications/${appId}/approve`);
  },

  // Only callable once the application is COMPLETED — one review per rater
  // per application (backend returns 409 on a second attempt).
  async submitReview(appId: string, rating: number, comment?: string): Promise<void> {
    await request('POST', `/api/campaigns/applications/${appId}/review`, { rating, comment: comment || undefined });
  },

  // Null when the caller hasn't reviewed this application yet — not an error.
  async getMyReview(appId: string): Promise<{ id: string; rating: number; comment: string | null; createdAt: string } | null> {
    const res = await request<{ id: string; rating: number; comment: string | null; createdAt: string } | null>('GET', `/api/campaigns/applications/${appId}/review`);
    return res.data;
  },

  // The review the OTHER party left for the caller on this application — null
  // when they haven't rated yet. Powers the "review received" card + notification.
  async getReviewReceived(appId: string): Promise<ApiReviewReceived | null> {
    const res = await request<ApiReviewReceived | null>('GET', `/api/campaigns/applications/${appId}/review-received`);
    return res.data;
  },

  async requestRevision(appId: string, note: string): Promise<void> {
    await request('PUT', `/api/campaigns/applications/${appId}/request-revision`, { note });
  },

  async reportIssue(appId: string, reason: string): Promise<void> {
    await request('PUT', `/api/campaigns/applications/${appId}/report-issue`, { reason });
  },

  // Escrow state machine §27 — either the business or the accepted creator can
  // raise a dispute, which freezes the escrow until an admin resolves it. Same
  // endpoint as reportIssue; the backend infers the role from the caller.
  async raiseDispute(appId: string, reason: string): Promise<void> {
    await request('PUT', `/api/campaigns/applications/${appId}/report-issue`, { reason });
  },

  async startWork(appId: string): Promise<void> {
    await request('PUT', `/api/campaigns/applications/${appId}/start`);
  },

  async cancelCampaign(campaignId: string): Promise<void> {
    await request('PUT', `/api/campaigns/${campaignId}/cancel`);
  },

  async acceptProposal(campaignId: string, appId: string): Promise<void> {
    await request('PUT', `/api/campaigns/${campaignId}/applications/${appId}/accept`);
  },

  async rejectProposal(campaignId: string, appId: string): Promise<void> {
    await request('PUT', `/api/campaigns/${campaignId}/applications/${appId}/reject`);
  },

  // §49 — toggles PENDING <-> SHORTLISTED; returns the updated status so the
  // caller can apply it optimistically without a second round-trip.
  async shortlistProposal(campaignId: string, appId: string): Promise<{ status: string }> {
    const res = await request<{ status: string }>('PUT', `/api/campaigns/${campaignId}/applications/${appId}/shortlist`);
    return res.data;
  },

  async getApplications(campaignId: string): Promise<Array<{
    id:              string;
    status:          'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'expired';
    proposedRate:    string;
    proposedRateRaw: number;
    coverLetter:     string;
    createdAt:       string;
    workStatus:      WorkStatusValue;
    engagementState: EngagementStateValue | null;
    escrowStatus:    string | null;
    dispute:         EngagementDispute | null;
    paymentDueAt:             string | null;
    creatorConfirmationDueAt: string | null;
    contentDeadline:          string | null;
    contentGraceDeadline:     string | null;
    businessReviewDueAt:      string | null;
    paymentReleaseAt:         string | null;
    submittedLate:            boolean;
    submittedAt:     string | null;
    deliverableUrls: string | null;
    deliverableVideos: DeliverableVideo[];
    deliverableFiles: DeliverableFile[];
    paymentStatus:   'UNPAID' | 'PAID' | 'RELEASED';
    paidAt:          string | null;
    creator: { id: string; userId: string; fullName: string; avatarUrl: string | null; location: string | null };
    workNote:        string | null;
    revisionRequestedAt: string | null;
    revisionNotes:   { note: string; createdAt: string }[];
    // Which role of a multi-role campaign this application is for — null
    // for the simple single-category campaigns every existing campaign uses.
    requirementId:   string | null;
  }>> {
    const res = await request<Array<{
      id: string; status: string; proposedRate: number; coverLetter: string; createdAt: string;
      workStatus?: string; submittedAt?: string | null; deliverableUrls?: string | null;
      engagementState?: string; escrowStatus?: string; dispute?: EngagementDispute | null;
      paymentDueAt?: string | null; creatorConfirmationDueAt?: string | null;
      contentDeadline?: string | null; contentGraceDeadline?: string | null;
      businessReviewDueAt?: string | null; paymentReleaseAt?: string | null; submittedLate?: boolean;
      deliverableVideos?: DeliverableVideo[];
      deliverableFiles?: DeliverableFile[];
      paymentStatus?: string; paidAt?: string | null;
      creator: { id: string; userId: string; fullName: string; avatarUrl: string | null; location: string | null };
      workNote?: string | null; revisionRequestedAt?: string | null;
      revisionNotes?: { note: string; createdAt: string }[];
      requirementId?: string | null;
    }>>('GET', `/api/campaigns/${campaignId}/applications`);
    return res.data.map((a) => ({
      id:              a.id,
      status:          a.status.toLowerCase() as 'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'expired',
      proposedRate:    `Rs. ${a.proposedRate.toLocaleString()}`,
      proposedRateRaw: a.proposedRate,
      coverLetter:     a.coverLetter ?? '',
      createdAt:       a.createdAt,
      workStatus:      (a.workStatus ?? 'NONE') as WorkStatusValue,
      engagementState: (a.engagementState ?? null) as EngagementStateValue | null,
      escrowStatus:    a.escrowStatus ?? null,
      dispute:         a.dispute ?? null,
      paymentDueAt:             a.paymentDueAt ?? null,
      creatorConfirmationDueAt: a.creatorConfirmationDueAt ?? null,
      contentDeadline:          a.contentDeadline ?? null,
      contentGraceDeadline:     a.contentGraceDeadline ?? null,
      businessReviewDueAt:      a.businessReviewDueAt ?? null,
      paymentReleaseAt:         a.paymentReleaseAt ?? null,
      submittedLate:            a.submittedLate ?? false,
      submittedAt:     a.submittedAt ?? null,
      deliverableUrls: a.deliverableUrls ?? null,
      deliverableVideos: a.deliverableVideos ?? [],
      deliverableFiles: a.deliverableFiles ?? [],
      paymentStatus:   (a.paymentStatus ?? 'UNPAID') as 'UNPAID' | 'PAID' | 'RELEASED',
      paidAt:          a.paidAt ?? null,
      creator:         a.creator,
      workNote:        a.workNote ?? null,
      revisionRequestedAt: a.revisionRequestedAt ?? null,
      revisionNotes:   a.revisionNotes ?? [],
      requirementId:   a.requirementId ?? null,
    }));
  },

  async getMyApplications(params?: {
    page?:   number;
    limit?:  number;
    status?: 'PENDING' | 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  }): Promise<{
    proposals: Array<{
      id:               string;
      campaignId:       string;
      campaignTitle:    string;
      brand:            string;
      businessId:       string;
      status:           'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'expired';
      submittedAt:      string;
      workSubmittedAt:  string | null;
      coverLetter:      string;
      proposedRate:     string;
      proposedRateRaw:  number;
      workStatus:       WorkStatusValue;
      // Escrow state machine — the single label to drive the workspace UI off.
      engagementState:  EngagementStateValue | null;
      escrowStatus:     string | null;
      dispute:          EngagementDispute | null;
      // Absolute deadline timestamps for the stage the engagement is in (ISO,
      // null when that stage hasn't started). Never recompute from "now".
      paymentDueAt:              string | null;
      creatorConfirmationDueAt:  string | null;
      contentDeadline:           string | null;
      contentGraceDeadline:      string | null;
      businessReviewDueAt:       string | null;
      paymentReleaseAt:          string | null;
      submittedLate:             boolean;
      campaignType:     'PAID_CAMPAIGN' | 'OPEN_EVENT';
      paymentStatus:    'UNPAID' | 'PAID' | 'RELEASED';
      paidAt:           string | null;
      featureImageUrl:  string | undefined;
      deliverableUrls:  string | null;
      deliverableVideos: DeliverableVideo[];
      deliverableFiles: DeliverableFile[];
      workNote:         string | null;
      revisionRequestedAt: string | null;
      revisionNotes:    { note: string; createdAt: string }[];
      // Which role of a multi-role campaign this application is for — null
      // for the simple single-category campaigns every existing campaign uses.
      requirementId:    string | null;
    }>;
    total: number;
  }> {
    const res = await request<Array<{
      id:              string;
      status:          string;
      coverLetter:     string;
      proposedRate:    number;
      createdAt:       string;
      workStatus?:     string;
      engagementState?: string;
      escrowStatus?:   string;
      dispute?:        EngagementDispute | null;
      paymentDueAt?:              string | null;
      creatorConfirmationDueAt?:  string | null;
      contentDeadline?:           string | null;
      contentGraceDeadline?:      string | null;
      businessReviewDueAt?:       string | null;
      paymentReleaseAt?:          string | null;
      submittedLate?:             boolean;
      submittedAt?:    string | null;
      deliverableUrls?: string | null;
      deliverableVideos?: DeliverableVideo[];
      deliverableFiles?: DeliverableFile[];
      paymentStatus?:  string;
      paidAt?:         string | null;
      workNote?:       string | null;
      revisionRequestedAt?: string | null;
      revisionNotes?:  { note: string; createdAt: string }[];
      requirementId?:  string | null;
      campaign:     {
        id: string; title: string; campaignType?: string;
        paymentStatus?: string; paidAt?: string | null; featureImageUrl?: string | null;
        business: { id: string; businessName: string };
      };
    }>>('GET', '/api/campaigns/applications/my', undefined, {
      page:   params?.page  ?? 1,
      limit:  params?.limit ?? 10,
      status: params?.status,
    });

    return {
      proposals: res.data.map((a) => ({
        id:              a.id,
        campaignId:      a.campaign.id,
        campaignTitle:   a.campaign.title,
        brand:           a.campaign.business.businessName,
        businessId:      a.campaign.business.id,
        status:          a.status.toLowerCase() as 'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'expired',
        submittedAt:     a.createdAt,
        workSubmittedAt: a.submittedAt ?? null,
        coverLetter:     a.coverLetter,
        proposedRate:    `Rs. ${a.proposedRate.toLocaleString()}`,
        proposedRateRaw: a.proposedRate,
        workStatus:      (a.workStatus ?? 'NONE') as WorkStatusValue,
        engagementState: (a.engagementState ?? null) as EngagementStateValue | null,
        escrowStatus:    a.escrowStatus ?? null,
        dispute:         a.dispute ?? null,
        paymentDueAt:              a.paymentDueAt ?? null,
        creatorConfirmationDueAt:  a.creatorConfirmationDueAt ?? null,
        contentDeadline:           a.contentDeadline ?? null,
        contentGraceDeadline:      a.contentGraceDeadline ?? null,
        businessReviewDueAt:       a.businessReviewDueAt ?? null,
        paymentReleaseAt:          a.paymentReleaseAt ?? null,
        submittedLate:             a.submittedLate ?? false,
        campaignType:    (a.campaign.campaignType ?? 'PAID_CAMPAIGN') as 'PAID_CAMPAIGN' | 'OPEN_EVENT',
        paymentStatus:   (a.paymentStatus ?? a.campaign.paymentStatus ?? 'UNPAID') as 'UNPAID' | 'PAID' | 'RELEASED',
        paidAt:          a.paidAt ?? a.campaign.paidAt ?? null,
        featureImageUrl: a.campaign.featureImageUrl ?? undefined,
        deliverableUrls: a.deliverableUrls ?? null,
        deliverableVideos: a.deliverableVideos ?? [],
        deliverableFiles: a.deliverableFiles ?? [],
        workNote:        a.workNote ?? null,
        revisionRequestedAt: a.revisionRequestedAt ?? null,
        revisionNotes:   a.revisionNotes ?? [],
        requirementId:   a.requirementId ?? null,
      })),
      total: res.pagination?.total ?? res.data.length,
    };
  },
};
