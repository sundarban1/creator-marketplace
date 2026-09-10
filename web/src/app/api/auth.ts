/**
 * Auth endpoint wrappers for the marketplace web app.
 *
 * Every shape here mirrors the backend `src/modules/auth` contract that the
 * mobile app already depends on — do not diverge. The account, the tokens and
 * the OTP flows are identical across mobile and web by design (spec §14).
 */

import {
  api,
  apiRequest,
  clearSession,
  getRefreshToken,
  readStoredUser,
  refreshAccessToken,
  setTokens,
  writeStoredUser,
} from '../lib/apiClient';

// ── User shape (backend `toUserDto`) ──────────────────────────────────────────

export type AppRole = 'CREATOR' | 'BUSINESS' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  phone: string | null;
  role: AppRole;
  name: string;
  avatar: string | null;
  isEmailVerified: boolean;
  /** `email` is a placeholder minted because Apple withheld the address. */
  emailIsPlaceholder: boolean;
  isPhoneVerified: boolean;
  isOnboarded: boolean;
  createdAt: string;
  creatorProfile: {
    id: string;
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
  businessProfile: Record<string, unknown> | null;
}

interface LoginPayload {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/** Social sign-in either logs the user straight in, or needs a role first. */
export type SocialAuthResult =
  | { needsRole: false; isNewUser: boolean; user: AuthUser }
  | { needsRole: true; email: string; name: string };

/** Raw backend shape for a completed social sign-in (before we strip tokens). */
type SocialAuthResponse =
  | (LoginPayload & { needsRole: false; isNewUser: boolean })
  | { needsRole: true; email: string; name: string };

// ── Identifier ────────────────────────────────────────────────────────────────

/** Exactly one of `email` / `phone` — never both, never neither (backend rule). */
export type Identifier = { email: string; phone?: never } | { phone: string; email?: never };

// ── Session plumbing ──────────────────────────────────────────────────────────

function persist(payload: LoginPayload): AuthUser {
  setTokens(payload.accessToken, payload.refreshToken);
  writeStoredUser(payload.user);
  return payload.user;
}

// ── Password ──────────────────────────────────────────────────────────────────

export async function loginWithPassword(
  identifier: Identifier,
  password: string,
): Promise<AuthUser> {
  const data = await api<LoginPayload>('POST', '/api/auth/login', { ...identifier, password });
  return persist(data);
}

export interface RegisterInput {
  password: string;
  role: 'CREATOR' | 'BUSINESS';
  fullName?: string;
  businessName?: string;
  referralCode?: string;
}

/**
 * Create an account. The backend sends an OTP down whichever channel the
 * identifier used; the caller then completes `verifyOtp`. No tokens yet.
 */
export async function register(
  identifier: Identifier,
  input: RegisterInput,
): Promise<{ channel: 'email' | 'phone'; email?: string; phone?: string }> {
  return api('POST', '/api/auth/register', { ...identifier, ...input });
}

// ── OTP (signup verification + login for phone accounts) ──────────────────────

export async function verifyOtp(identifier: Identifier, code: string): Promise<AuthUser> {
  const data = await api<LoginPayload>('POST', '/api/auth/verify-otp', { ...identifier, code });
  return persist(data);
}

export async function resendOtp(identifier: Identifier): Promise<void> {
  await api('POST', '/api/auth/resend-otp', identifier);
}

// ── Forgot / reset password ──────────────────────────────────────────────────

export async function forgotPassword(identifier: Identifier): Promise<void> {
  await api('POST', '/api/auth/forgot-password', identifier);
}

export async function verifyResetOtp(identifier: Identifier, code: string): Promise<string> {
  const { resetToken } = await api<{ resetToken: string }>(
    'POST',
    '/api/auth/verify-reset-otp',
    { ...identifier, code },
  );
  return resetToken;
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api('POST', '/api/auth/reset-password', { token, newPassword });
}

// ── Social ───────────────────────────────────────────────────────────────────

function completeSocial(res: SocialAuthResponse): SocialAuthResult {
  if (res.needsRole) return res;
  persist(res);
  return { needsRole: false, isNewUser: res.isNewUser, user: res.user };
}

export async function googleAuth(
  accessToken: string,
  role?: 'CREATOR' | 'BUSINESS',
): Promise<SocialAuthResult> {
  return completeSocial(
    await api<SocialAuthResponse>('POST', '/api/auth/google', { accessToken, role }),
  );
}

export async function appleAuth(input: {
  identityToken: string;
  authorizationCode?: string;
  fullName?: { givenName?: string | null; familyName?: string | null } | null;
  email?: string | null;
  role?: 'CREATOR' | 'BUSINESS';
}): Promise<SocialAuthResult> {
  return completeSocial(await api<SocialAuthResponse>('POST', '/api/auth/apple', input));
}

// ── Session lifecycle ────────────────────────────────────────────────────────

/** The authed "get my profile" endpoint for each marketplace role. */
const PROFILE_PATH: Record<'CREATOR' | 'BUSINESS', string> = {
  CREATOR: '/api/creator/profile',
  BUSINESS: '/api/business/profile',
};

/**
 * Restore a session on app load. Reads the stored tokens + user, makes sure the
 * access token is fresh, then validates it against the role's profile endpoint.
 * Returns the (stored) user on success, `null` if there's no usable session.
 * The stored user is the identity source of truth; Phase 2/3 profile screens
 * fetch the full, current profile themselves.
 */
export async function restoreSession(): Promise<AuthUser | null> {
  const stored = readStoredUser<AuthUser>();
  if (!stored || !getRefreshToken()) {
    clearSession();
    return null;
  }

  // ADMIN accounts belong to the admin dashboard, not this app.
  if (stored.role !== 'CREATOR' && stored.role !== 'BUSINESS') {
    clearSession();
    return null;
  }

  const token = await refreshAccessToken();
  if (!token) {
    clearSession();
    return null;
  }

  try {
    await apiRequest('GET', PROFILE_PATH[stored.role]);
    return stored;
  } catch {
    clearSession();
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await api('POST', '/api/auth/logout');
  } catch {
    /* best effort — clear locally regardless */
  }
  clearSession();
}

// ── Account & security (Settings) ────────────────────────────────────────────

export interface AuthMethods {
  hasPassword: boolean;
  email: string;
  phone: string | null;
  providers: { provider: 'GOOGLE' | 'APPLE' | 'FACEBOOK'; email: string | null; linkedAt: string }[];
}

export function fetchAuthMethods(signal?: AbortSignal): Promise<AuthMethods> {
  return apiRequest<AuthMethods>('GET', '/api/auth/methods', undefined, { signal }).then((r) => r.data);
}

export async function deactivateAccount(): Promise<void> {
  await api('PATCH', '/api/auth/deactivate');
}

export async function deleteAccount(): Promise<void> {
  await api('DELETE', '/api/auth/account');
}
