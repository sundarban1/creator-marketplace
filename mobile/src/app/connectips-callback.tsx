import { useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useToast } from '@/components/Toast';
import { useLanguage } from '@/context/LanguageContext';

// Same role as esewa-callback.tsx: our connectIPS success/failure callback
// redirects to `kolab://connectips-callback?...`, which Expo Router consumes
// as a route before WebBrowser.openAuthSessionAsync in activity-timeline can
// see it (always on Android, sometimes on iOS). This route owns the
// post-payment UX — toast, close the browser session, pop back to the
// timeline, whose useFocusEffect reloads the real PAID status.
export default function ConnectIpsCallback() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useLanguage();
  const { success } = useLocalSearchParams<{ success?: string; error?: string }>();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    try { WebBrowser.dismissAuthSession(); } catch { /* iOS / web only */ }
    try { Promise.resolve(WebBrowser.dismissBrowser()).catch(() => {}); } catch { /* iOS only */ }

    if (success === 'true') {
      toast.success(t('activityTimeline.toastPaySuccess'));
    } else {
      toast.error(t('activityTimeline.toastConnectIpsIssue'));
    }

    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router, toast, t, success]);

  return null;
}
