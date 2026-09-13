/**
 * Google Sign-In for the web app via Google Identity Services (GIS).
 *
 * The backend's /api/auth/google verifies an OAuth2 **access token** (it calls
 * googleapis.com/oauth2/v2/userinfo), so this uses the GIS token client, not
 * the one-tap ID-token flow.
 *
 * Setup: the client id's "Authorised JavaScript origins" in Google Cloud
 * Console must include every origin this runs on (http://localhost:5173,
 * https://www.ourkolab.com, the *.onrender.com preview URL).
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
          error_callback: (err) => reject(new Error(err.type ?? cancelledMessage)),
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
