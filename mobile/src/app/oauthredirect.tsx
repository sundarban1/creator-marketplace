import { useEffect } from 'react';
import { useRouter } from 'expo-router';

// Google's Android OAuth redirect lands here (scheme matches app.json's `scheme`,
// so Expo Router treats it as a navigable route instead of letting expo-auth-session
// silently consume it) — without this file it fell through to the default
// "Unmatched Route" screen. The actual token/code is already resolved via
// expo-auth-session's response state in useGoogleAccessToken/login.tsx; this route
// only needs to bounce back so RootNavigator's auth-based redirect can take over.
export default function OAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
