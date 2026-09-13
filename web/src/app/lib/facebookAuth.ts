/**
 * Facebook Login for the web app, via the Facebook JavaScript SDK.
 *
 * Used only to obtain a short-lived Graph API access token for reading Page
 * follower counts / a linked Instagram Business account's stats (see
 * api/creator.ts's getFacebookPages) — not for signing the user into this app.
 * Mirrors mobile's useFacebookAccessToken hook (which uses expo-auth-session's
 * implicit-flow Facebook provider); the JS SDK is the web-native equivalent
 * and, unlike a hand-rolled OAuth redirect, doesn't require pre-registering an
 * exact redirect URI — only the app's domain in the Facebook Developer Console
 * (Settings → Basic → App Domains, plus the Facebook Login product's "Valid
 * OAuth Redirect URIs" left as default).
 */

export const FACEBOOK_APP_ID =
  (import.meta.env['VITE_FACEBOOK_APP_ID'] as string | undefined) ?? '1740519673635792';

const FB_SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';

interface FBAuthResponse {
  accessToken: string;
}
interface FBLoginResponse {
  authResponse?: FBAuthResponse;
  status?: string;
}
declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (opts: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
      login: (
        callback: (res: FBLoginResponse) => void,
        opts?: { scope?: string; auth_type?: string },
      ) => void;
    };
  }
}

let sdkPromise: Promise<void> | null = null;

function loadFacebookSdk(): Promise<void> {
  if (window.FB) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB!.init({ appId: FACEBOOK_APP_ID, cookie: false, xfbml: false, version: 'v21.0' });
      resolve();
    };
    const el = document.createElement('script');
    el.src = FB_SDK_SRC;
    el.async = true;
    el.defer = true;
    el.onerror = () => {
      sdkPromise = null;
      reject(new Error('Could not load Facebook Login.'));
    };
    document.body.appendChild(el);
  });
  return sdkPromise;
}

/** Opens Facebook's login dialog and resolves with a Graph API access token. */
export async function requestFacebookAccessToken(scopes: string[]): Promise<string> {
  await loadFacebookSdk();
  const FB = window.FB;
  if (!FB) throw new Error('Facebook Login is unavailable.');

  return new Promise<string>((resolve, reject) => {
    FB.login(
      (res) => {
        if (res.authResponse?.accessToken) resolve(res.authResponse.accessToken);
        else reject(new Error('Facebook authorization failed or was cancelled.'));
      },
      {
        scope: scopes.join(','),
        // Without this, Facebook silently reuses whichever account is already logged
        // into the browser session — a creator who disconnected and wants to link a
        // different Facebook account would never see the login screen at all.
        auth_type: 'reauthenticate',
      },
    );
  });
}
