import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { exchangeCodeAsync } from 'expo-auth-session';

// Google's iOS OAuth client validates the redirect URI against the *reversed client
// ID* scheme (see mobile/src/app/(auth)/login.tsx for the full explanation) —
// expo-auth-session's bundle-ID-scheme default doesn't match and gets rejected with
// "redirect_uri_mismatch". Android's OAuth client type verifies the app via package
// name instead, so the library's default there is left alone.
function reversedIosClientId(clientId: string): string {
  return `com.googleusercontent.apps.${clientId.replace('.apps.googleusercontent.com', '')}`;
}

/**
 * Requests a Google access token with the given scopes (beyond the basic
 * profile/email ones expo-auth-session always includes), for calling a Google API
 * server-side (e.g. YouTube Data API) — not for signing the user into this app.
 */
export function useGoogleAccessToken(scopes: string[]) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const onSuccessRef = useRef<((accessToken: string) => void) | null>(null);

  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? 'unset';
  const iosRedirectUri = Platform.OS === 'ios' ? `${reversedIosClientId(iosClientId)}:/oauthredirect` : undefined;

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId:        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID     ?? 'unset',
    webClientId:     process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID     ?? 'unset',
    iosClientId,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? 'unset',
    redirectUri:     iosRedirectUri,
    scopes,
    // Without this, Google silently reuses whichever account is already signed into the
    // device/browser session — a creator who disconnected and wants to link a different
    // Google account would never see the account chooser at all.
    selectAccount:   true,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success' && response.authentication?.accessToken) {
      // Implicit flow (web).
      onSuccessRef.current?.(response.authentication.accessToken);
      setLoading(false);
    } else if (response.type === 'success' && response.params?.code) {
      // Authorization Code flow (native default) — exchange it ourselves;
      // expo-auth-session doesn't do this automatically.
      const clientId = Platform.select({
        ios:     process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        default: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      }) ?? 'unset';
      exchangeCodeAsync(
        {
          clientId,
          code:        response.params.code,
          redirectUri: request?.redirectUri ?? '',
          extraParams: request?.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
        },
        Google.discovery,
      )
        .then((token) => {
          if (token.accessToken) onSuccessRef.current?.(token.accessToken);
          else setError('Google authorization failed. Please try again.');
        })
        .catch(() => setError('Google authorization failed. Please try again.'))
        .finally(() => setLoading(false));
    } else if (response.type === 'error') {
      setError('Google authorization failed. Please try again.');
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
    void promptAsync({ preferEphemeralSession: true });
  }

  return { prompt, loading, error, ready: !!request };
}
