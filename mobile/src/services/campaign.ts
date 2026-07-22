import { request }          from '@/lib/api';
import type { ApiCampaign } from '@/lib/api';
import type { Campaign }    from '@/types';

export interface AiCampaignDraft {
  title: string;
  description: string;
  objective: string;
  category: string;
  platforms: string[];
  contentGuidelines: string[];
  targetAudience: string[];
  suggestedDurationDays: number;
  creatorsNeeded: number;
  budgetMin: number;
  budgetMax: number;
  paymentType: string;
  deliverables: string;
  hashtags: string[];
  sampleCaption: string;
  approvalRequirements: string;
  location: string | null;
  needsInput: string[];
  aiSuggestedCategories: string[];
  aiSuggestedPlatforms: string[];
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

function mapStatus(s: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'PAUSED' | 'CLOSED'): Campaign['status'] {
  if (s === 'ACTIVE') return 'active';
  if (s === 'CLOSED') return 'closed';
  if (s === 'PENDING_APPROVAL') return 'pending_approval';
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
    isNew:        isNewCampaign(api.createdAt),
    isFeatured:   api.isFeatured,
    status:       mapStatus(api.status),
    location:     api.location ?? undefined,
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
  }): Promise<void> {
    await request('POST', `/api/campaigns/${campaignId}/apply`, payload);
  },

  async getFeaturedQuota(): Promise<{ freeQuota: number; used: number; remaining: number; price: number }> {
    const res = await request<{ freeQuota: number; used: number; remaining: number; price: number }>('GET', '/api/campaigns/featured-quota');
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
  }): Promise<Campaign> {
    const res = await request<ApiCampaign>('POST', '/api/campaigns', data);
    return toCampaign(res.data);
  },

  async generateWithAi(prompt: string): Promise<AiCampaignDraft> {
    const res = await request<AiCampaignDraft>('POST', '/api/campaigns/ai/generate', { prompt });
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
    category?: string;
    goals?: string[];
    platforms?: string[];
    minFollowers?: number;
    contentType?: string;
    deliverables?: string;
    paymentType?: string;
    status?: Campaign['status'];
    budgetMin?: number;
    budgetMax?: number;
    creatorsNeeded?: number;
    deadline?: string;
    location?: string | null;
    isFeatured?: boolean;
    campaignType?: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
    capacity?: number;
    eventDate?: string;
    venue?: string | null;
    benefits?: string[];
    eventStatus?: 'OPEN' | 'FULL' | 'CLOSED';
  }): Promise<void> {
    await request('PUT', `/api/campaigns/${id}`, {
      ...data,
      status: data.status !== undefined ? toApiStatus(data.status) : undefined,
    });
  },

  async getBusinessProposals(params?: {
    page?: number;
    limit?: number;
    status?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    campaignType?: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
  }): Promise<{
    proposals: Array<{
      id: string;
      status: 'pending' | 'accepted' | 'rejected';
      workStatus: 'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED';
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
        status: a.status.toLowerCase() as 'pending' | 'accepted' | 'rejected',
        workStatus: (a.workStatus ?? 'NONE') as 'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED',
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

  async approveWork(appId: string): Promise<void> {
    await request('PUT', `/api/campaigns/applications/${appId}/approve`);
  },

  async requestRevision(appId: string, note: string): Promise<void> {
    await request('PUT', `/api/campaigns/applications/${appId}/request-revision`, { note });
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

  async getApplications(campaignId: string): Promise<Array<{
    id:              string;
    status:          'pending' | 'accepted' | 'rejected';
    proposedRate:    string;
    proposedRateRaw: number;
    coverLetter:     string;
    createdAt:       string;
    workStatus:      'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED';
    submittedAt:     string | null;
    deliverableUrls: string | null;
    paymentStatus:   'UNPAID' | 'PAID' | 'RELEASED';
    paidAt:          string | null;
    creator: { id: string; userId: string; fullName: string; avatarUrl: string | null; location: string | null };
  }>> {
    const res = await request<Array<{
      id: string; status: string; proposedRate: number; coverLetter: string; createdAt: string;
      workStatus?: string; submittedAt?: string | null; deliverableUrls?: string | null;
      paymentStatus?: string; paidAt?: string | null;
      creator: { id: string; userId: string; fullName: string; avatarUrl: string | null; location: string | null };
    }>>('GET', `/api/campaigns/${campaignId}/applications`);
    return res.data.map((a) => ({
      id:              a.id,
      status:          a.status.toLowerCase() as 'pending' | 'accepted' | 'rejected',
      proposedRate:    `Rs. ${a.proposedRate.toLocaleString()}`,
      proposedRateRaw: a.proposedRate,
      coverLetter:     a.coverLetter ?? '',
      createdAt:       a.createdAt,
      workStatus:      (a.workStatus ?? 'NONE') as 'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED',
      submittedAt:     a.submittedAt ?? null,
      deliverableUrls: a.deliverableUrls ?? null,
      paymentStatus:   (a.paymentStatus ?? 'UNPAID') as 'UNPAID' | 'PAID' | 'RELEASED',
      paidAt:          a.paidAt ?? null,
      creator:         a.creator,
    }));
  },

  async getMyApplications(params?: {
    page?:   number;
    limit?:  number;
    status?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  }): Promise<{
    proposals: Array<{
      id:               string;
      campaignId:       string;
      campaignTitle:    string;
      brand:            string;
      businessId:       string;
      status:           'pending' | 'accepted' | 'rejected';
      submittedAt:      string;
      workSubmittedAt:  string | null;
      coverLetter:      string;
      proposedRate:     string;
      proposedRateRaw:  number;
      workStatus:       'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED';
      campaignType:     'PAID_CAMPAIGN' | 'OPEN_EVENT';
      paymentStatus:    'UNPAID' | 'PAID' | 'RELEASED';
      paidAt:           string | null;
      featureImageUrl:  string | undefined;
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
      paymentStatus?:  string;
      paidAt?:         string | null;
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
        status:          a.status.toLowerCase() as 'pending' | 'accepted' | 'rejected',
        submittedAt:     a.createdAt,
        workSubmittedAt: a.submittedAt ?? null,
        coverLetter:     a.coverLetter,
        proposedRate:    `Rs. ${a.proposedRate.toLocaleString()}`,
        proposedRateRaw: a.proposedRate,
        workStatus:      (a.workStatus ?? 'NONE') as 'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED',
        campaignType:    (a.campaign.campaignType ?? 'PAID_CAMPAIGN') as 'PAID_CAMPAIGN' | 'OPEN_EVENT',
        paymentStatus:   (a.paymentStatus ?? a.campaign.paymentStatus ?? 'UNPAID') as 'UNPAID' | 'PAID' | 'RELEASED',
        paidAt:          a.paidAt ?? a.campaign.paidAt ?? null,
        featureImageUrl: a.campaign.featureImageUrl ?? undefined,
      })),
      total: res.pagination?.total ?? res.data.length,
    };
  },
};
