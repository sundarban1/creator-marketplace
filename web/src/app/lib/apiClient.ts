/**
 * Marketplace web app REST client.
 *
 * Kolab's backend is a plain REST API (Express, `/api/*`) — the same one the
 * mobile app and the admin dashboard already call. This client is the
 * marketplace web app's door to it: creator + business surfaces at
 * `/creator/*` and `/business/*`.
 *
 * It is deliberately SEPARATE from `src/lib/api.ts` (the admin client):
 *  - the admin app stores its tokens under `ch_admin_*` and is ADMIN-only;
 *  - a creator or business signing into the web app must not clobber — or be
 *    clobbered by — an admin session open in the same browser.
 *
 * So this module owns its own token namespace (`kolab_*`) and its own
 * 401 -> refresh -> retry loop, mirroring mobile's `lib/api.ts` semantics
 * (response envelope, typed errors carrying the backend `code`).
 */

// ── Config ────────────────────────────────────────────────────────────────────

/** Same env var the admin client reads, so both halves of `web/` hit one API. */
export const API_BASE =
  (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3000';

// ── Response envelope ─────────────────────────────────────────────────────────

export interface ApiPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: ApiPagination;
}

// ── Errors ────────────────────────────────────────────────────────────────────

/**
 * Any non-2xx response. Carries the HTTP `status`, the backend's
 * machine-readable `code` (from `AppError`'s `data.code` — e.g.
 * `ACCOUNT_LINKING_REQUIRED`), and the rest of the error envelope's fields
 * (`details` — e.g. Sign in with Apple's `appleLinkToken`) so callers branch on
 * `code`/`details` instead of string-matching a message that's free to reword.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code?: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** The browser could not reach the API at all (offline, DNS, CORS, dead server). */
export class NetworkError extends Error {
  constructor() {
    super('Could not reach Kolab. Check your connection and try again.');
    this.name = 'NetworkError';
  }
}

// ── Token store ───────────────────────────────────────────────────────────────

const KEY_ACCESS = 'kolab_access';
const KEY_REFRESH = 'kolab_refresh';
const KEY_USER = 'kolab_user';

export function getAccessToken(): string | null {
  return localStorage.getItem(KEY_ACCESS);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(KEY_REFRESH);
}

export function setTokens(access: string, refresh?: string): void {
  localStorage.setItem(KEY_ACCESS, access);
  if (refresh) localStorage.setItem(KEY_REFRESH, refresh);
}

export function clearSession(): void {
  [KEY_ACCESS, KEY_REFRESH, KEY_USER].forEach((k) => localStorage.removeItem(k));
}

export function readStoredUser<T>(): T | null {
  try {
    const raw = localStorage.getItem(KEY_USER);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeStoredUser(user: unknown): void {
  localStorage.setItem(KEY_USER, JSON.stringify(user));
}

// ── Session lifecycle events ──────────────────────────────────────────────────

/**
 * - `ended`: the stored session is gone. A refresh token was rejected, a 401
 *   came back with no refresh token left to try, or another tab signed out.
 * - `started`: another tab signed in, so its session is now in shared storage.
 *
 * The React auth context (AppAuthContext) subscribes to these events. Without
 * them, this module could wipe the tokens while the UI still thought it was
 * `authenticated`. Every protected poll (notifications, badge, …) and every
 * user action (payment initiate, …) then went out with no Authorization header
 * and failed with "No token provided" on every window focus until a reload.
 */
export type SessionEvent = 'ended' | 'started';

const sessionListeners = new Set<(e: SessionEvent) => void>();

function emitSession(e: SessionEvent): void {
  sessionListeners.forEach((fn) => fn(e));
}

export function onSessionChange(fn: (e: SessionEvent) => void): () => void {
  sessionListeners.add(fn);
  return () => {
    sessionListeners.delete(fn);
  };
}

/** Clears the stored session and tells the auth context it is over. */
function endSession(): void {
  clearSession();
  emitSession('ended');
}

// localStorage is shared by every tab, but a `storage` event fires only in the
// *other* tabs. That makes it the cross-tab signal: a logout or rejected
// refresh in one tab must stop this tab's pollers too.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY_REFRESH && e.key !== null) return; // null = storage.clear()
    if (!localStorage.getItem(KEY_REFRESH)) emitSession('ended');
    else if (e.oldValue === null && e.key === KEY_REFRESH) emitSession('started');
  });
}

// ── Core fetch ────────────────────────────────────────────────────────────────

/**
 * A 401 from these means "bad credentials" / "invalid refresh token", NOT "your
 * access token expired" — so they must never trigger the silent refresh-retry
 * (which would mask "Invalid phone or password" behind "session expired").
 */
const NO_REFRESH_RETRY = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/verify-otp',
  '/api/auth/resend-otp',
  '/api/auth/google',
  '/api/auth/facebook',
  '/api/auth/apple',
  '/api/auth/forgot-password',
  '/api/auth/verify-reset-otp',
  '/api/auth/reset-password',
]);

/** In-flight refresh, shared so a burst of parallel 401s triggers one refresh. */
let pendingRefresh: Promise<string | null> | null = null;

/**
 * Exchange the refresh token for a fresh access token. Returns `null` (rather
 * than redirecting) when there's nothing to refresh or the refresh is rejected —
 * the caller (React auth context) decides what a dead session looks like, so
 * this module never touches `window.location`.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const rt = getRefreshToken();
  if (!rt) return null;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
  } catch {
    // Network blip — keep the tokens, let the caller retry later.
    return null;
  }

  if (!res.ok) {
    // Only an explicit rejection of the refresh token ends the session. A 5xx
    // from a restarting/cold backend or a 429 is transient — wiping the tokens
    // there logged users out after a few idle hours for no real reason.
    if (res.status === 401 || res.status === 403) endSession();
    return null;
  }

  let json: ApiEnvelope<{ accessToken: string; refreshToken?: string }>;
  try {
    json = (await res.json()) as typeof json;
  } catch {
    return null; // garbled body (proxy error page) — transient, keep the session
  }
  // A logout (here or in another tab) that landed while this refresh was in
  // flight already ended the session — don't resurrect it with a fresh token.
  if (getRefreshToken() !== rt) return null;
  setTokens(json.data.accessToken, json.data.refreshToken);
  return json.data.accessToken;
}

/**
 * Single-flight refresh: every caller that arrives while a refresh is running
 * (a burst of parallel 401s, the socket, session restore) shares the same
 * request instead of firing its own.
 */
export function ensureFreshAccessToken(): Promise<string | null> {
  if (!pendingRefresh) {
    pendingRefresh = refreshAccessToken().finally(() => {
      pendingRefresh = null;
    });
  }
  return pendingRefresh;
}

/**
 * Shared 401 path for every transport (JSON, multipart, XHR). Returns a fresh
 * token to retry with once, or `null` to give up. If no refresh token is left
 * (it was never there, or the refresh was just rejected), nothing can recover
 * this session, so the auth context is told it ended. A network failure during
 * refresh keeps the refresh token and so never ends the session.
 */
async function recoverFrom401(): Promise<string | null> {
  const fresh = await ensureFreshAccessToken();
  if (!fresh && !getRefreshToken()) emitSession('ended');
  return fresh;
}

type QueryParams = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  params?: QueryParams;
  /** Skip the Authorization header even if a token is present (public reads). */
  anonymous?: boolean;
  signal?: AbortSignal;
  /** Let the request outlive the page (tab close / navigation) — used for the
   *  guided creator's final autosave. Body must stay under ~64KB. */
  keepalive?: boolean;
}

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function parseError(res: Response): Promise<ApiError> {
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    /* non-JSON error body */
  }
  const message =
    typeof body['message'] === 'string' ? (body['message'] as string) : `Request failed (${res.status})`;
  const code = typeof body['code'] === 'string' ? (body['code'] as string) : undefined;
  const details = { ...body };
  delete details['message'];
  delete details['code'];
  delete details['success'];
  return new ApiError(message, res.status, code, details);
}

/**
 * JSON request against the API. Adds the bearer token, transparently refreshes
 * it once on a 401, and unwraps the `{ success, data }` envelope — returning the
 * FULL envelope so paginated callers can read `.pagination`.
 */
export async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: RequestOptions = {},
): Promise<ApiEnvelope<T>> {
  const url = buildUrl(path, opts.params);

  const headers = (token: string | null): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token && !opts.anonymous) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  const send = (token: string | null): Promise<Response> =>
    fetch(url, {
      method,
      headers: headers(token),
      body: body != null ? JSON.stringify(body) : undefined,
      signal: opts.signal,
      keepalive: opts.keepalive,
    });

  let res: Response;
  try {
    res = await send(getAccessToken());
  } catch {
    throw new NetworkError();
  }

  if (res.status === 401 && !opts.anonymous && !NO_REFRESH_RETRY.has(path)) {
    const fresh = await recoverFrom401();
    if (fresh) {
      try {
        res = await send(fresh);
      } catch {
        throw new NetworkError();
      }
    }
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return { success: true, data: undefined as T };
  return (await res.json()) as ApiEnvelope<T>;
}

/** Convenience wrapper for the common case — just the `data` payload. */
export async function api<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: RequestOptions,
): Promise<T> {
  return (await apiRequest<T>(method, path, body, opts)).data;
}

// ── Multipart upload ──────────────────────────────────────────────────────────

/**
 * Multipart POST (deliverables, avatars, withdrawal proofs). The browser must
 * set its own `multipart/form-data; boundary=...`, so this can't go through
 * `apiRequest`. Mirrors its 401 -> refresh -> retry.
 */
export async function apiUpload<T>(
  path: string,
  form: FormData,
  method = 'POST',
): Promise<T> {
  const send = (token: string | null): Promise<Response> =>
    fetch(`${API_BASE}${path}`, {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });

  let res: Response;
  try {
    res = await send(getAccessToken());
  } catch {
    throw new NetworkError();
  }

  if (res.status === 401) {
    const fresh = await recoverFrom401();
    if (fresh) {
      try {
        res = await send(fresh);
      } catch {
        throw new NetworkError();
      }
    }
  }

  if (!res.ok) throw await parseError(res);
  return ((await res.json()) as ApiEnvelope<T>).data;
}

/**
 * Same as `apiUpload`, but driven by `XMLHttpRequest` instead of `fetch` so the
 * caller can observe upload progress (`fetch` has no cross-browser upload
 * progress event) — used for the chat attachment progress bar. Mirrors
 * `apiUpload`'s 401 -> refresh -> retry and error-envelope parsing.
 */
export async function apiUploadWithProgress<T>(
  path: string,
  form: FormData,
  onProgress?: (fraction: number) => void,
): Promise<T> {
  const send = (token: string | null): Promise<{ status: number; body: unknown }> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}${path}`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (onProgress && e.lengthComputable) onProgress(e.loaded / e.total);
      };
      xhr.onerror = () => reject(new NetworkError());
      xhr.onload = () => {
        let body: unknown = {};
        try {
          body = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        } catch {
          /* non-JSON error body */
        }
        resolve({ status: xhr.status, body });
      };
      xhr.send(form);
    });

  let res = await send(getAccessToken());

  if (res.status === 401) {
    const fresh = await recoverFrom401();
    if (fresh) res = await send(fresh);
  }

  if (res.status < 200 || res.status >= 300) {
    const body = (res.body ?? {}) as Record<string, unknown>;
    const message = typeof body['message'] === 'string' ? (body['message'] as string) : `Request failed (${res.status})`;
    const code = typeof body['code'] === 'string' ? (body['code'] as string) : undefined;
    const details = { ...body };
    delete details['message'];
    delete details['code'];
    delete details['success'];
    throw new ApiError(message, res.status, code, details);
  }

  return (res.body as ApiEnvelope<T>).data;
}
