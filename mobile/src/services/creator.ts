import { request } from '@/lib/api';
import type { ApiSocialAccount } from '@/lib/api';

export type { ApiSocialAccount };

export interface ApiCreatorProfile {
  id: string;
  userId: string;
  username: string | null;
  fullName: string;
  bio: string | null;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  nearbyRadiusKm: number;
  nearbyUseHomeLocation: boolean;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  categories: string[];
  portfolioLinks: { id: string; label: string; url: string }[];
  socialLinks: Record<string, string | null> | null;
  socialAccounts: ApiSocialAccount[];
  paymentMethods: string[];
  prefPlatforms:  string[];
  prefLocations:  string[];
  prefBudgetMin:  number;
  prefBudgetMax:  number;
  isVerified: boolean;
  fullyVerified: boolean;
  citizenshipDocUrl: string | null;
  citizenshipStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  panDocUrl: string | null;
  panDocStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  verificationRejectReason: string | null;
  verificationRejectedAt: string | null;
  province: string | null;
  district: string | null;
  city: string | null;
  area: string | null;
  address: string | null;
  locationVisibility: 'EXACT' | 'CITY' | 'DISTRICT';
  showPublicProfile: boolean;
  hideContactDetails: boolean;
  hideSocialLinks: boolean;
  availabilityStatus: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
  startingRate: number | null;
  negotiable: boolean;
  user: { id: string; email: string; phone: string | null; role: string; isEmailVerified: boolean; isPhoneVerified: boolean };
  savedByBusinessCount: number;
}

export interface ApiAvailabilityDay {
  id: string;
  creatorProfileId: string;
  dayOfWeek: number;
  availableFrom: string;
  availableUntil: string;
}

export interface ApiCampaignInvitation {
  id: string;
  campaignId: string;
  businessId: string;
  message: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  respondedAt: string | null;
  createdAt: string;
  // Backend returns the full Campaign row — only the fields this UI needs are
  // declared here; extra fields are present at runtime but untyped.
  campaign: { id: string; title: string; budgetMin: number; budgetMax: number; deadline: string };
  business: { id: string; businessName: string | null; logoUrl: string | null };
}

export interface FacebookPageOption {
  id: string;
  name: string;
  fanCount: number;
  picture?: string;
  hasInstagram: boolean;
  instagramUsername?: string;
}

export interface ApiEarningsSummary {
  totalEarned:       number;
  pendingEarnings:   number;
  totalApplications: number;
}

export interface ApiCreatorPublicStats {
  profileCompletion: number;
  averageRating: number;
  reviewCount: number;
  responseTimeAvgMins: number;
  completionRate: number;
}

export interface ApiReviewReceived {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  from: { name: string | null; avatarUrl: string | null };
}

export interface ApiCreatorPublicProfile {
  id: string;
  userId: string;
  fullName: string | null;
  username: string | null;
  // Set (with only id/fullName/avatarUrl otherwise populated) when the
  // creator has disabled showPublicProfile — every other field below is
  // absent from the response in that case, so check this before reading them.
  isPrivate?: boolean;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  categories: string[];
  isVerified: boolean;
  fullyVerified: boolean;
  prefPlatforms: string[];
  portfolioLinks: { id: string; label: string; url: string }[];
  socialLinks: Record<string, string | null> | null;
  socialAccounts: { id: string; platform: string; followers: number; profileUrl: string; connectedViaOAuth: boolean }[];
  stats: ApiCreatorPublicStats | null;
  // Absent on older cached responses — treat as empty, not an error.
  reviews?: ApiReviewReceived[];
  services?: ApiPublicService[];
}

export interface ApiPublicService {
  id: string;
  name: string;
  description: string;
  startingPrice: number | null;
  pricingModel: 'PER_PROJECT' | 'PER_HOUR' | 'PER_DAY' | 'PER_CAMPAIGN' | 'CUSTOM_QUOTE';
  deliveryTime: string | null;
  whatsIncluded: string[];
  category: { id: string; name: string; icon: string; color: string };
}

export interface ApiCreatorListItem {
  id: string;
  fullName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  categories: string[];
  isVerified: boolean;
  fullyVerified: boolean;
  socialAccounts: { platform: string; followers: number }[];
  distanceKm?: number;
  averageRating?: number;
  completionRate?: number;
  completedEvents?: number;
}

export interface ApiCreatorListResponse {
  creators: ApiCreatorListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface SavedCreatorItem {
  id: string;
  createdAt: string;
  creator: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
    location: string | null;
    categories: string[];
    isVerified: boolean;
    socialAccounts: { platform: string; followers: number }[];
  };
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
    sort?: 'newest' | 'oldest' | 'followers';
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
    if (params?.sort) query.set('sort', params.sort);
    const qs = query.toString();
    const res = await request<ApiCreatorListResponse>('GET', `/api/business/creators${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  async getRecommendedCreators(params: { category: string; lat?: number; lng?: number; budgetMin?: number; budgetMax?: number; platforms?: string[]; minFollowers?: number; limit?: number }): Promise<ApiCreatorListItem[]> {
    const query = new URLSearchParams();
    query.set('category', params.category);
    if (params.lat != null) query.set('lat', String(params.lat));
    if (params.lng != null) query.set('lng', String(params.lng));
    if (params.budgetMin != null) query.set('budgetMin', String(params.budgetMin));
    if (params.budgetMax != null) query.set('budgetMax', String(params.budgetMax));
    if (params.platforms?.length) query.set('platforms', params.platforms.join(','));
    if (params.minFollowers != null) query.set('minFollowers', String(params.minFollowers));
    if (params.limit != null) query.set('limit', String(params.limit));
    const res = await request<ApiCreatorListItem[]>('GET', `/api/business/creators/recommended?${query.toString()}`);
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

  // Creator browsing OTHER creators — mirrors listCreators/getCreatorPublicProfile
  // above but hits the CREATOR-accessible routes (self excluded server-side).
  async listPeerCreators(params?: {
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
    const res = await request<ApiCreatorListResponse>('GET', `/api/creator/peers${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  async getPeerCreatorProfile(id: string): Promise<ApiCreatorPublicProfile> {
    const res = await request<ApiCreatorPublicProfile>('GET', `/api/creator/peers/${id}`);
    return res.data;
  },

  async getProfile(): Promise<ApiCreatorProfile> {
    const res = await request<ApiCreatorProfile>('GET', '/api/creator/profile');
    return res.data;
  },

  async isUsernameAvailable(username: string): Promise<boolean> {
    const res = await request<{ available: boolean }>('GET', `/api/creator/username-available?username=${encodeURIComponent(username)}`);
    return res.data.available;
  },

  async updateProfile(data: {
    fullName?: string;
    username?: string;
    bio?: string;
    location?: string | null;
    locationLat?: number | null;
    locationLng?: number | null;
    categories?: string[];
    nearbyRadiusKm?: number;
    nearbyUseHomeLocation?: boolean;
  }): Promise<ApiCreatorProfile> {
    const res = await request<ApiCreatorProfile>('PUT', '/api/creator/profile', data);
    return res.data;
  },

  // §61 — separate from updateProfile's typed field list so a privacy-toggle
  // save can't accidentally carry stale profile-form state along with it;
  // mirrors business.ts's updatePrivacy wrapper over the same profile endpoint.
  async updatePrivacy(data: {
    showPublicProfile?: boolean; hideContactDetails?: boolean; hideSocialLinks?: boolean;
    locationVisibility?: 'EXACT' | 'CITY' | 'DISTRICT';
  }): Promise<void> {
    await request('PUT', '/api/creator/profile', data);
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

  // refreshToken/expiresIn are only present when Google actually issued a refresh
  // token — the backend persists them so the subscriber count can keep refreshing
  // itself automatically afterwards (see useGoogleAccessToken.ts).
  async connectYoutubeAccount(
    accessToken: string, refreshToken?: string, expiresIn?: number,
    clientPlatform?: 'ios' | 'android' | 'web',
  ): Promise<ApiSocialAccount> {
    const res = await request<ApiSocialAccount>('POST', '/api/creator/social-accounts/youtube/connect', { accessToken, refreshToken, expiresIn, clientPlatform });
    return res.data;
  },

  async getTiktokAuthorizeUrl(): Promise<string> {
    const res = await request<{ url: string }>('GET', '/api/creator/social-accounts/tiktok/authorize');
    return res.data.url;
  },

  async getFacebookPages(accessToken: string): Promise<FacebookPageOption[]> {
    const res = await request<FacebookPageOption[]>('POST', '/api/creator/social-accounts/facebook/pages', { accessToken });
    return res.data;
  },

  async connectFacebookPage(accessToken: string, pageId: string): Promise<ApiSocialAccount> {
    const res = await request<ApiSocialAccount>('POST', '/api/creator/social-accounts/facebook/connect', { accessToken, pageId });
    return res.data;
  },

  async connectInstagramAccount(accessToken: string, pageId: string): Promise<ApiSocialAccount> {
    const res = await request<ApiSocialAccount>('POST', '/api/creator/social-accounts/instagram/connect', { accessToken, pageId });
    return res.data;
  },

  // Direct connect — no Facebook account/Page needed, for creators who only have
  // Instagram. See getTiktokAuthorizeUrl above for the same "backend hands back a
  // browser URL, we open it, the redirect lands on our API" pattern.
  async getInstagramLoginAuthorizeUrl(): Promise<string> {
    const res = await request<{ url: string }>('GET', '/api/creator/social-accounts/instagram-login/authorize');
    return res.data.url;
  },

  // ── Business: save/unsave creators ─────────────────────────────────────────

  async toggleSaveCreator(creatorId: string): Promise<{ isSaved: boolean }> {
    const res = await request<{ isSaved: boolean }>('POST', `/api/business/creators/${creatorId}/save`);
    return res.data;
  },

  async getSavedCreators(params?: {
    search?: string;
    location?: string;
    categories?: string[];
    platforms?: string[];
    priceMin?: number;
    priceMax?: number;
  }): Promise<SavedCreatorItem[]> {
    const res = await request<SavedCreatorItem[]>(
      'GET',
      '/api/business/creators/saved',
      undefined,
      {
        search:     params?.search,
        location:   params?.location,
        categories: params?.categories?.length ? params.categories.join(',') : undefined,
        platforms:  params?.platforms?.length ? params.platforms.join(',') : undefined,
        priceMin:   params?.priceMin,
        priceMax:   params?.priceMax,
      },
    );
    return res.data;
  },

  async getSavedCreatorIds(): Promise<string[]> {
    const res = await request<{ ids: string[] }>('GET', '/api/business/creators/saved-ids');
    return res.data.ids;
  },

  async inviteCreators(campaignId: string, creatorIds: string[], message?: string): Promise<{ invited: number }> {
    const res = await request<{ invited: number }>('POST', `/api/business/campaigns/${campaignId}/invite`, { creatorIds, message });
    return res.data;
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

  // ── Availability ─────────────────────────────────────────────────────────

  async updateAvailabilityStatus(status: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE'): Promise<'AVAILABLE' | 'BUSY' | 'UNAVAILABLE'> {
    const res = await request<{ availabilityStatus: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE' }>('PUT', '/api/creator/availability/status', { status });
    return res.data.availabilityStatus;
  },

  async getAvailabilitySchedule(): Promise<ApiAvailabilityDay[]> {
    const res = await request<ApiAvailabilityDay[]>('GET', '/api/creator/availability/schedule');
    return res.data;
  },

  // Submits the complete week — the backend replaces the whole schedule rather
  // than patching individual days, so always send every day the UI wants kept.
  async updateAvailabilitySchedule(days: { dayOfWeek: number; availableFrom: string; availableUntil: string }[]): Promise<ApiAvailabilityDay[]> {
    const res = await request<ApiAvailabilityDay[]>('PUT', '/api/creator/availability/schedule', { days });
    return res.data;
  },

  // ── Invitations ──────────────────────────────────────────────────────────

  async listInvitations(): Promise<ApiCampaignInvitation[]> {
    const res = await request<ApiCampaignInvitation[]>('GET', '/api/creator/invitations');
    return res.data;
  },

  async respondToInvitation(id: string, status: 'ACCEPTED' | 'DECLINED'): Promise<ApiCampaignInvitation> {
    const res = await request<ApiCampaignInvitation>('POST', `/api/creator/invitations/${id}/respond`, { status });
    return res.data;
  },
};
