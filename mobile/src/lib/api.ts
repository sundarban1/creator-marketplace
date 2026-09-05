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

// Thrown by fetchWithTimeout when the abort timer fires — a distinct type so
// callers (and multipart callers outside request()) can tell a timeout apart
// from a genuine server error. Message is user-facing.
export class RequestTimeoutError extends Error {
  constructor() {
    super('The server is taking too long to respond. Please try again.');
    this.name = 'RequestTimeoutError';
  }
}

// Carries the HTTP status and any machine-readable `code` the backend sent
// alongside its error message (see AppError's `data` param on the backend) —
// e.g. AI generation's NO_CAMPAIGN_INTENT — so callers can branch on it
// instead of string-matching `message`, which is free to change wording.
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  // The rest of the error envelope (AppError's `data` fields are spread onto it
  // server-side) — e.g. Sign in with Apple's ACCOUNT_LINKING_REQUIRED carries an
  // `appleLinkToken` here alongside `code`.
  readonly details?: Record<string, unknown>;
  constructor(message: string, status: number, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
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
  // True while `email` is a placeholder minted because Sign in with Apple
  // withheld the real address — the user must complete /add-email first.
  emailIsPlaceholder?: boolean;
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
  status:         'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CLOSED';
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

// Read by the multipart callers below that build their own headers instead of
// going through request()/buildHeaders() — so uploads carry X-Language too.
export function getApiLanguage(): string {
  return _currentLanguage;
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

// A deploy/restart can leave the next request hitting a booting instance
// (30-60s, occasionally longer). Without a ceiling here — covering both the
// fetch and the body read (see fetchWithTimeout) — a request made right after
// the app resumes from background can hang indefinitely, which reads to the
// user as the app being stuck on the splash/loading screen.
const REQUEST_TIMEOUT_MS = 30000;

// Named ceilings for the multipart callers that can't go through request() but
// still want the same bounded round-trip (uploadImage, chat attachments,
// audioTranscribe, the Google Places/geocode calls).
export const API_TIMEOUT_MS    = REQUEST_TIMEOUT_MS;
export const AI_TIMEOUT_MS      = 60_000;
export const UPLOAD_TIMEOUT_MS  = 120_000;

// Returns the response together with its already-read body text. The body is
// read here, under the *same* abort timer as the fetch — a half-open socket
// (common when the device resumes from sleep) can deliver the response headers
// and then stall the body indefinitely, and `res.json()` / `res.text()` have no
// timeout of their own, so a caller awaiting the body would hang forever with
// the loading spinner stuck. Consuming it here means the whole round-trip is
// bounded by `timeoutMs`.
export interface TimedResponse { res: Response; text: string; }

export async function fetchWithTimeout(url: string, opts: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<TimedResponse> {
  const controller = new AbortController();
  let timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    // Headers are in. Re-arm the timer for the body read so it gets its own
    // full window rather than whatever's left of the first one — a slow-but-
    // working response shouldn't abort mid-body, but a stalled body still
    // can't hang forever.
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(), timeoutMs);
    const text = await res.text();
    return { res, text };
  } catch (err) {
    if (controller.signal.aborted) throw new RequestTimeoutError();
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function parseEnvelope<T>(text: string): T {
  // A 204 or a proxy's empty error page leaves nothing to parse — treat it as
  // an empty envelope rather than throwing a confusing SyntaxError.
  return (text ? JSON.parse(text) : {}) as T;
}

// Fail fast instead of waiting out the timeout when we already know there's no
// connection — NetInfo's cached state is checked synchronously. Shared with the
// multipart callers that can't go through request().
export function assertOnline(): void {
  if (!network.isOnline()) throw new OfflineError();
}

// Decodes a JWT's `exp` claim (seconds since the epoch) to milliseconds,
// WITHOUT verifying the signature — this is only used to decide when to
// proactively refresh, never for trust. Returns null if the token can't be
// read, in which case callers fall back to the reactive 401 path.
function accessTokenExpiryMs(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const b64  = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof atob === 'function' ? atob(b64) : '';
    if (!json) return null;
    const exp = (JSON.parse(json) as { exp?: number }).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

// Refresh this many ms before the access token's actual expiry so a request
// fired right on the boundary still goes out with a valid token.
const PROACTIVE_REFRESH_SKEW_MS = 2 * 60 * 1000;

// ── Cold-start warm-up ────────────────────────────────────────────────────────

// The backend no longer spins down on idle (paid Render plan), but a deploy,
// restart or OOM-recovery still leaves the next request hitting a booting
// instance. Screens about to make an expensive call (create-event's AI
// generate) and the app on resume-from-background fire this so the instance is
// warm by the time the real request goes out. Fire-and-forget: /health needs
// no auth, runs a `SELECT 1` (so it warms the Prisma pool too), and a failure
// here is irrelevant — the real request will report its own error.
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

// Whether the stored access token is missing, unreadable, or within the skew
// window of expiring — i.e. worth refreshing before the next request rather
// than letting that request eat a 401 + refresh + retry round-trip.
function accessTokenNeedsRefresh(): boolean {
  const at = storage.get(ACCESS_TOKEN_KEY);
  if (!at) return true;
  const expiry = accessTokenExpiryMs(at);
  if (expiry === null) return false; // unreadable — leave it to the 401 path
  return Date.now() >= expiry - PROACTIVE_REFRESH_SKEW_MS;
}

// Thrown only when the refresh token itself is genuinely missing/rejected —
// distinct from a network/timeout failure, which shouldn't log the user out
// (e.g. a cold Render backend timing out on refresh isn't an expired session).
class AuthRefreshInvalidError extends Error {}

let pendingRefresh: Promise<string> | null = null;

// ── In-flight GET de-duplication ──────────────────────────────────────────────
// When several components mount at once and each asks for the same resource
// (requirement §9), only the first actually hits the network — the rest await
// the same promise. Keyed by the fully-resolved URL + language + auth identity.
// Only GETs are coalesced; writes are never idempotent.
const inflightGets = new Map<string, Promise<ApiEnvelope<unknown>>>();

// Every follower of a coalesced GET gets its own copy of the envelope, so one
// caller mutating the result in place (sorting a list, etc.) can't corrupt
// another's view of it.
function cloneEnvelope<T>(env: ApiEnvelope<T>): ApiEnvelope<T> {
  const sc = (globalThis as { structuredClone?: <V>(v: V) => V }).structuredClone;
  if (sc) {
    try { return sc(env); } catch { /* not cloneable — fall through to JSON */ }
  }
  return JSON.parse(JSON.stringify(env)) as ApiEnvelope<T>;
}

// Exposed so the socket client can force a token refresh after a stale-auth
// reconnect rejection, and so the app can renew a near-expired token on resume
// from background — both without waiting for a REST call to hit a 401 first.
//
// `force: true` refreshes unconditionally (the socket's case — it already knows
// the token was rejected). The default only refreshes when the access token is
// missing or within the skew window of expiry, so a routine foreground with a
// still-valid token costs nothing.
export async function ensureFreshAccessToken(opts?: { force?: boolean }): Promise<string | null> {
  if (!storage.get(REFRESH_TOKEN_KEY)) return null;
  if (!opts?.force && !accessTokenNeedsRefresh()) return storage.get(ACCESS_TOKEN_KEY) ?? null;
  if (!pendingRefresh) {
    pendingRefresh = refreshAccessToken().finally(() => { pendingRefresh = null; });
  }
  try {
    return await pendingRefresh;
  } catch (err) {
    // A genuinely invalid/expired refresh token means the session is over —
    // without this, a socket stuck in the connect_error → refresh → reject loop
    // (backend/src/socket.ts rejects every reconnect attempt) never surfaces
    // that to the user; it just retries forever with the same dead token. A
    // network/timeout failure isn't a dead session, so it falls through to null
    // and lets the next attempt retry.
    if (err instanceof AuthRefreshInvalidError) fireSessionExpired();
    return null;
  }
}

async function refreshAccessToken(): Promise<string> {
  const rt = storage.get(REFRESH_TOKEN_KEY);
  if (!rt) throw new AuthRefreshInvalidError('No refresh token');

  const { res, text } = await fetchWithTimeout(`${API_BASE}/api/auth/refresh`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refreshToken: rt }),
  });

  if (!res.ok) throw new AuthRefreshInvalidError('Refresh failed');

  const json = parseEnvelope<ApiEnvelope<{ accessToken: string; refreshToken?: string }>>(text);
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
  assertOnline();

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

  async function execute(): Promise<ApiEnvelope<T>> {
    // ── Proactive token refresh ─────────────────────────────────────────────
    // Refresh a soon-to-expire access token *before* firing the request, so the
    // common case (first action after the app has been idle past the 15-min
    // access-token lifetime) is a single round-trip instead of request → 401 →
    // refresh → retry. A failure here is swallowed — the request still goes out
    // with whatever token we have and the reactive 401 path below is the
    // backstop, including the session-expired logout.
    if (storage.get(REFRESH_TOKEN_KEY) && accessTokenNeedsRefresh()) {
      if (!pendingRefresh) {
        pendingRefresh = refreshAccessToken().finally(() => { pendingRefresh = null; });
      }
      try { await pendingRefresh; } catch { /* fall through to the request + 401 handling */ }
    }

    // ── Retry on 529 / 503 (server temporarily overloaded) ─────────────────
    const RETRYABLE = new Set([503, 529]);
    let attempt = 0;
    let { res, text } = await fetchWithTimeout(url.toString(), fetchOpts(), timeoutMs);
    while (RETRYABLE.has(res.status) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      attempt++;
      ({ res, text } = await fetchWithTimeout(url.toString(), fetchOpts(), timeoutMs));
    }

    // ── Token refresh on 401 ───────────────────────────────────────────────
    if (res.status === 401 && storage.get(REFRESH_TOKEN_KEY)) {
      // De-duplicate concurrent refresh calls
      if (!pendingRefresh) {
        pendingRefresh = refreshAccessToken().finally(() => { pendingRefresh = null; });
      }

      try {
        const newToken = await pendingRefresh;
        ({ res, text } = await fetchWithTimeout(url.toString(), fetchOpts(newToken), timeoutMs));
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

    // ── Parse response ─────────────────────────────────────────────────────
    // A proxy/CDN can answer with a non-JSON body (an HTML 502/504 page) —
    // surface that as the HTTP status rather than an opaque SyntaxError from
    // JSON.parse.
    let json: ApiEnvelope<T> & { errors?: { field: string; message: string }[]; code?: string };
    try {
      json = parseEnvelope(text);
    } catch {
      if (!res.ok) throw new ApiError(`Request failed (${res.status})`, res.status);
      throw new Error('The server returned an invalid response.');
    }

    if (!res.ok) {
      const fieldErrors = json.errors?.map((e) => e.message).join('. ');
      throw new ApiError(
        fieldErrors ?? json.message ?? `Request failed (${res.status})`,
        res.status,
        json.code,
        json as unknown as Record<string, unknown>,
      );
    }

    return json;
  }

  // ── In-flight GET de-duplication ─────────────────────────────────────────
  // A GET fired while an identical one is already in flight rides along on that
  // request instead of opening a second one. Keyed by the resolved URL +
  // language + auth identity so a logged-out and a logged-in caller never share
  // a result. Followers get a cloned envelope (see cloneEnvelope).
  const dedupeKey = method.toUpperCase() === 'GET'
    ? `${url.toString()}::${_currentLanguage}::${storage.get(ACCESS_TOKEN_KEY) ?? ''}`
    : null;

  if (dedupeKey) {
    const existing = inflightGets.get(dedupeKey);
    if (existing) return cloneEnvelope(await existing) as ApiEnvelope<T>;

    const p = execute();
    inflightGets.set(dedupeKey, p as Promise<ApiEnvelope<unknown>>);
    try {
      return await p;
    } finally {
      inflightGets.delete(dedupeKey);
    }
  }

  return execute();
}
