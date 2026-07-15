import { request } from '@/lib/api';
import type { ApiSocialAccount } from '@/lib/api';
import type { FacebookPageOption } from '@/services/creator';

export type BusinessListItem = {
  id:           string;
  businessName: string;
  description:  string | null;
  logoUrl:      string | null;
  website:      string | null;
  categories:   string[];
  isVerified:   boolean;
  fullyVerified: boolean;
  _count:       { campaigns: number };
};

export type BusinessActiveCampaign = {
  id:          string;
  title:       string;
  platforms:   string[];
  category:    string;
  budgetMin:   number;
  budgetMax:   number;
  deadline:    string;
  contentType: string;
  isFeatured:  boolean;
  location:    string | null;
  _count:      { applications: number };
};

export type BusinessPublicStats = {
  averageRatingGiven:  number;
  ratingsGivenCount:   number;
  responseTimeAvgMins: number;
};

export type BusinessDetail = BusinessListItem & {
  createdAt:           string;
  userId:              string;
  phone:               string | null;
  campaigns:           BusinessActiveCampaign[];
  showPublicProfile:   boolean;
  hideContactDetails:  boolean;
  allowDirectMessages: boolean;
  stats:               BusinessPublicStats | null;
  isPrivate?:          false;
};

export type PrivateBusinessDetail = {
  id:           string;
  businessName: string;
  logoUrl:      string | null;
  isPrivate:    true;
};

export type BusinessDetailResult = BusinessDetail | PrivateBusinessDetail;

export const businessService = {
  async listBusinesses(params?: {
    search?:    string;
    category?:  string;
    platform?:  string;
    locations?: string[]; // city labels, OR-matched
    page?:      number;
    limit?:     number;
  }) {
    const res = await request<{ businesses: BusinessListItem[]; total: number }>(
      'GET',
      '/api/creator/businesses',
      undefined,
      {
        search:    params?.search,
        category:  params?.category,
        platform:  params?.platform,
        locations: params?.locations && params.locations.length > 0
                     ? params.locations.join(',')
                     : undefined,
        page:      params?.page ?? 1,
        limit:     params?.limit ?? 20,
      },
    );
    return res.data;
  },

  async getBusinessById(id: string) {
    const res = await request<BusinessDetailResult>('GET', `/api/creator/businesses/${id}`);
    return res.data;
  },

  async getMyProfile(): Promise<{ showPublicProfile: boolean; hideContactDetails: boolean; allowDirectMessages: boolean }> {
    const res = await request<{ showPublicProfile: boolean; hideContactDetails: boolean; allowDirectMessages: boolean }>(
      'GET', '/api/business/profile'
    );
    return {
      showPublicProfile:   res.data.showPublicProfile   ?? true,
      hideContactDetails:  res.data.hideContactDetails  ?? false,
      allowDirectMessages: res.data.allowDirectMessages ?? true,
    };
  },

  async updatePrivacy(data: { showPublicProfile?: boolean; hideContactDetails?: boolean; allowDirectMessages?: boolean }): Promise<void> {
    await request('PUT', '/api/business/profile', data);
  },

  async getFavoriteBusinesses(): Promise<BusinessListItem[]> {
    const res = await request<BusinessListItem[]>('GET', '/api/creator/businesses/favorites/list');
    return res.data;
  },

  async getPaymentHistory(): Promise<PaymentHistoryEntry[]> {
    const res = await request<PaymentHistoryEntry[]>('GET', '/api/business/payment-history');
    return res.data;
  },

  // ── Social Accounts — mirrors creatorService's methods of the same name; see
  // that file for the OAuth "backend hands back a browser URL, we open it, the
  // redirect lands on our API" pattern used by TikTok/Instagram below. ──

  async getSocialAccounts(): Promise<ApiSocialAccount[]> {
    const res = await request<ApiSocialAccount[]>('GET', '/api/business/social-accounts');
    return res.data;
  },

  async addSocialAccount(data: { platform: string; profileUrl: string; followers: number }): Promise<ApiSocialAccount> {
    const res = await request<ApiSocialAccount>('POST', '/api/business/social-accounts', data);
    return res.data;
  },

  async updateSocialAccount(id: string, data: { profileUrl?: string; followers?: number }): Promise<ApiSocialAccount> {
    const res = await request<ApiSocialAccount>('PUT', `/api/business/social-accounts/${id}`, data);
    return res.data;
  },

  async deleteSocialAccount(id: string): Promise<void> {
    await request('DELETE', `/api/business/social-accounts/${id}`);
  },

  async connectYoutubeAccount(accessToken: string, refreshToken?: string, expiresIn?: number): Promise<ApiSocialAccount> {
    const res = await request<ApiSocialAccount>('POST', '/api/business/social-accounts/youtube/connect', { accessToken, refreshToken, expiresIn });
    return res.data;
  },

  async getTiktokAuthorizeUrl(): Promise<string> {
    const res = await request<{ url: string }>('GET', '/api/business/social-accounts/tiktok/authorize');
    return res.data.url;
  },

  async getFacebookPages(accessToken: string): Promise<FacebookPageOption[]> {
    const res = await request<FacebookPageOption[]>('POST', '/api/business/social-accounts/facebook/pages', { accessToken });
    return res.data;
  },

  async connectFacebookPage(accessToken: string, pageId: string): Promise<ApiSocialAccount> {
    const res = await request<ApiSocialAccount>('POST', '/api/business/social-accounts/facebook/connect', { accessToken, pageId });
    return res.data;
  },

  async connectInstagramAccount(accessToken: string, pageId: string): Promise<ApiSocialAccount> {
    const res = await request<ApiSocialAccount>('POST', '/api/business/social-accounts/instagram/connect', { accessToken, pageId });
    return res.data;
  },

  async getInstagramLoginAuthorizeUrl(): Promise<string> {
    const res = await request<{ url: string }>('GET', '/api/business/social-accounts/instagram-login/authorize');
    return res.data.url;
  },
};

export type PaymentHistoryEntry = {
  id:          string;
  date:        string;
  description: string;
  amount:      number;
  type:        'debit' | 'credit';
};
