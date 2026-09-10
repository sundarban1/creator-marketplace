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

/** Opens Google's account picker and resolves with an OAuth2 access token. */
export async function requestGoogleAccessToken(): Promise<string> {
  await loadGis();
  const oauth2 = window.google?.accounts.oauth2;
  if (!oauth2) throw new Error('Google Sign-In is unavailable.');

  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: (resp) => {
        if (resp.access_token) resolve(resp.access_token);
        else reject(new Error(resp.error ?? 'Google Sign-In was cancelled.'));
      },
      error_callback: (err) => reject(new Error(err.type ?? 'Google Sign-In was cancelled.')),
    });
    client.requestAccessToken({ prompt: '' });
  });
}
