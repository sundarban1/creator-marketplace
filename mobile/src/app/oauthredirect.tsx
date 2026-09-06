import { useEffect } from 'react';
import { useRouter } from 'expo-router';

// Fallback route for the `…:/oauthredirect` OAuth deep link. In normal operation
// `src/app/+native-intent.ts` returns null for this URL so Expo Router never navigates
// here — expo-web-browser resolves the pending promptAsync() promise in place and the
// (auth) login screen finishes the code exchange + backend sign-in itself. This screen
// only renders if that interception is bypassed (e.g. a cold start launched straight
// from the redirect); it just bounces to root so RootNavigator can take over.
export default function OAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
