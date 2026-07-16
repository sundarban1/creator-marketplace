import { useEffect, useRef, useState } from 'react';
import * as Facebook from 'expo-auth-session/providers/facebook';

/**
 * Requests a Facebook access token with the given scopes (beyond the basic
 * public_profile/email ones expo-auth-session always includes), for calling the Graph
 * API server-side (e.g. Pages/Instagram data) — not for signing the user into this app.
 * Unlike Google/TikTok, Facebook's native OAuth returns the token directly (implicit
 * flow) with no code-exchange step needed.
 */
export function useFacebookAccessToken(scopes: string[]) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const onSuccessRef = useRef<((accessToken: string) => void) | null>(null);

  const [request, response, promptAsync] = Facebook.useAuthRequest({
    clientId:        process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? 'unset',
    webClientId:     process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? 'unset',
    iosClientId:     process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? 'unset',
    androidClientId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? 'unset',
    scopes,
    // Without this, Facebook silently reuses whichever account is already logged into
    // the shared browser session — a creator who disconnected and wants to link a
    // different Facebook account would never see the login screen at all.
    extraParams: { auth_type: 'reauthenticate' },
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success' && response.authentication?.accessToken) {
      onSuccessRef.current?.(response.authentication.accessToken);
      setLoading(false);
    } else if (response.type === 'error') {
      setError('Facebook authorization failed. Please try again.');
      setLoading(false);
    } else if (response.type === 'dismiss' || response.type === 'cancel') {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  function prompt(onSuccess: (accessToken: string) => void) {
    onSuccessRef.current = onSuccess;
    setError('');
    setLoading(true);
    // TEMP: log the redirect URI so it can be added to Facebook's Valid OAuth Redirect URIs.
    console.log('[Facebook OAuth] redirectUri:', request?.redirectUri);
    void promptAsync({ preferEphemeralSession: true });
  }

  return { prompt, loading, error, ready: !!request };
}
