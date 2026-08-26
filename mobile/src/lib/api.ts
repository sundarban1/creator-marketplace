import { storage }                                from '@/utilities/storage';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY }  from '@/utilities/constants';
import { getCachedDeviceId } from '@/utilities/deviceId';
import { network } from './network';

export class OfflineError extends Error {
  constructor() {
    super("You're offline. Please check your connection.");
    this.name = 'OfflineError';
  }
}

// Carries the HTTP status and any machine-readable `code` the backend sent
// alongside its error message (see AppError's `data` param on the backend) —
// e.g. AI generation's NO_CAMPAIGN_INTENT — so callers can branch on it
// instead of string-matching `message`, which is free to change wording.
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:3000';

// ── Response envelope ──────────────────────────────────────────────────────────
export interface ApiEnvelope<T> {
  success:     boolean;
  message?:    string;
  data:        T;
  pagination?: {
    total:      number;
    page:       number;
    limit:      number;
    totalPages: number;
  };
}

// ── Auth response shapes ───────────────────────────────────────────────────────
export interface ApiAuthUser {
  id:              string;
  email:           string;
  phone:           string | null;
  role:            'CREATOR' | 'BUSINESS' | 'ADMIN';
  name:            string;
  avatar:          string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isOnboarded:     boolean;
  createdAt:       string;
}

export interface ApiLoginResponse {
  accessToken:  string;
  refreshToken: string;
  user:         ApiAuthUser;
}

// ── Social Account shape ───────────────────────────────────────────────────────
export interface ApiSocialAccount {
  id:               string;
  creatorProfileId: string;
  platform:         string;
  profileUrl:       string;
  followers:        number;
  connectedViaOAuth: boolean;
  avatarUrl:        string | null;
  // Last time `followers` was actually re-fetched from the platform — the follower
  // count keeps updating itself automatically in the background, this is just so
  // the UI can show "Updated 3h ago". Null for a manually-typed (non-OAuth) account.
  followersSyncedAt: string | null;
  createdAt:        string;
  updatedAt:        string;
}

// ── Campaign shapes ────────────────────────────────────────────────────────────
export interface ApiCampaign {
  id:            string;
  title:         string;
  description:   string;
  template?:     string | null;
  featureImageUrl?: string | null;
  category:      string;
  categoryKey:   string;
  goals:         string[];
  platforms:     string[];
  minFollowers:  number;
  contentType:   string;
  deliverables:  string;
  paymentType:   string;
  deadline:      string;
  location?:     string | null;
  locationLat?:  number | null;
  locationLng?:  number | null;
  locationType?: 'ONSITE' | 'REMOTE';
  budgetMin:     number;
  budgetMax:     number;
  status:        'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'EXPIRED';
  isFeatured:    boolean;
  creatorsNeeded?: number;
  createdAt:     string;
  paymentStatus: 'UNPAID' | 'PAID' | 'RELEASED';
  paidAt:        string | null;
  paymentMethod: string | null;
  targetAudience?:       string[];
  hashtags?:             string[];
  sampleCaption?:        string | null;
  aiGenerated?:           boolean;
  aiSuggestedCategories?: string[];
  // AI-determined (or business-corrected) job-completion type for the simple
  // single-category case — null until classified. Multi-requirement
  // campaigns use each ApiCampaignRequirement's own fields instead.
  completionType?:   'SERVICE' | 'DELIVERABLE' | null;
  completionReason?: string | null;
  distanceKm?:   number;
  business:      { businessName: string; logoUrl: string | null };
  _count:        { applications: number };
  // Applications received in the last 72h — the velocity signal the Discover
  // feed's Trending tab ranks on. Only the list/nearby endpoints compute it;
  // absent (not 0) elsewhere. See CampaignRepository.countRecentApplications.
  recentProposals?: number;
  // Present only for multi-role campaigns — undefined for the simple
  // single-category case every campaign used before CampaignRequirement.
  requirements?: ApiCampaignRequirement[];
}

export interface ApiCampaignRequirement {
  id: string;
  categoryId: string;
  category: { id: string; name: string; key: string; icon: string; color: string };
  quantity: number;
  budgetType: 'FIXED' | 'RANGE' | 'NEGOTIABLE';
  budgetFixed: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  deliverables: string | null;
  deadline: string | null;
  completionType?:   'SERVICE' | 'DELIVERABLE' | null;
  completionReason?: string | null;
  acceptedCount: number;
}

// ── Messaging shapes ───────────────────────────────────────────────────────────
export interface ApiConversation {
  id:             string;
  creatorId:      string;
  creatorId2?:    string | null;
  businessId:     string | null;
  campaignId?:    string | null;
  status:         'PENDING' | 'ACCEPTED' | 'DECLINED';
  requestMessage?: string | null;
  lastMessageAt?:  string | null;
  createdAt:      string;
  unreadCount:    number;
  creator?:       { fullName: string; avatarUrl: string | null; userId?: string };
  creator2?:      { fullName: string; avatarUrl: string | null; userId?: string };
  business?:      { businessName: string; logoUrl: string | null; userId?: string };
  campaign?:      { title: string } | null;
  messages:       ApiMessage[];
  otherPartyRole: 'CREATOR' | 'BUSINESS';
  otherPartyProfileId: string;
  otherParty:     { fullName: string | null; avatarUrl: string | null; userId?: string } | null;
}

export interface ApiMessage {
  id:             string;
  conversationId: string;
  senderId:       string;
  content:        string;
  type:           'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO' | 'VOICE';
  attachmentUrl:  string | null;
  attachmentName: string | null;
  attachmentThumbnailUrl?: string | null;
  attachmentDurationSec?:  number | null;
  attachmentWidth?:        number | null;
  attachmentHeight?:       number | null;
  attachmentSize?:         number | null;
  attachmentFormat?:       string | null;
  attachmentStatus?:       'PROCESSING' | 'READY' | 'FAILED' | null;
  attachmentWaveform?:     string | null;
  createdAt:      string;
  isDeleted?:     boolean;
  editedAt?:      string;
  sender:         { id: string; email: string; role: string };
}

// ── Language preference ────────────────────────────────────────────────────────
// Kept as a module-level variable so buildHeaders() can read it without React context.
let _currentLanguage = 'en';

export function setApiLanguage(lang: string): void {
  _currentLanguage = lang;
}

// ── Session expiry handler ─────────────────────────────────────────────────────
// AuthContext registers its logout function here so any failed token refresh
// automatically clears the user and redirects to login without requiring
// every individual screen to handle the error.

let _sessionExpiredHandler: (() => void) | null = null;
let _sessionExpiredFired   = false;

export function setSessionExpiredHandler(fn: () => void): void {
  _sessionExpiredHandler = fn;
  _sessionExpiredFired   = false; // reset guard when a new session begins
}

export function clearSessionExpiredGuard(): void {
  _sessionExpiredFired = false;
}

function fireSessionExpired(): void {
  // Guard: only fire once per session so concurrent failing requests don't
  // trigger multiple logouts.
  if (_sessionExpiredFired) return;
  _sessionExpiredFired = true;
  _sessionExpiredHandler?.();
}

// ── Core fetch ─────────────────────────────────────────────────────────────────

// Render's free tier spins the backend down after inactivity — a cold start
// can take 30-60s (occasionally longer). Without a ceiling here, a fetch made
// right after the app resumes from background can hang indefinitely, which
// reads to the user as the app being stuck on the splash/loading screen.
const REQUEST_TIMEOUT_MS = 30000;

async function fetchWithTimeout(url: string, opts: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) throw new Error('The server is taking too long to respond. Please try again.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Cold-start warm-up ────────────────────────────────────────────────────────

// Render's free plan spins the backend down after ~15 min of inactivity, and a
// cold start takes 30-60s — longer than most of this app's request budgets, so
// the first call after an idle period aborts and the screen falls back. Screens
// that are about to make an expensive call (create-event's AI generate) fire
// this on mount, giving the instance time to boot while the brand is still
// typing their prompt. Fire-and-forget: /health needs no auth, runs a
// `SELECT 1` (so it warms the Prisma pool too), and a failure here is
// irrelevant — the real request will report its own error.
const WARM_UP_MIN_INTERVAL_MS = 60_000;
let lastWarmUpAt = 0;

export function warmUpBackend(): void {
  if (!network.isOnline()) return;
  const now = Date.now();
  // A screen remounting (tab switch, back navigation) shouldn't re-ping a
  // backend that was already woken seconds ago.
  if (now - lastWarmUpAt < WARM_UP_MIN_INTERVAL_MS) return;
  lastWarmUpAt = now;
  // Generous ceiling on purpose: aborting early would defeat the point, since
  // the whole reason for this call is that a cold boot can take up to a minute.
  void fetchWithTimeout(`${API_BASE}/health`, { method: 'GET' }, 60_000).catch(() => {});
}

// Thrown only when the refresh token itself is genuinely missing/rejected —
// distinct from a network/timeout failure, which shouldn't log the user out
// (e.g. a cold Render backend timing out on refresh isn't an expired session).
class AuthRefreshInvalidError extends Error {}

let pendingRefresh: Promise<string> | null = null;

// Exposed so the socket client can force a token refresh after a stale-auth
// reconnect rejection, without waiting for a REST call to hit a 401 first.
export async function ensureFreshAccessToken(): Promise<string | null> {
  if (!storage.get(REFRESH_TOKEN_KEY)) return null;
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
  const rt = storage.get(REFRESH_TOKEN_KEY);
  if (!rt) throw new AuthRefreshInvalidError('No refresh token');

  const res = await fetchWithTimeout(`${API_BASE}/api/auth/refresh`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refreshToken: rt }),
  });

  if (!res.ok) throw new AuthRefreshInvalidError('Refresh failed');

  const json = await res.json() as ApiEnvelope<{ accessToken: string; refreshToken?: string }>;
  const newAccessToken = json.data.accessToken;
  await storage.set(ACCESS_TOKEN_KEY, newAccessToken);

  // Some backends rotate the refresh token on every refresh — persist it if
  // the response includes a new one.
  if (json.data.refreshToken) {
    await storage.set(REFRESH_TOKEN_KEY, json.data.refreshToken);
  }

  return newAccessToken;
}

export async function request<T>(
  method:  string,
  path:    string,
  body?:   unknown,
  params?: Record<string, string | number | undefined>,
  timeoutMs?: number,
): Promise<ApiEnvelope<T>> {
  // Fail fast instead of waiting out the 30s timeout when we already know
  // there's no connection — NetInfo's cached state is checked synchronously.
  if (!network.isOnline()) throw new OfflineError();

  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  function buildHeaders(token?: string): Record<string, string> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Timezone':   Intl.DateTimeFormat().resolvedOptions().timeZone,
      'X-Language':   _currentLanguage,
    };
    const t = token ?? storage.get(ACCESS_TOKEN_KEY);
    if (t) h['Authorization'] = `Bearer ${t}`;
    const deviceId = getCachedDeviceId();
    if (deviceId) h['X-Device-Id'] = deviceId;
    return h;
  }

  const fetchOpts = (token?: string) => ({
    method,
    headers: buildHeaders(token),
    body:    body != null ? JSON.stringify(body) : undefined,
  });

  // ── Retry on 529 / 503 (server temporarily overloaded) ───────────────────
  const RETRYABLE = new Set([503, 529]);
  let attempt = 0;
  let res = await fetchWithTimeout(url.toString(), fetchOpts(), timeoutMs);
  while (RETRYABLE.has(res.status) && attempt < 3) {
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    attempt++;
    res = await fetchWithTimeout(url.toString(), fetchOpts(), timeoutMs);
  }

  // ── Token refresh on 401 ───────────────────────────────────────────────────
  if (res.status === 401 && storage.get(REFRESH_TOKEN_KEY)) {
    // De-duplicate concurrent refresh calls
    if (!pendingRefresh) {
      pendingRefresh = refreshAccessToken().finally(() => { pendingRefresh = null; });
    }

    try {
      const newToken = await pendingRefresh;
      res = await fetchWithTimeout(url.toString(), fetchOpts(newToken), timeoutMs);
    } catch (err) {
      // Only a genuinely invalid/expired refresh token logs the user out —
      // a network/timeout failure (e.g. a cold backend) should surface as a
      // retryable error instead of discarding a still-valid session.
      if (err instanceof AuthRefreshInvalidError) {
        fireSessionExpired();
        throw new Error('Your session has expired. Please sign in again.');
      }
      throw err;
    }
  }

  // ── Parse response ─────────────────────────────────────────────────────────
  const json = await res.json() as ApiEnvelope<T> & { errors?: { field: string; message: string }[]; code?: string };

  if (!res.ok) {
    const fieldErrors = json.errors?.map((e) => e.message).join('. ');
    throw new ApiError(fieldErrors ?? json.message ?? `Request failed (${res.status})`, res.status, json.code);
  }

  return json;
}
