import { request, API_BASE, ensureFreshAccessToken } from '@/lib/api';
import type { ApiCampaign } from '@/lib/api';
import type { Campaign }    from '@/types';
import { startBackgroundChunkedUpload } from '@/services/backgroundVideoUploadManager';
import type { VideoUploadSignature } from '@/services/cloudinaryVideoUpload';
import type { PickedFile } from '@/utilities/chatAttachments';
import { storage } from '@/utilities/storage';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/utilities/constants';

export interface DeliverableVideo {
  publicId:    string;
  url:         string;
  thumbnailUrl: string;
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
  objective: string;
  category: string;
  platforms: string[];
  contentGuidelines: string[];
  goal: string;
  targetAudience: string[];
  suggestedDurationDays: number;
  creatorsNeeded: number;
  budgetMin: number;
  budgetMax: number;
  paymentType: string;
  deliverables: Record<string, number>;
  hashtags: string[];
  sampleCaption: string;
  approvalRequirements: string;
  location: string | null;
  completionType: 'SERVICE' | 'DELIVERABLE';
  completionReason: string;
  needsInput: string[];
  aiSuggestedCategories: string[];
  aiSuggestedPlatforms: string[];
  // Empty for the common single-role case — populated only when the AI
  // detected the brief clearly asks for multiple distinct provider types.
  requirements: AiRequirementDraft[];
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
  completionType: 'SERVICE' | 'DELIVERABLE';
  completionReason: string;
  needsInput: string[];
  aiSuggestedCategories: string[];
  aiSuggestedPlatforms: string[];
  // See AiCampaignDraft.aiFallback.
  aiFallback?: boolean;
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
    venue:         (api as any).venue ?? undefined,
    benefits:      Array.isArray((api as any).benefits) ? (api as any).benefits : [],
    paymentStatus: api.paymentStatus ?? 'UNPAID',
    paidAt:        api.paidAt ?? null,
    creatorsNeeded: api.creatorsNeeded,
    objective:            api.objective ?? undefined,
    contentGuidelines:    api.contentGuidelines ?? [],
    targetAudience:       api.targetAudience ?? [],
    hashtags:             api.hashtags ?? [],
    sampleCaption:        api.sampleCaption ?? undefined,
    approvalRequirements: api.approvalRequirements ?? undefined,
    aiGenerated:           api.aiGenerated ?? false,
    aiSuggestedCategories: api.aiSuggestedCategories ?? [],
    aiSuggestedPlatforms:  api.aiSuggestedPlatforms ?? [],
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
  }): Promise<{ campaigns: Campaign[]; total: number }> {
    const res = await request<ApiCampaign[]>('GET', '/api/campaigns/my', undefined, {
      page:   params?.page  ?? 1,
      limit:  params?.limit ?? 50,
      status: params?.status,
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

  async getById(id: string): Promise<Campaign> {
    const res = await request<ApiCampaign>('GET', `/api/campaigns/${id}`);
    return toCampaign(res.data);
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

  async getFeaturedQuota(): Promise<{ freeQuota: number; used: number; remaining: number; price: number; unlimited: boolean }> {
    const res = await request<{ freeQuota: number; used: number; remaining: number; price: number; unlimited: boolean }>('GET', '/api/campaigns/featured-quota');
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
    venue?:        string;
    benefits?:     string[];
    status?:               'DRAFT' | 'ACTIVE';
    objective?:            string;
    contentGuidelines?:    string[];
    targetAudience?:       string[];
    hashtags?:             string[];
    sampleCaption?:        string;
    approvalRequirements?: string;
    aiGenerated?:           boolean;
    aiPrompt?:              string;
    aiSuggestedCategories?: string[];
    aiSuggestedPlatforms?:  string[];
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
    // Longer timeout than the default 30s — GPT-5 mini's reasoning latency on this
    // longer structured-JSON prompt can take 20-40s (backend's own budget is 45s).
    const res = await request<AiCampaignDraft>('POST', '/api/campaigns/ai/generate', { prompt, inputSource }, undefined, 50000);
    return res.data;
  },

  async generateEventWithAi(prompt: string, inputSource?: 'voice' | 'text'): Promise<AiEventDraft> {
    const res = await request<AiEventDraft>('POST', '/api/campaigns/ai/generate-event', { prompt, inputSource }, undefined, 50000);
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
    objective?: string;
    contentGuidelines?: string[];
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
      workStatus: 'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED' | 'DISPUTED';
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
        workStatus: (a.workStatus ?? 'NONE') as 'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED' | 'DISPUTED',
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

  async payForApplication(appId: string): Promise<void> {
    await request('PUT', `/api/campaigns/applications/${appId}/pay`);
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

  async requestDeliverableVideoSignature(appId: string): Promise<VideoUploadSignature> {
    const res = await request<VideoUploadSignature>('POST', `/api/campaigns/applications/${appId}/deliverables/video/signature`);
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
        const signature = await campaignService.requestDeliverableVideoSignature(appId);
        if (cancelled) throw new Error('Upload cancelled');

        innerTask = startBackgroundChunkedUpload(
          { targetType: 'deliverable', appId, durationSec },
          fileUri, mimeType, signature, onProgress, onFinalizing,
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

  async requestRevision(appId: string, note: string): Promise<void> {
    await request('PUT', `/api/campaigns/applications/${appId}/request-revision`, { note });
  },

  async reportIssue(appId: string, reason: string): Promise<void> {
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
    workStatus:      'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED' | 'DISPUTED';
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
      workStatus:      (a.workStatus ?? 'NONE') as 'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED' | 'DISPUTED',
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
      workStatus:       'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED' | 'DISPUTED';
      campaignType:     'PAID_CAMPAIGN' | 'OPEN_EVENT';
      paymentStatus:    'UNPAID' | 'PAID' | 'RELEASED';
      paidAt:           string | null;
      featureImageUrl:  string | undefined;
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
      submittedAt?:    string | null;
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
        workStatus:      (a.workStatus ?? 'NONE') as 'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED' | 'DISPUTED',
        campaignType:    (a.campaign.campaignType ?? 'PAID_CAMPAIGN') as 'PAID_CAMPAIGN' | 'OPEN_EVENT',
        paymentStatus:   (a.paymentStatus ?? a.campaign.paymentStatus ?? 'UNPAID') as 'UNPAID' | 'PAID' | 'RELEASED',
        paidAt:          a.paidAt ?? a.campaign.paidAt ?? null,
        featureImageUrl: a.campaign.featureImageUrl ?? undefined,
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
