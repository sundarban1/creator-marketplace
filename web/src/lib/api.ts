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

export interface ApiActivityLog {
  id:          string;
  userId:      string | null;
  userEmail:   string | null;
  action:      string;
  entityType:  string | null;
  entityId:    string | null;
  description: string | null;
  metadata:    Record<string, unknown> | null;
  ipAddress:   string | null;
  device:      string | null;
  platform:    string | null;
  createdAt:   string;
}

export interface ApiVerificationQueueProvider {
  id: string;
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  citizenshipDocUrl: string | null;
  citizenshipStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  // §5 — AGENCY providers register a company instead of proving citizenship.
  companyRegDocUrl?: string | null;
  companyRegDocStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  providerType?: 'INDIVIDUAL' | 'TEAM' | 'AGENCY' | null;
  panDocUrl: string | null;
  panDocStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  user: { email: string; phone: string | null } | null;
}

export interface ApiVerificationQueueBusiness {
  id: string;
  userId: string;
  businessName: string | null;
  logoUrl: string | null;
  panDocUrl: string | null;
  panDocStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  companyRegDocUrl: string | null;
  companyRegDocStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  // INDIVIDUAL service takers verify with this instead of PAN + company reg.
  identityDocUrl: string | null;
  identityDocStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  representingType: 'ORGANIZATION' | 'INDIVIDUAL' | null;
  createdAt: string;
  updatedAt: string;
  user: { email: string; phone: string | null } | null;
}

export interface ApiAuditLog {
  id:               string;
  userId:           string | null;
  userEmail:        string | null;
  action:           string;
  oldValue:         Record<string, unknown> | null;
  newValue:         Record<string, unknown> | null;
  performedBy:      string | null;
  performedByEmail: string | null;
  ipAddress:        string | null;
  createdAt:        string;
}

export interface ApiReport {
  id:          string;
  targetType:  'USER' | 'BUSINESS' | 'SERVICE' | 'OPPORTUNITY' | 'POST' | 'MESSAGE' | 'REVIEW';
  targetId:    string;
  reason:      'SPAM' | 'SCAM' | 'FRAUD' | 'HARASSMENT' | 'INAPPROPRIATE_CONTENT' | 'FAKE_PROFILE' | 'PAYMENT_ISSUE' | 'OTHER';
  description: string | null;
  status:      'NEW' | 'UNDER_REVIEW' | 'ACTION_TAKEN' | 'DISMISSED';
  reviewedBy:  string | null;
  reviewedAt:  string | null;
  actionNote:  string | null;
  createdAt:   string;
  reporter:    { id: string; email: string; role: string };
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
    businessProfile?: { businessName: string | null } | null;
  }>;
}

export interface ApiUser {
  id:              string;
  email:           string;
  phone?:          string | null;
  role:            string;
  isEmailVerified: boolean;
  isActive:        boolean;
  createdAt:       string;
  creatorProfile?:  { fullName: string; avatarUrl?: string | null; isVerified: boolean } | null;
  businessProfile?: { businessName: string | null; logoUrl?: string | null; isVerified: boolean } | null;
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
  panDocUrl?: string | null;
  panDocStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  companyRegDocUrl?: string | null;
  companyRegDocStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt:   string;
  user:  { id: string; email: string; phone?: string | null; isEmailVerified: boolean; isActive: boolean; createdAt: string };
  // Provider marketplace additions — empty for providers who haven't listed
  // a service/portfolio item yet, not specific to any campaign.
  services: {
    id: string; name: string; pricingModel: string; startingPrice: number | null;
    status: string; category: { name: string };
  }[];
  _count: { applications: number; services: number; portfolioItems: number };
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
  color: string;
  name: string;
  key: string;
  scope: 'CREATOR' | 'BUSINESS' | 'BOTH';
  status: 'ACTIVE' | 'INACTIVE';
  // Provider-type sub-grouping for the CREATOR taxonomy (e.g. "Content &
  // Media") — not meaningful for BUSINESS-scope rows, so null there.
  group?: string | null;
  createdAt: string;
  itemCount?: number;
}

export interface ApiSuccessStory {
  id: string;
  name: string;
  role: string;
  quote: string;
  photoUrl: string | null;
  order: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface LandingStats {
  totalCreators: number;
  totalBusinesses: number;
  categories: { id: string; name: string; icon: string; color: string }[];
}

export interface VisitorMessage {
  id: string;
  chatId: string;
  sender: 'VISITOR' | 'ADMIN';
  adminId: string | null;
  content: string;
  createdAt: string;
}

export interface VisitorChat {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  lastMessageAt: string | null;
  visitorSeenAt: string | null;
  adminSeenAt: string | null;
  messages?: VisitorMessage[];
  _count?: { messages: number };
}

export interface ApiPlatform {
  id: string;
  icon: string;
  iconBg: string;
  color: string;
  name: string;
  key: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  campaignCount?: number;
}

export interface ApiPaymentMethod {
  id: string;
  key: string;
  name: string;
  iconUrl: string | null;
  color: string;
  order: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  usageCount?: number;
}

export interface ApiBusiness {
  id:           string;
  userId:       string;
  businessName: string | null;
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
  identityDocUrl?:     string | null;
  identityDocStatus?:  'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  representingType?:   'ORGANIZATION' | 'INDIVIDUAL' | null;
  verificationRejectReason?: string | null;
  // Provider marketplace additions — all optional since they postdate every
  // business that signed up before this was added; null/undefined for those.
  province?:    string | null;
  district?:    string | null;
  city?:        string | null;
  area?:        string | null;
  businessSize?: 'SOLO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'AGENCY' | 'ENTERPRISE' | null;
  user:  { id: string; email: string; phone?: string | null; isEmailVerified: boolean; isActive: boolean; createdAt: string };
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

// Contracts only apply to paid campaigns — free/open events have no
// price/deliverable-for-payment exchange to put under agreement.
export interface ContractTemplate {
  id:           string;
  campaignType: 'PAID_CAMPAIGN';
  title:        string;
  body:         string;
  createdAt:    string;
  updatedAt:    string;
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
  platforms: string[];
  budgetMin: number;
  budgetMax: number;
  status:    string;
  deadline:  string;
  createdAt: string;
  business:  { businessName: string | null; logoUrl?: string | null };
  _count:    { applications: number };
  // Set once an admin force-deletes the event (see api.admin.deleteCampaign)
  // — the row itself is kept for audit, only its applications/requirements/
  // invitations are actually removed. Absent/null for every normal event.
  deletedAt?: string | null;
}

export interface ApiPaymentTransaction {
  id:        string;
  type:      'ESCROW_IN' | 'PAYOUT';
  amount:    number;
  method:    string | null;
  campaign:  string;
  from:      string;
  to:        string;
  createdAt: string;
}

export type WithdrawalStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'CANCELLED';

export interface ApiAdminWithdrawal {
  id:                   string;
  amount:               number;
  method:               string;
  status:               WithdrawalStatus;
  account:              string;
  accountName:          string | null;
  /** Auto-generated request reference (e.g. "WD-A7K2QP9M"), set when the creator submits. */
  referenceCode:        string;
  /** External bank/wallet transfer id — only set once an admin marks it paid. */
  transactionReference: string | null;
  createdAt:            string;
  processedAt:          string | null;
  creator:             { id: string; name: string | null; avatarUrl: string | null };
}

export interface ApiAdminWithdrawalDetail extends ApiAdminWithdrawal {
  payoutSnapshot: {
    type?: string;
    label?: string | null;
    accountName?: string | null;
    bankName?: string | null;
    branch?: string | null;
    accountNumber?: string | null;
    walletId?: string | null;
  };
  screenshotUrl:      string | null;
  paymentDate:        string | null;
  adminNotes:         string | null;
  rejectionReason:    string | null;
  processedByAdminId: string | null;
}

export interface ApiWithdrawalList {
  withdrawals: ApiAdminWithdrawal[];
  total:       number;
  counts:      Record<string, number>;
  page:        number;
  limit:       number;
}

export interface ApiNotification {
  id:        string;
  userId:    string;
  type:      string;
  title:     string;
  body:      string;
  isRead:    boolean;
  refId?:    string | null;
  refType?:  string | null;
  createdAt: string;
}

export interface ApiDeliverableVideo {
  publicId:     string;
  url:          string;
  thumbnailUrl: string;
  durationSec:  number;
  format:       string;
  sizeBytes:    number;
  label:        string;
  uploadedAt:   string;
  status:       'PROCESSING' | 'READY' | 'FAILED';
}

export interface ApiDeliverableFile {
  id:               string;
  publicId:         string;
  url:              string;
  fileType:         'IMAGE' | 'DOCUMENT';
  originalFileName: string;
  mimeType:         string;
  sizeBytes:        number;
  uploadedAt:       string;
}

export interface ApiApplication {
  id:            string;
  // Which role of a multi-role campaign this targets (§ CampaignRequirement)
  // — null/undefined for the simple single-category campaigns every existing
  // campaign uses. This endpoint returns the raw Prisma row, so it's present
  // as a plain scalar on every application already.
  requirementId?: string | null;
  coverLetter:   string;
  proposedRate:  number;
  platformFee?:  number;
  businessTotal?: number;
  timeline:      string;
  portfolioUrl?: string | null;
  status:        string;
  workStatus:    string;
  paymentStatus: string;
  createdAt:     string;
  updatedAt:     string;
  deliverableVideos?: ApiDeliverableVideo[];
  deliverableFiles?:  ApiDeliverableFile[];
  deliverableUrls?:   string | null;
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
  platforms:      string[];
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
  targetAudience?:       string[];
  hashtags?:             string[];
  sampleCaption?:        string | null;
  aiGenerated?:           boolean;
  aiPrompt?:              string | null;
  aiSuggestedCategories?: string[];
  commissionRate?: number | null;
  createdAt:      string;
  updatedAt:      string;
  business: {
    id:           string;
    businessName: string | null;
    logoUrl?:     string | null;
    website?:     string | null;
    description?: string | null;
  };
  applications:   ApiApplication[];
  _count:         { applications: number };
  // Multi-role campaigns (§ CampaignRequirement) — undefined/empty for the
  // simple single-category campaigns every existing campaign uses. This
  // endpoint returns the raw Prisma row (no DTO layer), so acceptedCount
  // arrives nested as _count.applications rather than a flat field.
  requirements?: ApiCampaignRequirementAdmin[];
}

export interface ApiCampaignRequirementAdmin {
  id:           string;
  categoryId:   string;
  category:     { id: string; name: string; icon: string; color: string };
  quantity:     number;
  budgetType:   'FIXED' | 'RANGE' | 'NEGOTIABLE';
  budgetFixed:  number | null;
  budgetMin:    number | null;
  budgetMax:    number | null;
  deliverables: string | null;
  deadline:     string | null;
  _count:       { applications: number };
}

export type AnalyticsRange = '7d' | '30d' | '90d' | '12mo' | 'all';

export interface ApiCreatorAnalytics {
  range: AnalyticsRange;
  totals: {
    totalProfileViews:      number;
    profileViewsInRange:    number;
    profileViewsLast30Days: number;
    profileViewsTrendPct:   number;
    totalEarnings:          number;
    pendingEarnings:        number;
    invitationsReceived:    number;
    applicationsSubmitted:  number;
    applicationsAccepted:   number;
    applicationsRejected:   number;
    activeCampaigns:        number;
    completedCampaigns:     number;
    averageRating:          number;
    reviewCount:            number;
    responseTimeAvgMins:    number;
    completionRate:         number;
    profileCompletion:      { percent: number; missing: string[] };
  };
  campaignBreakdown: {
    invitationsReceived:   number;
    applicationsSubmitted: number;
    accepted:  number;
    rejected:  number;
    active:    number;
    completed: number;
  };
  referrals: {
    totalInvites:        number;
    successfulReferrals: number;
    pendingRewards:      number;
    rewardsEarned:       number;
  };
  charts: {
    earningsTrend: { bucket: string; amount: number }[];
  };
}

export interface ApiBrandAnalytics {
  range: AnalyticsRange;
  totals: {
    campaignsCreated:     number;
    activeCampaigns:      number;
    completedCampaigns:   number;
    totalSpend:           number;
    applicationsReceived: number;
    creatorsHired:        number;
    averageRatingGiven:   number;
    ratingsGivenCount:    number;
    responseTimeAvgMins:  number;
  };
  campaignStatus: {
    draft: number; active: number; paused: number; closed: number; cancelled: number;
  };
  charts: {
    monthlySpending:       { bucket: string; amount: number }[];
    applicationsReceived:  { bucket: string; count: number }[];
  };
}

export type ApiUserAnalytics =
  | ({ role: 'CREATOR' } & ApiCreatorAnalytics)
  | ({ role: 'BUSINESS' } & ApiBrandAnalytics);

export type PlatformSettings = Record<string, boolean | string | number | string[]>;

export interface SiteInfo {
  address: string;
  phone:   string;
  email:   string;
  social: {
    facebook:  string;
    instagram: string;
    tiktok:    string;
    youtube:   string;
  };
}

export interface PlatformFlags {
  businessRegistrationEnabled: boolean;
  creatorRegistrationEnabled:  boolean;
  businessOnboardingEnabled:   boolean;
  creatorOnboardingEnabled:    boolean;
  messagingEnabled:            boolean;
  supportEmail?:               string;
  platformCommission:          number;
  comingSoon:                  boolean;
}

export interface ApiConversationAdmin {
  id:            string;
  status:        'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CLOSED';
  requestMessage?: string | null;
  lastMessageAt?:  string | null;
  createdAt:     string;
  creator:       { fullName: string; avatarUrl?: string | null };
  // Exactly one of these two is set — creator↔business conversations carry
  // `business`, creator↔creator conversations carry `creator2` instead.
  business:      { businessName: string | null; logoUrl?: string | null } | null;
  creator2?:     { fullName: string; avatarUrl?: string | null } | null;
  campaign?:     { title: string } | null;
  _count:        { messages: number };
}

export interface ConversationStats {
  total:         number;
  pending:       number;
  accepted:      number;
  declined:      number;
  closed:        number;
  totalMessages: number;
}

// ── Core fetch ─────────────────────────────────────────────────────────────────

// A 401 from these endpoints means bad credentials or an invalid refresh token —
// not an expired access token — so it must never trigger the silent refresh-retry
// below (which would otherwise mask "Invalid email or password" with "Session expired").
const AUTH_PATHS_WITHOUT_REFRESH_RETRY = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'];

let pendingRefresh: Promise<string> | null = null;

// Exposed so the socket client can force a token refresh after a stale-auth
// reconnect rejection, without waiting for a REST call to hit a 401 first —
// mirrors mobile's lib/api.ts ensureFreshAccessToken.
export async function ensureFreshAccessToken(): Promise<string | null> {
  if (!getRefreshToken()) return null;
  if (!pendingRefresh) {
    pendingRefresh = refreshAccessToken().finally(() => { pendingRefresh = null; });
  }
  try {
    return await pendingRefresh;
  } catch {
    return null;
  }
}

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

// Separate from request() because multipart bodies need the browser to set its
// own `Content-Type: multipart/form-data; boundary=...` — request() always
// JSON-serializes the body and hardcodes a JSON content type.
async function uploadFile<T>(path: string, file: File, fieldName: string): Promise<ApiResponse<T>> {
  const form = new FormData();
  form.append(fieldName, file);

  // Mirrors request()'s 401→refresh→retry — an idle tab's access token expires
  // after 15m, and without this the raw "Token has expired" surfaces to the UI.
  const send = (token: string | null) => fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body:    form,
  });

  let res = await send(getAccessToken());
  if (res.status === 401) {
    res = await send(await ensureFreshAccessToken());
  }

  const json = await res.json() as ApiResponse<T>;
  if (!res.ok) throw new Error((json as { message?: string }).message ?? `Request failed (${res.status})`);
  return json;
}

// Multipart POST with a file plus arbitrary text fields (e.g. withdrawal
// "Mark as Paid" — screenshot + transaction reference + payment date).
async function uploadForm<T>(path: string, form: FormData): Promise<ApiResponse<T>> {
  const send = (token: string | null) => fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body:    form,
  });
  let res = await send(getAccessToken());
  if (res.status === 401) {
    res = await send(await ensureFreshAccessToken());
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

  notifications: {
    list: (params?: { page?: number; limit?: number }) =>
      request<ApiNotification[]>('GET', '/api/notifications', undefined,
        params as Record<string, string | number | undefined>),

    badge: () =>
      request<{ count: number }>('GET', '/api/notifications/badge'),

    markRead: (id: string) =>
      request<unknown>('PATCH', `/api/notifications/${id}/read`),

    markAllRead: () =>
      request<unknown>('PATCH', '/api/notifications/read-all'),
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

    reports: (params?: { page?: number; limit?: number; status?: string; targetType?: string }) =>
      request<{ items: ApiReport[]; total: number }>('GET', '/api/admin/reports', undefined,
        params as Record<string, string | number | undefined>),

    auditLogs: (params?: { page?: number; limit?: number; userId?: string; action?: string; from?: string; to?: string }) =>
      request<ApiAuditLog[]>('GET', '/api/admin/audit-logs', undefined,
        params as Record<string, string | number | undefined>),

    activityLogs: (params?: { page?: number; limit?: number; userId?: string; action?: string; from?: string; to?: string }) =>
      request<ApiActivityLog[]>('GET', '/api/admin/activity-logs', undefined,
        params as Record<string, string | number | undefined>),

    updateReportStatus: (id: string, status: 'UNDER_REVIEW' | 'ACTION_TAKEN' | 'DISMISSED', actionNote?: string) =>
      request<ApiReport>('PUT', `/api/admin/reports/${id}/status`, { status, actionNote }),

    campaignDetail: (id: string) =>
      request<ApiCampaignDetail>('GET', `/api/admin/campaigns/${id}`),

    // Admin edits aren't subject to the "locked after proposals" restriction that
    // applies to a business editing their own event — the backend route intentionally
    // bypasses both the ownership check and the field lock.
    updateCampaign: (id: string, data: Partial<ApiCampaignDetail>) =>
      request<ApiCampaignDetail>('PUT', `/api/admin/campaigns/${id}`, data),

    verifyUser: (id: string, verified: boolean) =>
      request<ApiUser>('PATCH', `/api/admin/users/${id}/verify`, { verified }),

    suspendUser: (id: string, isActive: boolean) =>
      request<{ id: string; email: string; isActive: boolean }>('PATCH', `/api/admin/users/${id}/suspend`, { isActive }),

    deleteUser: (id: string) =>
      request<null>('DELETE', `/api/admin/users/${id}`),

    updateCampaignStatus: (id: string, status: string) =>
      request<ApiCampaign>('PATCH', `/api/admin/campaigns/${id}/status`, { status }),

    approveCampaign: (id: string) =>
      request<ApiCampaign>('POST', `/api/admin/campaigns/${id}/approve`),

    rejectCampaign: (id: string, reason: string) =>
      request<ApiCampaign>('POST', `/api/admin/campaigns/${id}/reject`, { reason }),

    // Soft delete — the event row is kept (audit trail) but every proposal/
    // requirement/invitation tied to it is force-deleted regardless of
    // status. See backend AdminService.deleteCampaign.
    deleteCampaign: (id: string) =>
      request<ApiCampaign>('DELETE', `/api/admin/campaigns/${id}`),

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

    setCreatorDocumentStatus: (id: string, doc: 'citizenship' | 'pan' | 'companyReg', approved: boolean) =>
      request<{ id: string; citizenshipStatus?: string; panDocStatus?: string; companyRegDocStatus?: string }>('PATCH', `/api/admin/creators/${id}/documents/${doc}`, { approved }),

    referrals: (status?: string) =>
      request<ApiReferral[]>('GET', '/api/admin/referrals', undefined, status ? { status } : undefined),

    releaseReferral: (id: string) =>
      request<ApiReferral>('PATCH', `/api/admin/referrals/${id}/release`),

    verifyBusiness: (id: string, verified: boolean) =>
      request<{ id: string; businessName: string | null; isVerified: boolean }>('PATCH', `/api/admin/businesses/${id}/verify`, { verified }),

    setBusinessDocumentStatus: (id: string, doc: 'pan' | 'companyReg' | 'identity', approved: boolean) =>
      request<{ id: string; panDocStatus?: string; companyRegDocStatus?: string; identityDocStatus?: string }>('PATCH', `/api/admin/businesses/${id}/documents/${doc}`, { approved }),

    rejectBusiness: (id: string, reason: string) =>
      request<{ id: string; businessName: string | null; isVerified: boolean }>('PATCH', `/api/admin/businesses/${id}/reject`, { reason }),

    rejectCreator: (id: string, reason: string) =>
      request<{ id: string; fullName: string | null; isVerified: boolean }>('PATCH', `/api/admin/creators/${id}/reject`, { reason }),

    verificationProviders: (params?: { page?: number; limit?: number }) =>
      request<ApiVerificationQueueProvider[]>('GET', '/api/admin/verification/providers', undefined,
        params as Record<string, string | number | undefined>),

    verificationBusinesses: (params?: { page?: number; limit?: number }) =>
      request<ApiVerificationQueueBusiness[]>('GET', '/api/admin/verification/businesses', undefined,
        params as Record<string, string | number | undefined>),

    businessReferrals: (status?: string) =>
      request<ApiBusinessReferral[]>('GET', '/api/admin/business-referrals', undefined, status ? { status } : undefined),

    releaseBusinessReferral: (id: string) =>
      request<ApiBusinessReferral>('PATCH', `/api/admin/business-referrals/${id}/release`),

    payments: (params?: { page?: number; limit?: number; type?: string; search?: string }) =>
      request<ApiPaymentTransaction[]>('GET', '/api/admin/payments', undefined,
        params as Record<string, string | number | undefined>),

    withdrawals: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
      request<ApiWithdrawalList>('GET', '/api/admin/withdrawals', undefined,
        params as Record<string, string | number | undefined>),

    withdrawal: (id: string) =>
      request<ApiAdminWithdrawalDetail>('GET', `/api/admin/withdrawals/${id}`),

    processWithdrawal: (id: string) =>
      request<ApiAdminWithdrawalDetail>('POST', `/api/admin/withdrawals/${id}/process`),

    rejectWithdrawal: (id: string, reason: string) =>
      request<ApiAdminWithdrawalDetail>('POST', `/api/admin/withdrawals/${id}/reject`, { reason }),

    markWithdrawalPaid: (id: string, fields: { transactionReference: string; paymentDate: string; adminNotes?: string }, screenshot: File) => {
      const form = new FormData();
      form.append('screenshot', screenshot);
      form.append('transactionReference', fields.transactionReference);
      form.append('paymentDate', fields.paymentDate);
      if (fields.adminNotes) form.append('adminNotes', fields.adminNotes);
      return uploadForm<ApiAdminWithdrawalDetail>(`/api/admin/withdrawals/${id}/mark-paid`, form);
    },

    analytics: (userId: string, range?: AnalyticsRange) =>
      request<ApiUserAnalytics>('GET', `/api/admin/analytics/${userId}`, undefined, range ? { range } : undefined),

    categories: () =>
      request<ApiCategory[]>('GET', '/api/admin/categories'),

    createCategory: (data: { icon: string; iconBg: string; color: string; name: string; key: string; scope: string; status: string; group?: string }) =>
      request<ApiCategory>('POST', '/api/admin/categories', data),

    updateCategory: (id: string, data: { icon: string; iconBg: string; color: string; name: string; key: string; scope: string; status: string; group?: string }) =>
      request<ApiCategory>('PUT', `/api/admin/categories/${id}`, data),

    toggleCategoryStatus: (id: string, status: string) =>
      request<ApiCategory>('PATCH', `/api/admin/categories/${id}/status`, { status }),

    deleteCategory: (id: string) =>
      request<null>('DELETE', `/api/admin/categories/${id}`),

    platforms: () =>
      request<ApiPlatform[]>('GET', '/api/admin/platforms'),

    createPlatform: (data: { icon: string; iconBg: string; color: string; name: string; key: string; status: string }) =>
      request<ApiPlatform>('POST', '/api/admin/platforms', data),

    updatePlatform: (id: string, data: { icon: string; iconBg: string; color: string; name: string; key: string; status: string }) =>
      request<ApiPlatform>('PUT', `/api/admin/platforms/${id}`, data),

    togglePlatformStatus: (id: string, status: string) =>
      request<ApiPlatform>('PATCH', `/api/admin/platforms/${id}/status`, { status }),

    deletePlatform: (id: string) =>
      request<null>('DELETE', `/api/admin/platforms/${id}`),

    paymentMethods: () =>
      request<ApiPaymentMethod[]>('GET', '/api/admin/payment-methods'),

    createPaymentMethod: (data: { key: string; name: string; iconUrl?: string | null; color: string; order: number; status: string }) =>
      request<ApiPaymentMethod>('POST', '/api/admin/payment-methods', data),

    updatePaymentMethod: (id: string, data: { key: string; name: string; iconUrl?: string | null; color: string; order: number; status: string }) =>
      request<ApiPaymentMethod>('PUT', `/api/admin/payment-methods/${id}`, data),

    togglePaymentMethodStatus: (id: string, status: string) =>
      request<ApiPaymentMethod>('PATCH', `/api/admin/payment-methods/${id}/status`, { status }),

    deletePaymentMethod: (id: string) =>
      request<null>('DELETE', `/api/admin/payment-methods/${id}`),

    uploadPaymentMethodIcon: (file: File) =>
      uploadFile<{ iconUrl: string }>('/api/admin/payment-methods/icon', file, 'icon'),

    successStories: () =>
      request<ApiSuccessStory[]>('GET', '/api/admin/success-stories'),

    createSuccessStory: (data: { name: string; role: string; quote: string; photoUrl?: string | null; order: number; status: string }) =>
      request<ApiSuccessStory>('POST', '/api/admin/success-stories', data),

    updateSuccessStory: (id: string, data: { name: string; role: string; quote: string; photoUrl?: string | null; order: number; status: string }) =>
      request<ApiSuccessStory>('PUT', `/api/admin/success-stories/${id}`, data),

    toggleSuccessStoryStatus: (id: string, status: string) =>
      request<ApiSuccessStory>('PATCH', `/api/admin/success-stories/${id}/status`, { status }),

    deleteSuccessStory: (id: string) =>
      request<null>('DELETE', `/api/admin/success-stories/${id}`),

    uploadSuccessStoryPhoto: (file: File) =>
      uploadFile<{ photoUrl: string }>('/api/admin/success-stories/photo', file, 'photo'),
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
    listContacts: (params?: { page?: number; limit?: number; status?: string; guestOnly?: boolean }) =>
      request<unknown[]>('GET', '/api/support/contacts', undefined, params as Record<string, string | number | undefined>),

    listReports: (params?: { page?: number; limit?: number; status?: string }) =>
      request<unknown[]>('GET', '/api/support/reports', undefined, params as Record<string, string | number | undefined>),

    updateContactStatus: (id: string, status: string) =>
      request<unknown>('PATCH', `/api/support/contacts/${id}/status`, { status }),

    updateReportStatus: (id: string, status: string) =>
      request<unknown>('PATCH', `/api/support/reports/${id}/status`, { status }),

    submitPublicContact: (data: { name: string; email: string; topic: string; message: string }) =>
      request<unknown>('POST', '/api/support/contact-public', data),
  },

  contractTemplate: {
    get: () =>
      request<ContractTemplate>('GET', '/api/contracts/admin/template'),

    update: (data: { title?: string; body?: string }) =>
      request<ContractTemplate>('PUT', '/api/contracts/admin/template', data),
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

  public: {
    landingStats: () =>
      request<LandingStats>('GET', '/api/public/landing-stats'),
    comingSoon: () =>
      request<{ comingSoon: boolean }>('GET', '/api/public/coming-soon'),
    platformFlags: () =>
      request<PlatformFlags>('GET', '/api/public/platform-flags'),
    siteInfo: () =>
      request<SiteInfo>('GET', '/api/public/site-info'),
    legalDoc: (slug: 'privacy-policy' | 'terms' | 'guidelines') =>
      request<{ sections: LegalSection[]; lastUpdated: string | null }>('GET', `/api/legal/${slug}`),
    faqs: () =>
      request<HelpArticle[]>('GET', '/api/faq'),
    successStories: () =>
      request<Pick<ApiSuccessStory, 'id' | 'name' | 'role' | 'quote' | 'photoUrl'>[]>('GET', '/api/success-stories'),
  },

  visitorChat: {
    list: (params?: { status?: 'OPEN' | 'CLOSED'; page?: number; limit?: number }) =>
      request<VisitorChat[]>('GET', '/api/admin/visitor-chats', undefined, params as Record<string, string | number | undefined>),

    getMessages: (chatId: string) =>
      request<VisitorMessage[]>('GET', `/api/admin/visitor-chats/${chatId}/messages`),

    sendMessage: (chatId: string, content: string) =>
      request<VisitorMessage>('POST', `/api/admin/visitor-chats/${chatId}/messages`, { content }),

    markSeen: (chatId: string) =>
      request<VisitorChat>('PUT', `/api/admin/visitor-chats/${chatId}/seen`),

    updateStatus: (chatId: string, status: 'OPEN' | 'CLOSED') =>
      request<VisitorChat>('PATCH', `/api/admin/visitor-chats/${chatId}/status`, { status }),
  },
};
