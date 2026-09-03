import { useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useToast } from '@/components/Toast';
import { useLanguage } from '@/context/LanguageContext';

// eSewa (and our own success/failure callback) redirects the browser to
// `kolab://esewa-callback?...`. Because that scheme matches app.json's `scheme`,
// Expo Router consumes the deep link as a navigable route before
// WebBrowser.openAuthSessionAsync in activity-timeline can see it — without this
// file it falls through to the "Unmatched Route" screen (same reason
// oauthredirect.tsx exists). So this route owns the post-payment UX: it shows
// the toast, closes the auth session, and pops back to the timeline, where
// useFocusEffect re-runs load() and picks up the new PAID status from the API.
export default function EsewaCallback() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useLanguage();
  const { success } = useLocalSearchParams<{ success?: string; error?: string }>();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    // iOS: close the still-open ASWebAuthenticationSession / browser tab. Both
    // are no-ops (or throw) on Android, where the tab is dismissed for us when
    // the app returns to the foreground — hence the empty catches.
    try { WebBrowser.dismissAuthSession(); } catch { /* iOS / web only */ }
    try { Promise.resolve(WebBrowser.dismissBrowser()).catch(() => {}); } catch { /* iOS only */ }

    if (success === 'true') {
      toast.success(t('activityTimeline.toastPaySuccess'));
    } else {
      // payment_failed / canceled / missing_payment_reference — the raw reason
      // isn't useful to the business, so one calm generic message.
      toast.error(t('activityTimeline.toastEsewaIssue'));
    }

    // Normally the timeline is still in the stack underneath (the app was only
    // backgrounded for the eSewa tab) — pop back to it. Only if the app was
    // cold-started by the deep link do we fall back to the root, where
    // RootNavigator routes the signed-in user home (same as oauthredirect.tsx).
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router, toast, t, success]);

  return null;
}
