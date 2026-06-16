import { request }          from '@/lib/api';
import type { ApiCampaign } from '@/lib/api';
import type { Campaign }    from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, string> = {
  Instagram:    '📸',
  TikTok:       '🎵',
  YouTube:      '▶️',
  'Twitter / X': '🐦',
  LinkedIn:     '💼',
};

function formatBudget(min: number, max: number): string {
  const fmt = (n: number) => `$${n.toLocaleString()}`;
  return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function mapStatus(s: 'ACTIVE' | 'PAUSED' | 'CLOSED'): Campaign['status'] {
  if (s === 'ACTIVE') return 'active';
  if (s === 'CLOSED') return 'closed';
  return 'draft'; // PAUSED → draft (closest equivalent in mobile type)
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
    platform:     api.platform as Campaign['platform'],
    platformIcon: PLATFORM_ICONS[api.platform] ?? '📱',
    budget:       formatBudget(api.budgetMin, api.budgetMax),
    budgetRaw:    api.budgetMin,
    budgetMax:    api.budgetMax,
    category:     api.category,
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
  };
}

function toApiStatus(s: Campaign['status']): 'ACTIVE' | 'PAUSED' | 'CLOSED' {
  if (s === 'active') return 'ACTIVE';
  if (s === 'closed') return 'CLOSED';
  return 'PAUSED';
}

// ── Service ─────────────────────────────────────────────────────────────────────

export const campaignService = {
  async listMy(params?: { page?: number; limit?: number }): Promise<{ campaigns: Campaign[]; total: number }> {
    const res = await request<ApiCampaign[]>('GET', '/api/campaigns/my', undefined, {
      page:  params?.page  ?? 1,
      limit: params?.limit ?? 50,
    });
    return {
      campaigns: res.data.map((c) => toCampaign({ ...c, business: c.business ?? { businessName: '', logoUrl: null } })),
      total:     res.pagination?.total ?? res.data.length,
    };
  },

  async list(params?: {
    category?:    string;
    platform?:    string;
    minBudget?:   number;
    maxBudget?:   number;
    isFeatured?:  boolean;
    dateFrom?:    Date;
    dateTo?:      Date;
    page?:        number;
    limit?:       number;
  }): Promise<{ campaigns: Campaign[]; total: number; page: number; totalPages: number }> {
    const res = await request<ApiCampaign[]>('GET', '/api/campaigns', undefined, {
      category:     params?.category,
      platform:     params?.platform,
      minBudget:    params?.minBudget,
      maxBudget:    params?.maxBudget,
      isFeatured:   params?.isFeatured !== undefined ? String(params.isFeatured) : undefined,
      deadlineFrom: params?.dateFrom?.toISOString(),
      deadlineTo:   params?.dateTo?.toISOString(),
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

  async getCategories(): Promise<string[]> {
    const res = await request<string[]>('GET', '/api/campaigns/categories');
    return res.data;
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

  async create(data: {
    title: string;
    description: string;
    category: string;
    platform: string;
    minFollowers: number;
    contentType: string;
    deliverables: string;
    deadline: string;
    location?: string;
    budgetMin: number;
    budgetMax: number;
    paymentType: string;
    creatorsNeeded?: number;
    isFeatured?: boolean;
  }): Promise<Campaign> {
    const res = await request<ApiCampaign>('POST', '/api/campaigns', data);
    return toCampaign(res.data);
  },

  async update(id: string, data: {
    title?: string;
    description?: string;
    category?: string;
    platform?: string;
    minFollowers?: number;
    contentType?: string;
    deliverables?: string;
    paymentType?: string;
    status?: Campaign['status'];
    budgetMin?: number;
    budgetMax?: number;
    deadline?: string;
    location?: string | null;
    isFeatured?: boolean;
  }): Promise<void> {
    await request('PUT', `/api/campaigns/${id}`, {
      ...data,
      status: data.status !== undefined ? toApiStatus(data.status) : undefined,
    });
  },

  async getBusinessProposals(params?: { page?: number; limit?: number }): Promise<{
    proposals: Array<{
      id: string;
      status: 'pending' | 'accepted' | 'rejected';
      proposedRate: string;
      createdAt: string;
      campaign: { id: string; title: string; platform: string };
      creator: { fullName: string; avatarUrl: string | null; location: string | null };
    }>;
    total: number;
  }> {
    const res = await request<Array<{
      id: string; status: string; proposedRate: number; createdAt: string;
      campaign: { id: string; title: string; platform: string };
      creator: { fullName: string; avatarUrl: string | null; location: string | null };
    }>>('GET', '/api/campaigns/applications/business', undefined, {
      page: params?.page ?? 1,
      limit: params?.limit ?? 50,
    });
    return {
      proposals: res.data.map((a) => ({
        id: a.id,
        status: a.status.toLowerCase() as 'pending' | 'accepted' | 'rejected',
        proposedRate: `$${a.proposedRate.toLocaleString()}`,
        createdAt: a.createdAt,
        campaign: a.campaign,
        creator: a.creator,
      })),
      total: res.pagination?.total ?? res.data.length,
    };
  },

  async getApplications(campaignId: string): Promise<Array<{
    id: string;
    status: 'pending' | 'accepted' | 'rejected';
    proposedRate: string;
    createdAt: string;
    creator: { fullName: string; avatarUrl: string | null; location: string | null };
  }>> {
    const res = await request<Array<{
      id: string; status: string; proposedRate: number; createdAt: string;
      creator: { fullName: string; avatarUrl: string | null; location: string | null };
    }>>('GET', `/api/campaigns/${campaignId}/applications`);
    return res.data.map((a) => ({
      id: a.id,
      status: a.status.toLowerCase() as 'pending' | 'accepted' | 'rejected',
      proposedRate: `$${a.proposedRate.toLocaleString()}`,
      createdAt: a.createdAt,
      creator: a.creator,
    }));
  },

  async getMyApplications(): Promise<Array<{
    id:            string;
    campaignId:    string;
    campaignTitle: string;
    brand:         string;
    status:        'pending' | 'accepted' | 'rejected';
    submittedAt:   string;
    coverLetter:   string;
    proposedRate:  string;
  }>> {
    const res = await request<Array<{
      id:          string;
      status:      string;
      coverLetter: string;
      proposedRate: number;
      createdAt:   string;
      campaign:    { id: string; title: string; business: { businessName: string } };
    }>>('GET', '/api/campaigns/applications/my');

    return res.data.map((a) => ({
      id:            a.id,
      campaignId:    a.campaign.id,
      campaignTitle: a.campaign.title,
      brand:         a.campaign.business.businessName,
      status:        a.status.toLowerCase() as 'pending' | 'accepted' | 'rejected',
      submittedAt:   a.createdAt,
      coverLetter:   a.coverLetter,
      proposedRate:  `$${a.proposedRate.toLocaleString()}`,
    }));
  },
};
