import { request } from '@/lib/api';
import type { ApiSocialAccount } from '@/lib/api';
import type { ApiPortfolioItem } from './portfolio';

export type { ApiSocialAccount };

// AGENCY is deliberately absent: the type still exists in the Prisma enum and
// the API still accepts it, but the whole agency flow (onboarding option,
// industries, legal identifiers, company-registration doc) is switched off on
// the client for now. Re-add 'AGENCY' here first when it comes back — the
// compiler then points at every branch that needs restoring.
export type ProviderType = 'INDIVIDUAL' | 'TEAM';

// §3 step 4 — where a provider delivers.
export type ServiceMode = 'CLIENT_LOCATION' | 'MY_LOCATION' | 'ONLINE' | 'HYBRID';

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
  // §5 — company-registration document. Still returned by the API; nothing on
  // the client uploads one while the agency flow is switched off.
  companyRegDocUrl: string | null;
  companyRegDocStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  companyRegDocUploadedAt: string | null;
  // Derived by the server (providerVerificationStatus) — never recompute the
  // which-document-is-required rule on the client.
  verificationStatus: 'NOT_VERIFIED' | 'PENDING' | 'VERIFIED';
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
  // "How do you provide your services?" — collected as step 1 of onboarding,
  // changeable later from Settings. Null only for accounts onboarded before
  // the question existed.
  providerType: ProviderType | null;
  // §4 — only ever set for a TEAM; the server clears it on a switch away.
  teamSize: number | null;
  // §6 — served industries. Server-owned; no client screen writes it while the
  // agency flow is switched off.
  industries: string[];
  website: string | null;
  serviceMode: ServiceMode | null;
  // §5 — legal identifiers. Private profile only; never on the public profile
  // or discovery cards. Read-only on the client for now (the Settings editor
  // went away with the agency flow).
  panNo: string | null;
  vatNo: string | null;
  companyRegNo: string | null;
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

// One row of a campaign's invitation list as the business sees it — the
// mirror of ApiCampaignInvitation above, which is the creator's view of the
// same record (creator side carries the campaign/business, business side
// carries the creator).
export interface CampaignInvitee {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  creator: {
    id: string;
    userId: string;
    fullName: string;
    avatarUrl: string | null;
    location: string | null;
  };
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
  // §9 badge — null for accounts onboarded before the question existed.
  providerType: ProviderType | null;
  teamSize: number | null;
  // §6 — empty unless a server-side agency record set it.
  industries: string[];
  // Null when the provider has hidden their social links.
  website: string | null;
  serviceMode: ServiceMode | null;
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
  // Media-backed portfolio entries (PortfolioItem table), separate from the
  // legacy label+url portfolioLinks above.
  portfolioItems?: ApiPortfolioItem[];
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
  providerType: ProviderType | null;
  teamSize: number | null;
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

// §4/§7 — team membership. `member` is populated on the roster
// (/team/members), `provider` on the invitee's own list (/team/memberships);
// neither duplicates the other's profile fields.
export type ProviderMemberRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';

export interface ApiProviderMember {
  id: string;
  providerId: string;
  memberId: string;
  jobRole: string | null;
  accessRole: ProviderMemberRole;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  invitedAt: string;
  respondedAt: string | null;
  member?: {
    id: string;
    userId: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
    categories: string[];
    isVerified: boolean;
  };
  provider?: {
    id: string;
    userId: string;
    fullName: string | null;
    avatarUrl: string | null;
    providerType: ProviderType | null;
  };
}

// §13/§16 — who inside a team is working a booking the team won. Carries no
// money by design; payouts stay with the provider that was hired.
export interface ApiAssignment {
  id: string;
  applicationId: string;
  memberId: string;
  note: string | null;
  assignedAt: string;
  member?: {
    id: string;
    userId: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
    categories: string[];
    isVerified: boolean;
  };
  // Populated on the assignee's own list (my-assignments), not on a booking's roster.
  application?: {
    id: string;
    status: string;
    workStatus: string;
    campaign: { id: string; title: string; featureImageUrl: string | null };
    creator:  { id: string; fullName: string | null; avatarUrl: string | null; providerType: ProviderType | null };
  };
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
    teamSize?: number | null;
    industries?: string[];
    website?: string | null;
    serviceMode?: ServiceMode | null;
    panNo?: string | null;
    vatNo?: string | null;
    companyRegNo?: string | null;
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

  // Separate wrapper for the same reason updatePrivacy above is one — changing
  // how a provider works restructures their profile, so it's confirmed and sent
  // on its own rather than riding along with unrelated profile-form state.
  async updateProviderType(providerType: ProviderType): Promise<ApiCreatorProfile> {
    const res = await request<ApiCreatorProfile>('PUT', '/api/creator/profile', { providerType });
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

  // Business-side view of one campaign's invitations — who was invited and how
  // they responded. Backs the "Invited" tab on a free event's proposals screen.
  async listCampaignInvitations(campaignId: string): Promise<CampaignInvitee[]> {
    const res = await request<CampaignInvitee[]>('GET', `/api/business/campaigns/${campaignId}/invitations`);
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

  // ── Team members (§4/§7) ───────────────────────────────────────────────────
  // §7 — omit providerId for your own team; pass one to act as an ADMIN member
  // of someone else's. The server authorizes either way.
  async listTeamMembers(providerId?: string): Promise<ApiProviderMember[]> {
    const res = await request<ApiProviderMember[]>(
      'GET',
      providerId ? `/api/creator/team/members?providerId=${encodeURIComponent(providerId)}` : '/api/creator/team/members',
    );
    return res.data;
  },

  async inviteTeamMember(data: {
    providerId?: string;
    email?: string;
    phone?: string;
    jobRole?: string;
    accessRole?: Exclude<ProviderMemberRole, 'OWNER'>;
  }): Promise<ApiProviderMember> {
    const res = await request<ApiProviderMember>('POST', '/api/creator/team/members', data);
    return res.data;
  },

  async updateTeamMember(id: string, data: {
    jobRole?: string | null;
    accessRole?: Exclude<ProviderMemberRole, 'OWNER'>;
  }): Promise<ApiProviderMember> {
    const res = await request<ApiProviderMember>('PATCH', `/api/creator/team/members/${id}`, data);
    return res.data;
  },

  async removeTeamMember(id: string): Promise<void> {
    await request('DELETE', `/api/creator/team/members/${id}`);
  },

  // ── Assignments (§13/§16) ──────────────────────────────────────────────────
  async listAssignments(applicationId: string): Promise<ApiAssignment[]> {
    const res = await request<ApiAssignment[]>('GET', `/api/creator/team/assignments?applicationId=${encodeURIComponent(applicationId)}`);
    return res.data;
  },

  async assignMember(applicationId: string, memberId: string, note?: string): Promise<ApiAssignment> {
    const res = await request<ApiAssignment>('POST', '/api/creator/team/assignments', { applicationId, memberId, ...(note ? { note } : {}) });
    return res.data;
  },

  async unassignMember(assignmentId: string): Promise<void> {
    await request('DELETE', `/api/creator/team/assignments/${assignmentId}`);
  },

  // Work handed to this provider by a team they belong to.
  async listMyAssignments(): Promise<ApiAssignment[]> {
    const res = await request<ApiAssignment[]>('GET', '/api/creator/team/my-assignments');
    return res.data;
  },

  // The invitee's side — invitations to join someone else's team.
  async listMyMemberships(): Promise<ApiProviderMember[]> {
    const res = await request<ApiProviderMember[]>('GET', '/api/creator/team/memberships');
    return res.data;
  },

  async respondToMembership(id: string, status: 'ACCEPTED' | 'DECLINED'): Promise<ApiProviderMember> {
    const res = await request<ApiProviderMember>('POST', `/api/creator/team/memberships/${id}/respond`, { status });
    return res.data;
  },

  async listInvitations(): Promise<ApiCampaignInvitation[]> {
    const res = await request<ApiCampaignInvitation[]>('GET', '/api/creator/invitations');
    return res.data;
  },

  async respondToInvitation(id: string, status: 'ACCEPTED' | 'DECLINED'): Promise<ApiCampaignInvitation> {
    const res = await request<ApiCampaignInvitation>('POST', `/api/creator/invitations/${id}/respond`, { status });
    return res.data;
  },
};
