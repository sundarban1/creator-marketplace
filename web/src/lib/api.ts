const BASE = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3000';

// ── Token storage ──────────────────────────────────────────────────────────────

const KEY_ACCESS  = 'ch_admin_token';
const KEY_REFRESH = 'ch_admin_refresh';
const KEY_USER    = 'ch_admin_user';

export function getAccessToken()  { return localStorage.getItem(KEY_ACCESS);  }
export function getRefreshToken() { return localStorage.getItem(KEY_REFRESH); }

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(KEY_ACCESS,  access);
  localStorage.setItem(KEY_REFRESH, refresh);
}

export function clearTokens() {
  [KEY_ACCESS, KEY_REFRESH, KEY_USER].forEach((k) => localStorage.removeItem(k));
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(KEY_USER);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch { return null; }
}

export function setStoredUser(u: StoredUser) {
  localStorage.setItem(KEY_USER, JSON.stringify(u));
}

// ── Shared types ───────────────────────────────────────────────────────────────

export interface StoredUser {
  id:    string;
  email: string;
  role:  string;
  name:  string;
}

export interface Pagination {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success:    boolean;
  message?:   string;
  data:       T;
  pagination?: Pagination;
}

export interface ApiStats {
  totalUsers:          number;
  totalCreators:       number;
  totalBusinesses:     number;
  activeCampaigns:     number;
  totalCampaigns:      number;
  pendingApplications: number;
  recentUsers: Array<{
    id:        string;
    email:     string;
    role:      string;
    createdAt: string;
    creatorProfile?:  { fullName: string } | null;
    businessProfile?: { businessName: string } | null;
  }>;
}

export interface ApiUser {
  id:              string;
  email:           string;
  role:            string;
  isEmailVerified: boolean;
  isActive:        boolean;
  createdAt:       string;
  creatorProfile?:  { fullName: string; avatarUrl?: string | null; isVerified: boolean } | null;
  businessProfile?: { businessName: string; logoUrl?: string | null; isVerified: boolean } | null;
}

export interface ApiCreator {
  id:         string;
  userId:     string;
  fullName:   string | null;
  bio?:       string | null;
  location?:  string | null;
  avatarUrl?: string | null;
  categories: string[];
  socialLinks: Record<string, string>;
  isVerified:  boolean;
  citizenshipDocUrl?: string | null;
  citizenshipStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt:   string;
  user:  { id: string; email: string; isEmailVerified: boolean; isActive: boolean; createdAt: string };
  _count: { applications: number };
}

export interface ApiReferral {
  id: string;
  referrer: { id: string; name: string | null };
  referred: { id: string; name: string | null; isVerified: boolean };
  code: string;
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED';
  linkedAt: string;
  expiresAt: string;
  completedAt: string | null;
  rewardAmount: number;
  eligibility: {
    verified: boolean;
    profileComplete: boolean;
    firstEventCompleted: boolean;
    notExpired: boolean;
  };
}

export interface ApiBusinessReferral {
  id: string;
  referrer: { id: string; name: string | null };
  referred: { id: string; name: string | null; isVerified: boolean };
  code: string;
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED';
  linkedAt: string;
  expiresAt: string;
  completedAt: string | null;
  rewardAmount: number;
  eligibility: {
    verified: boolean;
    profileComplete: boolean;
    fundedCampaignStable: boolean;
    notExpired: boolean;
  };
  flags: {
    samePan: boolean;
    samePayout: boolean;
    sameDevice: boolean;
  };
}

export interface ApiCategory {
  id: string;
  icon: string;
  iconBg: string;
  name: string;
  key: string;
  scope: 'CREATOR' | 'BUSINESS' | 'BOTH';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  itemCount?: number;
}

export interface ApiBusiness {
  id:           string;
  userId:       string;
  businessName: string;
  description?: string | null;
  logoUrl?:     string | null;
  website?:     string | null;
  categories:   string[];
  isVerified:   boolean;
  createdAt:    string;
  panDocUrl?:          string | null;
  panDocStatus?:       'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  companyRegDocUrl?:   string | null;
  companyRegDocStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  user:  { id: string; email: string; isEmailVerified: boolean; isActive: boolean; createdAt: string };
  _count: { campaigns: number };
}

export interface LegalSection {
  id:        string;
  type:      string;
  title:     string;
  body:      string;
  icon?:     string | null;
  order:     number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HelpArticle {
  id:        string;
  question:  string;
  answer:    string;
  category:  string;
  order:     number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCampaign {
  id:        string;
  title:     string;
  category:  string;
  platform:  string;
  budgetMin: number;
  budgetMax: number;
  status:    string;
  deadline:  string;
  createdAt: string;
  business:  { businessName: string; logoUrl?: string | null };
  _count:    { applications: number };
}

export interface ApiApplication {
  id:            string;
  coverLetter:   string;
  proposedRate:  number;
  timeline:      string;
  portfolioUrl?: string | null;
  status:        string;
  workStatus:    string;
  paymentStatus: string;
  createdAt:     string;
  updatedAt:     string;
  creator: {
    id:         string;
    fullName:   string | null;
    avatarUrl?: string | null;
    location?:  string | null;
    categories: string[];
    user:       { email: string };
  };
}

export interface ApiCampaignDetail {
  id:             string;
  title:          string;
  description:    string;
  category:       string;
  platform:       string;
  budgetMin:      number;
  budgetMax:      number;
  paymentType:    string;
  status:         string;
  campaignType:   string;
  goals:          string[];
  deliverables:   string;
  contentType:    string;
  location?:      string | null;
  deadline:       string;
  creatorsNeeded: number;
  isFeatured:     boolean;
  capacity?:      number | null;
  eventDate?:     string | null;
  venue?:         string | null;
  benefits:       string[];
  objective?:            string | null;
  contentGuidelines?:    string[];
  targetAudience?:       string[];
  hashtags?:             string[];
  sampleCaption?:        string | null;
  callToAction?:         string | null;
  approvalRequirements?: string | null;
  aiGenerated?:           boolean;
  aiPrompt?:              string | null;
  aiSuggestedCategories?: string[];
  aiSuggestedPlatforms?:  string[];
  createdAt:      string;
  updatedAt:      string;
  business: {
    id:           string;
    businessName: string;
    logoUrl?:     string | null;
    website?:     string | null;
    description?: string | null;
  };
  applications:   ApiApplication[];
  _count:         { applications: number };
}

export type PlatformSettings = Record<string, boolean | string | number>;

export interface ApiConversationAdmin {
  id:            string;
  status:        'PENDING' | 'ACCEPTED' | 'DECLINED';
  requestMessage?: string | null;
  lastMessageAt?:  string | null;
  createdAt:     string;
  creator:       { fullName: string; avatarUrl?: string | null };
  business:      { businessName: string; logoUrl?: string | null };
  campaign?:     { title: string } | null;
  _count:        { messages: number };
}

export interface ConversationStats {
  total:         number;
  pending:       number;
  accepted:      number;
  declined:      number;
  totalMessages: number;
}

// ── Core fetch ─────────────────────────────────────────────────────────────────

// A 401 from these endpoints means bad credentials or an invalid refresh token —
// not an expired access token — so it must never trigger the silent refresh-retry
// below (which would otherwise mask "Invalid email or password" with "Session expired").
const AUTH_PATHS_WITHOUT_REFRESH_RETRY = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'];

let pendingRefresh: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const rt = getRefreshToken();
  if (!rt) {
    clearTokens();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  const res = await fetch(`${BASE}/api/auth/refresh`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refreshToken: rt }),
  });

  if (!res.ok) {
    clearTokens();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  const json = await res.json() as ApiResponse<{ accessToken: string }>;
  const token = json.data.accessToken;
  localStorage.setItem(KEY_ACCESS, token);
  return token;
}

async function request<T>(
  method:  string,
  path:    string,
  body?:   unknown,
  params?: Record<string, string | number | undefined>,
): Promise<ApiResponse<T>> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  function buildHeaders(token?: string): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    const t = token ?? getAccessToken();
    if (t) h['Authorization'] = `Bearer ${t}`;
    return h;
  }

  let res = await fetch(url.toString(), {
    method,
    headers: buildHeaders(),
    body:    body != null ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !AUTH_PATHS_WITHOUT_REFRESH_RETRY.includes(path)) {
    if (!pendingRefresh) {
      pendingRefresh = refreshAccessToken().finally(() => { pendingRefresh = null; });
    }
    const newToken = await pendingRefresh;
    res = await fetch(url.toString(), {
      method,
      headers: buildHeaders(newToken),
      body:    body != null ? JSON.stringify(body) : undefined,
    });
  }

  const json = await res.json() as ApiResponse<T>;
  if (!res.ok) throw new Error((json as { message?: string }).message ?? `Request failed (${res.status})`);
  return json;
}

// ── API surface ────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ accessToken: string; refreshToken: string; user: Omit<StoredUser, 'name'> & { role: string } }>(
        'POST', '/api/auth/login', { email, password }
      ),
    logout: () => request<null>('POST', '/api/auth/logout'),
  },

  admin: {
    stats: () =>
      request<ApiStats>('GET', '/api/admin/stats'),

    users: (params?: { page?: number; limit?: number; role?: string; search?: string }) =>
      request<ApiUser[]>('GET', '/api/admin/users', undefined,
        params as Record<string, string | number | undefined>),

    creators: (params?: { page?: number; limit?: number; search?: string }) =>
      request<ApiCreator[]>('GET', '/api/admin/creators', undefined,
        params as Record<string, string | number | undefined>),

    businesses: (params?: { page?: number; limit?: number; search?: string }) =>
      request<ApiBusiness[]>('GET', '/api/admin/businesses', undefined,
        params as Record<string, string | number | undefined>),

    campaigns: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
      request<ApiCampaign[]>('GET', '/api/admin/campaigns', undefined,
        params as Record<string, string | number | undefined>),

    campaignDetail: (id: string) =>
      request<ApiCampaignDetail>('GET', `/api/admin/campaigns/${id}`),

    verifyUser: (id: string, verified: boolean) =>
      request<ApiUser>('PATCH', `/api/admin/users/${id}/verify`, { verified }),

    suspendUser: (id: string, isActive: boolean) =>
      request<{ id: string; email: string; isActive: boolean }>('PATCH', `/api/admin/users/${id}/suspend`, { isActive }),

    deleteUser: (id: string) =>
      request<null>('DELETE', `/api/admin/users/${id}`),

    updateCampaignStatus: (id: string, status: string) =>
      request<ApiCampaign>('PATCH', `/api/admin/campaigns/${id}/status`, { status }),

    getSettings: () =>
      request<PlatformSettings>('GET', '/api/admin/settings'),

    updateSettings: (settings: PlatformSettings) =>
      request<PlatformSettings>('PUT', '/api/admin/settings', settings),

    conversationStats: () =>
      request<ConversationStats>('GET', '/api/admin/conversations/stats'),

    conversations: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
      request<ApiConversationAdmin[]>('GET', '/api/admin/conversations', undefined,
        params as Record<string, string | number | undefined>),

    deleteConversation: (id: string) =>
      request<null>('DELETE', `/api/admin/conversations/${id}`),

    verifyCreator: (id: string, verified: boolean) =>
      request<{ id: string; fullName: string | null; isVerified: boolean }>('PATCH', `/api/admin/creators/${id}/verify`, { verified }),

    referrals: (status?: string) =>
      request<ApiReferral[]>('GET', '/api/admin/referrals', undefined, status ? { status } : undefined),

    releaseReferral: (id: string) =>
      request<ApiReferral>('PATCH', `/api/admin/referrals/${id}/release`),

    verifyBusiness: (id: string, verified: boolean) =>
      request<{ id: string; businessName: string | null; isVerified: boolean }>('PATCH', `/api/admin/businesses/${id}/verify`, { verified }),

    businessReferrals: (status?: string) =>
      request<ApiBusinessReferral[]>('GET', '/api/admin/business-referrals', undefined, status ? { status } : undefined),

    releaseBusinessReferral: (id: string) =>
      request<ApiBusinessReferral>('PATCH', `/api/admin/business-referrals/${id}/release`),

    categories: () =>
      request<ApiCategory[]>('GET', '/api/admin/categories'),

    createCategory: (data: { icon: string; iconBg: string; name: string; key: string; scope: string; status: string }) =>
      request<ApiCategory>('POST', '/api/admin/categories', data),

    updateCategory: (id: string, data: { icon: string; iconBg: string; name: string; key: string; scope: string; status: string }) =>
      request<ApiCategory>('PUT', `/api/admin/categories/${id}`, data),

    toggleCategoryStatus: (id: string, status: string) =>
      request<ApiCategory>('PATCH', `/api/admin/categories/${id}/status`, { status }),

    deleteCategory: (id: string) =>
      request<null>('DELETE', `/api/admin/categories/${id}`),
  },

  help: {
    listAll: () =>
      request<HelpArticle[]>('GET', '/api/help/all'),

    create: (data: { question: string; answer: string; category: string; order: number; published: boolean }) =>
      request<HelpArticle>('POST', '/api/help', data),

    update: (id: string, data: Partial<{ question: string; answer: string; category: string; order: number; published: boolean }>) =>
      request<HelpArticle>('PUT', `/api/help/${id}`, data),

    delete: (id: string) =>
      request<null>('DELETE', `/api/help/${id}`),

    togglePublish: (id: string, published: boolean) =>
      request<HelpArticle>('PATCH', `/api/help/${id}/publish`, { published }),
  },

  faq: {
    listAll: () =>
      request<HelpArticle[]>('GET', '/api/faq/all'),

    create: (data: { question: string; answer: string; category: string; order: number; published: boolean }) =>
      request<HelpArticle>('POST', '/api/faq', data),

    update: (id: string, data: Partial<{ question: string; answer: string; category: string; order: number; published: boolean }>) =>
      request<HelpArticle>('PUT', `/api/faq/${id}`, data),

    delete: (id: string) =>
      request<null>('DELETE', `/api/faq/${id}`),

    togglePublish: (id: string, published: boolean) =>
      request<HelpArticle>('PATCH', `/api/faq/${id}/publish`, { published }),
  },

  support: {
    listContacts: (params?: { page?: number; limit?: number; status?: string }) =>
      request<unknown[]>('GET', '/api/support/contacts', undefined, params as Record<string, string | number | undefined>),

    listReports: (params?: { page?: number; limit?: number; status?: string }) =>
      request<unknown[]>('GET', '/api/support/reports', undefined, params as Record<string, string | number | undefined>),

    updateContactStatus: (id: string, status: string) =>
      request<unknown>('PATCH', `/api/support/contacts/${id}/status`, { status }),

    updateReportStatus: (id: string, status: string) =>
      request<unknown>('PATCH', `/api/support/reports/${id}/status`, { status }),
  },

  legal: {
    listAll: (type?: string) =>
      request<LegalSection[]>('GET', '/api/legal', undefined, type ? { type } : undefined),

    create: (data: { type: string; title: string; body: string; icon?: string | null; order?: number; published?: boolean }) =>
      request<LegalSection>('POST', '/api/legal', data),

    update: (id: string, data: Partial<{ title: string; body: string; icon?: string | null; order: number; published: boolean }>) =>
      request<LegalSection>('PUT', `/api/legal/${id}`, data),

    delete: (id: string) =>
      request<null>('DELETE', `/api/legal/${id}`),

    togglePublish: (id: string, published: boolean) =>
      request<LegalSection>('PATCH', `/api/legal/${id}/publish`, { published }),
  },
};
