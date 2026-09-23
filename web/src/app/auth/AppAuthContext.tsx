/**
 * Auth state for the marketplace web app (creator + business surfaces).
 *
 * This is a thin React shell over `src/app/api/auth.ts`: the API functions own
 * the network contract and token persistence; this context owns the in-memory
 * `user` + `status` that components render from, and the bootstrap that restores
 * a session on load.
 *
 * It is independent of the admin `AuthContext` (`src/context/AuthContext.tsx`)
 * on purpose — different accounts, different token namespace, same browser.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { clearSession, writeStoredUser } from '../lib/apiClient';
import * as authApi from '../api/auth';
import type { AuthUser, Identifier, RegisterInput, SocialAuthResult } from '../api/auth';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AppAuthValue {
  user: AuthUser | null;
  status: Status;
  isCreator: boolean;
  isBusiness: boolean;

  loginWithPassword: (identifier: Identifier, password: string) => Promise<AuthUser>;
  register: (
    identifier: Identifier,
    input: RegisterInput,
  ) => Promise<{ channel: 'email' | 'phone'; email?: string; phone?: string }>;
  verifyOtp: (identifier: Identifier, code: string) => Promise<AuthUser>;
  resendOtp: (identifier: Identifier) => Promise<void>;
  forgotPassword: (identifier: Identifier) => Promise<void>;
  verifyResetOtp: (identifier: Identifier, code: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  googleAuth: (accessToken: string, role?: 'CREATOR' | 'BUSINESS') => Promise<SocialAuthResult>;
  googleAuthWithCode: (code: string, redirectUri: string, role?: 'CREATOR' | 'BUSINESS') => Promise<SocialAuthResult>;
  appleAuth: (input: Parameters<typeof authApi.appleAuth>[0]) => Promise<SocialAuthResult>;
  tiktokLoginUrl: () => Promise<string>;
  tiktokAuth: (input: Parameters<typeof authApi.tiktokAuth>[0]) => Promise<SocialAuthResult>;
  logout: () => Promise<void>;

  /** Adopt a freshly-authenticated user (e.g. after social role-completion). */
  adoptSession: (user: AuthUser) => void;
  /** Flips `isOnboarded` locally once onboarding's final step completes. */
  markOnboarded: () => void;
  /** Patches fields on the in-memory user (e.g. `name` right after onboarding sets it). */
  updateUser: (patch: Partial<AuthUser>) => void;
}

const AppAuthContext = createContext<AppAuthValue | null>(null);

export function AppAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    // A per-run `cancelled` flag is all the StrictMode safety we need: in dev
    // React runs this effect twice, but run #2 gets its own fresh flag and its
    // `.then` fires. (An earlier `useRef` "run once" guard broke this — run #2
    // bailed early, and run #1's resolution was already cancelled, so `status`
    // stuck on 'loading' forever in dev.)
    let cancelled = false;

    // Safety net: never leave the app on a full-screen spinner because session
    // restore hung (e.g. a cold-started API taking 30s+ to answer /refresh).
    const safety = setTimeout(() => {
      if (!cancelled) setStatus((s) => (s === 'loading' ? 'anonymous' : s));
    }, 8000);

    authApi
      .restoreSession()
      .then((restored) => {
        if (cancelled) return;
        setUser(restored);
        setStatus(restored ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStatus('anonymous');
      })
      .finally(() => clearTimeout(safety));

    return () => {
      cancelled = true;
      clearTimeout(safety);
    };
  }, []);

  const adoptSession = useCallback((next: AuthUser) => {
    writeStoredUser(next);
    setUser(next);
    setStatus('authenticated');
  }, []);

  const loginWithPassword = useCallback<AppAuthValue['loginWithPassword']>(
    async (identifier, password) => {
      const next = await authApi.loginWithPassword(identifier, password);
      adoptSession(next);
      return next;
    },
    [adoptSession],
  );

  const verifyOtp = useCallback<AppAuthValue['verifyOtp']>(
    async (identifier, code) => {
      const next = await authApi.verifyOtp(identifier, code);
      adoptSession(next);
      return next;
    },
    [adoptSession],
  );

  const googleAuth = useCallback<AppAuthValue['googleAuth']>(
    async (accessToken, role) => {
      const res = await authApi.googleAuth(accessToken, role);
      if (!res.needsRole) adoptSession(res.user);
      return res;
    },
    [adoptSession],
  );

  const googleAuthWithCode = useCallback<AppAuthValue['googleAuthWithCode']>(
    async (code, redirectUri, role) => {
      const res = await authApi.googleAuthWithCode(code, redirectUri, role);
      if (!res.needsRole) adoptSession(res.user);
      return res;
    },
    [adoptSession],
  );

  const appleAuth = useCallback<AppAuthValue['appleAuth']>(
    async (input) => {
      const res = await authApi.appleAuth(input);
      if (!res.needsRole) adoptSession(res.user);
      return res;
    },
    [adoptSession],
  );

  const tiktokLoginUrl = useCallback<AppAuthValue['tiktokLoginUrl']>(
    () => authApi.tiktokLoginAuthorizeUrl(),
    [],
  );

  const tiktokAuth = useCallback<AppAuthValue['tiktokAuth']>(
    async (input) => {
      const res = await authApi.tiktokAuth(input);
      if (!res.needsRole) adoptSession(res.user);
      return res;
    },
    [adoptSession],
  );

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      writeStoredUser(next);
      return next;
    });
  }, []);

  const markOnboarded = useCallback(() => updateUser({ isOnboarded: true }), [updateUser]);

  const logout = useCallback(async () => {
    await authApi.logout();
    clearSession();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo<AppAuthValue>(
    () => ({
      user,
      status,
      isCreator: user?.role === 'CREATOR',
      isBusiness: user?.role === 'BUSINESS',
      loginWithPassword,
      register: authApi.register,
      verifyOtp,
      resendOtp: authApi.resendOtp,
      forgotPassword: authApi.forgotPassword,
      verifyResetOtp: authApi.verifyResetOtp,
      resetPassword: authApi.resetPassword,
      googleAuth,
      googleAuthWithCode,
      appleAuth,
      tiktokLoginUrl,
      tiktokAuth,
      logout,
      adoptSession,
      markOnboarded,
      updateUser,
    }),
    [
      user,
      status,
      loginWithPassword,
      verifyOtp,
      googleAuth,
      googleAuthWithCode,
      appleAuth,
      tiktokLoginUrl,
      tiktokAuth,
      logout,
      adoptSession,
      markOnboarded,
      updateUser,
    ],
  );

  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
}

export function useAppAuth(): AppAuthValue {
  const ctx = useContext(AppAuthContext);
  if (!ctx) throw new Error('useAppAuth must be used within <AppAuthProvider>');
  return ctx;
}
