import { storage }                                from '@/utilities/storage';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY }  from '@/utilities/constants';

// For iOS simulator use localhost; for Android emulator use 10.0.2.2
export const API_BASE = 'http://localhost:3000';

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
  role:            'CREATOR' | 'BUSINESS' | 'ADMIN';
  name:            string;
  avatar:          string | null;
  isEmailVerified: boolean;
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
  createdAt:        string;
  updatedAt:        string;
}

// ── Campaign shapes ────────────────────────────────────────────────────────────
export interface ApiCampaign {
  id:           string;
  title:        string;
  description:  string;
  template?:    string | null;
  category:     string;
  goals:        string[];
  platform:     string;
  minFollowers: number;
  contentType:  string;
  deliverables: string;
  paymentType:  string;
  deadline:     string;
  location?:    string | null;
  budgetMin:    number;
  budgetMax:    number;
  status:       'ACTIVE' | 'PAUSED' | 'CLOSED';
  isFeatured:   boolean;
  createdAt:    string;
  business:     { businessName: string; logoUrl: string | null };
  _count:       { applications: number };
}

// ── Messaging shapes ───────────────────────────────────────────────────────────
export interface ApiConversation {
  id:             string;
  creatorId:      string;
  businessId:     string;
  campaignId?:    string | null;
  status:         'PENDING' | 'ACCEPTED' | 'DECLINED';
  requestMessage?: string | null;
  lastMessageAt?:  string | null;
  createdAt:      string;
  creator?:       { fullName: string; avatarUrl: string | null };
  business?:      { businessName: string; logoUrl: string | null };
  campaign?:      { title: string } | null;
  messages:       ApiMessage[];
}

export interface ApiMessage {
  id:             string;
  conversationId: string;
  senderId:       string;
  content:        string;
  createdAt:      string;
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

let pendingRefresh: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const rt = storage.get(REFRESH_TOKEN_KEY);
  if (!rt) throw new Error('No refresh token');

  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refreshToken: rt }),
  });

  if (!res.ok) throw new Error('Refresh failed');

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
): Promise<ApiEnvelope<T>> {
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
  let res = await fetch(url.toString(), fetchOpts());
  while (RETRYABLE.has(res.status) && attempt < 3) {
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    attempt++;
    res = await fetch(url.toString(), fetchOpts());
  }

  // ── Token refresh on 401 ───────────────────────────────────────────────────
  if (res.status === 401 && storage.get(REFRESH_TOKEN_KEY)) {
    // De-duplicate concurrent refresh calls
    if (!pendingRefresh) {
      pendingRefresh = refreshAccessToken().finally(() => { pendingRefresh = null; });
    }

    try {
      const newToken = await pendingRefresh;
      res = await fetch(url.toString(), fetchOpts(newToken));
    } catch {
      // Refresh token is expired or invalid — log the user out silently
      fireSessionExpired();
      throw new Error('Your session has expired. Please sign in again.');
    }
  }

  // ── Parse response ─────────────────────────────────────────────────────────
  const json = await res.json() as ApiEnvelope<T> & { errors?: { field: string; message: string }[] };

  if (!res.ok) {
    const fieldErrors = json.errors?.map((e) => e.message).join('. ');
    throw new Error(fieldErrors ?? json.message ?? `Request failed (${res.status})`);
  }

  return json;
}
