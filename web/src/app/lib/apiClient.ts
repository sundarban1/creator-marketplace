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
    clearSession();
    return null;
  }

  const json = (await res.json()) as ApiEnvelope<{ accessToken: string; refreshToken?: string }>;
  setTokens(json.data.accessToken, json.data.refreshToken);
  return json.data.accessToken;
}

export function ensureFreshAccessToken(): Promise<string | null> {
  if (!pendingRefresh) {
    pendingRefresh = refreshAccessToken().finally(() => {
      pendingRefresh = null;
    });
  }
  return pendingRefresh;
}

type QueryParams = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  params?: QueryParams;
  /** Skip the Authorization header even if a token is present (public reads). */
  anonymous?: boolean;
  signal?: AbortSignal;
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
    });

  let res: Response;
  try {
    res = await send(getAccessToken());
  } catch {
    throw new NetworkError();
  }

  if (res.status === 401 && !opts.anonymous && !NO_REFRESH_RETRY.has(path)) {
    const fresh = await ensureFreshAccessToken();
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
    const fresh = await ensureFreshAccessToken();
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
