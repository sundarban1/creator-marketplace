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

export const GOOGLE_CLIENT_ID =
  (import.meta.env['VITE_GOOGLE_CLIENT_ID'] as string | undefined) ??
  '543768819635-6mhj10fgm73eboahjnhttogaihn068if.apps.googleusercontent.com';

const GIS_SRC = 'https://accounts.google.com/gsi/client';

interface TokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void;
}
interface TokenResponse {
  access_token?: string;
  error?: string;
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

/** Turns GIS's internal error codes into a message worth showing a user. */
function describeGisError(type: string | undefined): string | undefined {
  switch (type) {
    case 'popup_failed_to_open':
      return "Couldn't open the Google sign-in popup. Please allow popups for this site and try again.";
    case 'popup_closed':
      return undefined; // Falls back to cancelledMessage — the user closed it themselves.
    default:
      return type;
  }
}

function requestAccessToken(scope: string, prompt: string, cancelledMessage: string): Promise<string> {
  return loadGis().then(
    () =>
      new Promise<string>((resolve, reject) => {
        const oauth2 = window.google?.accounts.oauth2;
        if (!oauth2) {
          reject(new Error('Google Sign-In is unavailable.'));
          return;
        }
        const client = oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope,
          callback: (resp) => {
            if (resp.access_token) resolve(resp.access_token);
            else reject(new Error(resp.error ?? cancelledMessage));
          },
          error_callback: (err) => reject(new Error(describeGisError(err.type) ?? cancelledMessage)),
        });
        client.requestAccessToken({ prompt });
      }),
  );
}

/** Opens Google's account picker and resolves with an OAuth2 access token. */
export function requestGoogleAccessToken(): Promise<string> {
  return requestAccessToken('openid email profile', 'select_account', 'Google Sign-In was cancelled.');
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
  return requestAccessToken(
    'https://www.googleapis.com/auth/youtube.readonly',
    'consent',
    'YouTube connection was cancelled.',
  );
}
