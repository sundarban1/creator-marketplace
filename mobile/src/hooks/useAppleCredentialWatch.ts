import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { useLanguage } from '@/context/LanguageContext';
import { authService } from '@/services/auth';

// Watches the Sign in with Apple grant for the signed-in user. If they revoke
// Kolab's access from iOS Settings → Apple ID → Sign in with Apple, this detects
// it (on launch, on foreground, and live via addRevokeListener) and severs the
// link server-side — logging the user out only if Apple was their sole way in.
export function useAppleCredentialWatch() {
  const { user, logout, reloadUser } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const runningRef = useRef(false);

  useEffect(() => {
    // Simulators report `getCredentialStateAsync` as REVOKED regardless of the
    // real grant, which would falsely unlink Apple server-side — physical only.
    if (Platform.OS !== 'ios' || !Device.isDevice || !user) return;

    async function handleRevoked() {
      await authService.notifyAppleRevoked();
      let stranded = false;
      try {
        const methods = await authService.getAuthMethods();
        stranded = !methods.hasPassword && methods.providers.length === 0;
      } catch {
        // If we can't tell, assume they still have another way in — logging a
        // user out on a transient network blip would be worse.
      }
      if (stranded) {
        await logout();
        toast.error(t('loginMethods.appleRevokedLoggedOut'));
      } else {
        await reloadUser();
        toast.error(t('loginMethods.appleRevoked'));
      }
    }

    async function check() {
      const appleUserId = authService.getStoredAppleUserId();
      if (!appleUserId || runningRef.current) return;
      runningRef.current = true;
      try {
        const state = await AppleAuthentication.getCredentialStateAsync(appleUserId);
        if (state === AppleAuthentication.AppleAuthenticationCredentialState.REVOKED) {
          await handleRevoked();
        }
      } catch {
        // NOT_FOUND / TRANSFERRED / transient — nothing to do.
      } finally {
        runningRef.current = false;
      }
    }

    void check();
    const appStateSub = AppState.addEventListener('change', (s) => { if (s === 'active') void check(); });
    const revokeSub = AppleAuthentication.addRevokeListener(() => { void handleRevoked(); });
    return () => {
      appStateSub.remove();
      revokeSub?.remove();
    };
  }, [user, logout, reloadUser, toast, t]);
}
