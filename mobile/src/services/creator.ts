import { request } from '@/lib/api';
import type { ApiSocialAccount } from '@/lib/api';

export type { ApiSocialAccount };

export interface ApiCreatorProfile {
  id: string;
  userId: string;
  fullName: string;
  bio: string | null;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  avatarUrl: string | null;
  categories: string[];
  portfolioLinks: { id: string; label: string; url: string }[];
  socialLinks: Record<string, string | null> | null;
  socialAccounts: ApiSocialAccount[];
  paymentMethods: string[];
  prefPlatforms:  string[];
  prefLocations:  string[];
  prefBudgetMin:  number;
  prefBudgetMax:  number;
  user: { id: string; email: string; role: string; isEmailVerified: boolean };
}

export interface ApiEarningsSummary {
  totalEarned:       number;
  pendingEarnings:   number;
  totalApplications: number;
}

export interface ApiCreatorPublicProfile {
  id: string;
  userId: string;
  fullName: string | null;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  categories: string[];
  isVerified: boolean;
  prefBudgetMin: number;
  prefBudgetMax: number;
  prefPlatforms: string[];
  portfolioLinks: { id: string; label: string; url: string }[];
  socialLinks: Record<string, string | null> | null;
  socialAccounts: { id: string; platform: string; followers: number; profileUrl: string }[];
}

export interface ApiCreatorListItem {
  id: string;
  fullName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  categories: string[];
  isVerified: boolean;
  prefBudgetMin: number;
  prefBudgetMax: number;
  socialAccounts: { platform: string; followers: number }[];
}

export interface ApiCreatorListResponse {
  creators: ApiCreatorListItem[];
  total: number;
  page: number;
  limit: number;
}

export const creatorService = {
  async listCreators(params?: {
    page?: number;
    limit?: number;
    search?: string;
    location?: string;
    categories?: string[];
    platforms?: string[];
    priceMin?: number;
    priceMax?: number;
  }): Promise<ApiCreatorListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.location) query.set('location', params.location);
    if (params?.categories?.length) query.set('categories', params.categories.join(','));
    if (params?.platforms?.length) query.set('platforms', params.platforms.join(','));
    if (params?.priceMin !== undefined) query.set('priceMin', String(params.priceMin));
    if (params?.priceMax !== undefined) query.set('priceMax', String(params.priceMax));
    const qs = query.toString();
    const res = await request<ApiCreatorListResponse>('GET', `/api/business/creators${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  async getCreatorFilterOptions(): Promise<{ categories: string[]; platforms: string[] }> {
    const res = await request<{ categories: string[]; platforms: string[] }>('GET', '/api/business/creators/filter-options');
    return res.data;
  },

  async getCreatorPublicProfile(id: string): Promise<ApiCreatorPublicProfile> {
    const res = await request<ApiCreatorPublicProfile>('GET', `/api/business/creators/${id}`);
    return res.data;
  },

  async getProfile(): Promise<ApiCreatorProfile> {
    const res = await request<ApiCreatorProfile>('GET', '/api/creator/profile');
    return res.data;
  },

  async updateProfile(data: {
    fullName?: string;
    bio?: string;
    location?: string;
    locationLat?: number;
    locationLng?: number;
    categories?: string[];
  }): Promise<ApiCreatorProfile> {
    const res = await request<ApiCreatorProfile>('PUT', '/api/creator/profile', data);
    return res.data;
  },

  async updateSocialLinks(data: Record<string, string | null>): Promise<ApiCreatorProfile> {
    const res = await request<ApiCreatorProfile>('PUT', '/api/creator/social-links', data);
    return res.data;
  },

  async addPortfolioLink(label: string, url: string): Promise<ApiCreatorProfile> {
    const res = await request<ApiCreatorProfile>('POST', '/api/creator/portfolio', { label, url });
    return res.data;
  },

  async removePortfolioLink(id: string): Promise<ApiCreatorProfile> {
    const res = await request<ApiCreatorProfile>('DELETE', `/api/creator/portfolio/${id}`);
    return res.data;
  },

  // ── Social Accounts ─────────────────────────────────────────────────────────

  async getSocialAccounts(): Promise<ApiSocialAccount[]> {
    const res = await request<ApiSocialAccount[]>('GET', '/api/creator/social-accounts');
    return res.data;
  },

  async addSocialAccount(data: { platform: string; profileUrl: string; followers: number }): Promise<ApiSocialAccount> {
    const res = await request<ApiSocialAccount>('POST', '/api/creator/social-accounts', data);
    return res.data;
  },

  async updateSocialAccount(id: string, data: { profileUrl?: string; followers?: number }): Promise<ApiSocialAccount> {
    const res = await request<ApiSocialAccount>('PUT', `/api/creator/social-accounts/${id}`, data);
    return res.data;
  },

  async deleteSocialAccount(id: string): Promise<void> {
    await request('DELETE', `/api/creator/social-accounts/${id}`);
  },

  async getEarnings(): Promise<ApiEarningsSummary> {
    const res = await request<ApiEarningsSummary>('GET', '/api/creator/earnings');
    return res.data;
  },

  async updatePaymentMethods(methods: string[]): Promise<string[]> {
    const res = await request<{ paymentMethods: string[] }>('PUT', '/api/creator/payment-methods', { methods });
    return res.data.paymentMethods;
  },

  async updateCampaignPreferences(data: {
    categories?:   string[];
    prefPlatforms?: string[];
    prefLocations?: string[];
    prefBudgetMin?: number;
    prefBudgetMax?: number;
  }): Promise<void> {
    await request('PUT', '/api/creator/campaign-preferences', data);
  },

  async deactivateAccount(): Promise<void> {
    await request('PATCH', '/api/auth/deactivate');
  },

  async deleteAccount(): Promise<void> {
    await request('DELETE', '/api/auth/account');
  },
};
