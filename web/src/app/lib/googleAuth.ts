/**
 * Google Sign-In for the web app via Google Identity Services (GIS).
 *
 * The backend's /api/auth/google verifies an OAuth2 **access token** (it calls
 * googleapis.com/oauth2/v2/userinfo), so this uses the GIS token client, not
 * the one-tap ID-token flow.
 *
 * Setup: the client id's "Authorised JavaScript origins" in Google Cloud
 * Console must include every origin this runs on (http://localhost:5173,
 * https://kolab.com.np, https://www.kolab.com.np, the *.onrender.com preview URL).
 */

import { NetworkError, ApiError } from './apiClient';

export const GOOGLE_CLIENT_ID =
  (import.meta.env['VITE_GOOGLE_CLIENT_ID'] as string | undefined) ??
  '543768819635-6mhj10fgm73eboahjnhttogaihn068if.apps.googleusercontent.com';

const GIS_SRC = 'https://accounts.google.com/gsi/client';

/** How long to wait for GIS to resolve before treating the attempt as stuck. */
const AUTH_TIMEOUT_MS = 45_000;

/**
 * Distinguishes *why* a Google sign-in attempt didn't produce a token, so the
 * UI can show the right one of spec §7's error-modal states instead of one
 * generic message. `cancelled` is a normal outcome, not a failure.
 */
export type GoogleAuthErrorKind = 'popup_blocked' | 'cancelled' | 'unavailable' | 'timeout';

export class GoogleAuthError extends Error {
  readonly kind: GoogleAuthErrorKind;
  constructor(kind: GoogleAuthErrorKind, message: string) {
    super(message);
    this.name = 'GoogleAuthError';
    this.kind = kind;
  }
}

/** Backend/network failures GoogleAuthErrorModal can also show, alongside GIS's own kinds. */
export type GoogleAuthModalKind = GoogleAuthErrorKind | 'network' | 'server';

/** Shared by both Google entry points (popup + redirect) so a GIS error, a
 *  dropped connection, and a backend rejection all land on the same modal states. */
export function classifyGoogleAuthError(err: unknown): { kind: GoogleAuthModalKind; detail?: string } {
  if (err instanceof GoogleAuthError) return { kind: err.kind };
  if (err instanceof NetworkError) return { kind: 'network' };
  if (err instanceof ApiError) return { kind: 'server', detail: err.message };
  return { kind: 'server' };
}

interface TokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void;
}
interface TokenResponse {
  access_token?: string;
  error?: string;
}
interface CodeClient {
  requestCode: () => void;
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: TokenResponse) => void;
            error_callback?: (err: { type?: string }) => void;
          }) => TokenClient;
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            ux_mode: 'redirect';
            redirect_uri: string;
            state?: string;
          }) => CodeClient;
        };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

/**
 * Kicks off the GIS script load ahead of time (e.g. on mount of the sign-in
 * screen) so that by the time the user actually clicks "Continue with
 * Google", `requestAccessToken()` runs synchronously instead of waiting on a
 * network fetch first. Popups opened outside a click's synchronous call
 * stack get blocked by browsers/GIS itself with a `popup_failed_to_open`
 * error, which is what happens if this script is still loading on click.
 */
export function preloadGoogleSignIn(): void {
  loadGis().catch(() => {
    // Ignored here — requestGoogleAccessToken() surfaces load failures when
    // the user actually clicks.
  });
}

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = GIS_SRC;
    el.async = true;
    el.defer = true;
    el.onload = () => resolve();
    el.onerror = () => {
      scriptPromise = null;
      reject(new Error('Could not load Google Sign-In.'));
    };
    document.head.appendChild(el);
  });
  return scriptPromise;
}

/** Classifies GIS's internal error codes into one of our error-modal states. */
function classifyGisError(type: string | undefined): GoogleAuthErrorKind {
  switch (type) {
    case 'popup_failed_to_open':
      return 'popup_blocked';
    case 'popup_closed':
      return 'cancelled';
    default:
      return 'unavailable';
  }
}

function requestAccessToken(scope: string, prompt: string): Promise<string> {
  const attempt = loadGis().then(
    () =>
      new Promise<string>((resolve, reject) => {
        const oauth2 = window.google?.accounts.oauth2;
        if (!oauth2) {
          reject(new GoogleAuthError('unavailable', 'Google Sign-In is unavailable.'));
          return;
        }
        const client = oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope,
          callback: (resp) => {
            if (resp.access_token) resolve(resp.access_token);
            else if (resp.error === 'access_denied') reject(new GoogleAuthError('cancelled', 'Google Sign-In was cancelled.'));
            else reject(new GoogleAuthError('unavailable', resp.error ?? 'Google Sign-In failed.'));
          },
          error_callback: (err) => {
            const kind = classifyGisError(err.type);
            reject(
              new GoogleAuthError(
                kind,
                kind === 'popup_blocked' ? "Couldn't open the Google sign-in popup." : 'Google Sign-In was cancelled.',
              ),
            );
          },
        });
        client.requestAccessToken({ prompt });
      }),
    () => {
      throw new GoogleAuthError('unavailable', 'Could not load Google Sign-In.');
    },
  );

  const timeout = new Promise<string>((_, reject) => {
    setTimeout(() => reject(new GoogleAuthError('timeout', 'Google Sign-In timed out.')), AUTH_TIMEOUT_MS);
  });

  return Promise.race([attempt, timeout]);
}

/** Opens Google's account picker and resolves with an OAuth2 access token. */
export function requestGoogleAccessToken(): Promise<string> {
  return requestAccessToken('openid email profile', 'select_account');
}

/**
 * Mobile-web's full-page alternative to the popup above (spec §3) — GIS's
 * authorization-code client in `redirect` mode navigates the whole page to
 * Google and back to `redirectUri` instead of opening a popup, which embedded
 * / in-app browsers routinely block. The backend exchanges the resulting code
 * for a token server-side (it needs the client secret) — see
 * `googleAuthWithCode` in api/auth.ts and GoogleCallbackScreen.
 *
 * This call itself navigates away; nothing after it in the caller runs.
 */
export function startGoogleRedirect(redirectUri: string, state?: string): Promise<void> {
  return loadGis().then(() => {
    const oauth2 = window.google?.accounts.oauth2;
    if (!oauth2) throw new GoogleAuthError('unavailable', 'Google Sign-In is unavailable.');
    const client = oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      ux_mode: 'redirect',
      redirect_uri: redirectUri,
      state,
    });
    client.requestCode();
  });
}

// ── Return-to path (redirect flow only) ─────────────────────────────────────
//
// The popup flow never navigates away, so it doesn't need this — SocialAuth's
// `finish()` just reads router state directly. The redirect flow does a real
// full-page navigation to Google and back, so the intended destination has to
// survive that round-trip in sessionStorage (spec §14) instead.

const RETURN_PATH_KEY = 'kolab_google_return_path';

/** Only ever an internal path — never an arbitrary external URL (spec §14). */
export function storeGoogleReturnPath(path: string | undefined): void {
  if (path && path.startsWith('/')) sessionStorage.setItem(RETURN_PATH_KEY, path);
  else sessionStorage.removeItem(RETURN_PATH_KEY);
}

function readGoogleReturnPath(): string | undefined {
  const path = sessionStorage.getItem(RETURN_PATH_KEY) ?? undefined;
  return path && path.startsWith('/') ? path : undefined;
}

/** Reads and clears the stored path once sign-in actually succeeds — a later
 *  refresh of the callback page then has nothing stale left to reuse. */
export function consumeGoogleReturnPath(): string | undefined {
  const path = readGoogleReturnPath();
  sessionStorage.removeItem(RETURN_PATH_KEY);
  return path;
}

/** Non-destructive read, for a "Try Again" that restarts the redirect without
 *  having lost the destination a failed first attempt was headed to. */
export function peekGoogleReturnPath(): string | undefined {
  return readGoogleReturnPath();
}

/**
 * Requests a YouTube Data API read scope for pulling a connected creator's
 * subscriber count (see api/creator.ts's connectYoutubeAccount). Google's
 * implicit token-client flow (used here, same as sign-in above) never returns
 * a refresh token — an OAuth spec limitation, not a bug — so unlike mobile's
 * native flow, a web-connected YouTube account won't self-refresh once this
 * access token expires; the creator reconnects to refresh it.
 */
export function requestYoutubeAccessToken(): Promise<string> {
  return requestAccessToken('https://www.googleapis.com/auth/youtube.readonly', 'consent');
}
