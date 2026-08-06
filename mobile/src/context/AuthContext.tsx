import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import * as Sentry from '@sentry/react-native';
import { getCrashlytics, setUserId as setCrashlyticsUserId } from '@react-native-firebase/crashlytics';
import { authService, type Identifier } from '@/services/auth';
import { setSessionExpiredHandler, clearSessionExpiredGuard } from '@/lib/api';
import type { User } from '@/types';
import { USER_KEY } from '@/utilities/constants';
import { storage } from '@/utilities/storage';
import { warmDeviceId } from '@/utilities/deviceId';
import { isBiometricLoginEnabled } from '@/services/biometric';
import { logger } from '@/utilities/logger';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (identifier: Identifier, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
  reloadUser: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Stable ref so the session-expired handler always calls the current
  // force-logout without needing to re-register every render.
  const forceLogoutRef = useRef<(() => Promise<void>) | undefined>(undefined);

  useEffect(() => {
    void warmDeviceId();

    authService.getStoredUser().then((u) => {
      setUser(u);
      setIsLoading(false);
    }).catch((err) => {
      logger.error('[auth] getStoredUser failed', err);
      setUser(null);
      setIsLoading(false);
    });

    // Register once — the ref keeps the reference live
    setSessionExpiredHandler(() => { forceLogoutRef.current?.(); });

    return () => { setSessionExpiredHandler(() => { /* unmounted */ }); };
  }, []);

  // Keeps Sentry + Crashlytics user identification in sync with auth state —
  // covers every path that changes `user` (login, session restore, logout,
  // force-logout, biometric lock) from one place instead of duplicating calls
  // at each call site. Telemetry must never break auth, so both are swallowed.
  useEffect(() => {
    if (user?.id) {
      try {
        Sentry.setUser({ id: user.id });
      } catch {
        // never let telemetry break auth
      }
      setCrashlyticsUserId(getCrashlytics(), user.id).catch((err) => logger.warn('[auth] Crashlytics setUserId failed', { err }));
    } else {
      try {
        Sentry.setUser(null);
      } catch {
        // never let telemetry break auth
      }
      setCrashlyticsUserId(getCrashlytics(), '').catch((err) => logger.warn('[auth] Crashlytics clear userId failed', { err }));
    }
  }, [user?.id]);

  async function login(identifier: Identifier, password: string, rememberMe = true) {
    clearSessionExpiredGuard(); // reset the once-guard so future expiries fire again
    const u = await authService.login(identifier, password, rememberMe);
    setUser(u);
  }

  // Always a full server + local clear — used when the refresh token itself is
  // genuinely invalid/expired (the session-expired handler below), where there
  // is nothing valid left to preserve for a biometric resume.
  async function forceLogout() {
    try {
      await authService.logout();
    } catch (err) {
      // always clear state even if server call fails
      logger.warn('[auth] server logout failed', { err });
    } finally {
      setUser(null);
    }
  }

  // Explicit, user-initiated logout (Settings → Logout, or "Use password
  // instead" on the biometric lock screen). If biometric login is enabled,
  // this "locks" instead of fully signing out — the session stays valid on
  // the server and in storage so Face ID/Fingerprint can silently resume it
  // later, the same way Instagram/banking apps treat Logout as a lock when
  // biometric is on. Skips the server logout call entirely in that case,
  // since the backend nulls out the refresh token on logout — calling it
  // would invalidate the very session being kept around to resume.
  async function logout() {
    if (isBiometricLoginEnabled()) {
      setUser(null);
      return;
    }
    await forceLogout();
  }

  // Keep the ref in sync with the latest force-logout closure
  forceLogoutRef.current = forceLogout;

  function updateUser(patch: Partial<User>) {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      void storage.setJSON(USER_KEY, updated);
      return updated;
    });
  }

  async function reloadUser(): Promise<User | null> {
    const u = await authService.getStoredUser();
    setUser(u);
    return u;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser, reloadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
