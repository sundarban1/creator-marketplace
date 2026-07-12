import { request, API_BASE }                              from '@/lib/api';
import { storage }                                        from '@/utilities/storage';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY, BIOMETRIC_ENABLED_KEY } from '@/utilities/constants';
import type { ApiLoginResponse }                          from '@/lib/api';
import type { User }                                      from '@/types';

// Every identifier-based call takes exactly one of `email` or `phone` — never both.
export type Identifier = { email: string; phone?: never } | { phone: string; email?: never };

function toUser(apiUser: ApiLoginResponse['user']): User {
  return {
    id:              apiUser.id,
    email:           apiUser.email,
    phone:           apiUser.phone,
    role:            apiUser.role as User['role'],
    name:            apiUser.name,
    avatar:          apiUser.avatar ?? undefined,
    isEmailVerified: apiUser.isEmailVerified,
    isPhoneVerified: apiUser.isPhoneVerified,
    // isFirstLogin is true when the user has not completed onboarding (DB-driven)
    isFirstLogin: !apiUser.isOnboarded,
  };
}

export const authService = {
  async login(identifier: Identifier, password: string, rememberMe = true): Promise<User> {
    const res = await request<ApiLoginResponse>('POST', '/api/auth/login', { ...identifier, password });
    const { accessToken, refreshToken, user: apiUser } = res.data;
    const user = toUser(apiUser);

    if (rememberMe) {
      await Promise.all([
        storage.set(ACCESS_TOKEN_KEY,  accessToken),
        storage.set(REFRESH_TOKEN_KEY, refreshToken),
      ]);
      await storage.setJSON(USER_KEY, user);
      return user;
    }

    // Not remembered — keep the session in memory only so it doesn't survive an app restart
    await Promise.all([
      storage.remove(ACCESS_TOKEN_KEY),
      storage.remove(REFRESH_TOKEN_KEY),
      storage.remove(USER_KEY),
    ]);
    storage.setMemoryOnly(ACCESS_TOKEN_KEY,  accessToken);
    storage.setMemoryOnly(REFRESH_TOKEN_KEY, refreshToken);
    storage.setJSONMemoryOnly(USER_KEY, user);
    return user;
  },

  async register(payload: Identifier & {
    password:      string;
    role:          'CREATOR' | 'BUSINESS';
    fullName?:     string;
    businessName?: string;
    referralCode?: string;
  }): Promise<{ channel: 'email' | 'phone'; email?: string; phone?: string }> {
    const res = await request<{ channel: 'email' | 'phone'; email?: string; phone?: string }>('POST', '/api/auth/register', payload);
    return res.data;
  },

  async verifyOtp(identifier: Identifier, code: string): Promise<User> {
    const res = await request<ApiLoginResponse>('POST', '/api/auth/verify-otp', { ...identifier, code });
    const { accessToken, refreshToken, user: apiUser } = res.data;

    await Promise.all([
      storage.set(ACCESS_TOKEN_KEY,  accessToken),
      storage.set(REFRESH_TOKEN_KEY, refreshToken),
    ]);

    // isOnboarded is false on a brand-new account, so toUser() will set isFirstLogin: true
    const user = toUser(apiUser);
    await storage.setJSON(USER_KEY, user);
    return user;
  },

  async resendOtp(identifier: Identifier): Promise<void> {
    await request('POST', '/api/auth/resend-otp', identifier);
  },

  // ── Forgot password (email or phone — same code-based flow either way) ──────

  async forgotPassword(identifier: Identifier): Promise<void> {
    await request('POST', '/api/auth/forgot-password', identifier);
  },

  async verifyResetOtp(identifier: Identifier, code: string): Promise<string> {
    const res = await request<{ resetToken: string }>('POST', '/api/auth/verify-reset-otp', { ...identifier, code });
    return res.data.resetToken;
  },

  async resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
    await request('POST', '/api/auth/reset-password', { token, newPassword });
  },

  // Called at the end of onboarding — marks the user as onboarded in the DB
  // and updates the cached user so RootNavigator routes to home.
  async completeOnboarding(): Promise<void> {
    await request('POST', '/api/auth/complete-onboarding');
    const raw = storage.getJSON<User>(USER_KEY);
    if (raw) {
      const updated: User = { ...raw, isFirstLogin: false };
      await storage.setJSON(USER_KEY, updated);
    }
  },

  async getStoredUser(): Promise<User | null> {
    await storage.hydrate([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY, BIOMETRIC_ENABLED_KEY]);
    return storage.getJSON<User>(USER_KEY);
  },

  async sendWelcomeEmail(email: string): Promise<void> {
    try {
      await request('POST', '/api/auth/send-welcome-email', { email });
    } catch {
      // best-effort — don't block the verification flow
    }
  },

  async facebookAuth(payload: {
    accessToken: string;
    role?: 'CREATOR' | 'BUSINESS';
  }): Promise<{ needsRole: true; email: string; name: string } | { needsRole: false; user: User }> {
    const res = await request<
      | { needsRole: true; email: string; name: string }
      | (ApiLoginResponse & { needsRole: false; isNewUser: boolean })
    >('POST', '/api/auth/facebook', payload);

    if (res.data.needsRole) {
      return { needsRole: true, email: res.data.email, name: res.data.name };
    }

    const { accessToken, refreshToken, user: apiUser } = res.data as ApiLoginResponse & { needsRole: false };
    await Promise.all([
      storage.set(ACCESS_TOKEN_KEY,  accessToken),
      storage.set(REFRESH_TOKEN_KEY, refreshToken),
    ]);
    const user = toUser(apiUser);
    await storage.setJSON(USER_KEY, user);
    return { needsRole: false, user };
  },

  async googleAuth(payload: {
    accessToken: string;
    role?: 'CREATOR' | 'BUSINESS';
  }): Promise<{ needsRole: true; email: string; name: string } | { needsRole: false; user: User }> {
    const res = await request<
      | { needsRole: true; email: string; name: string }
      | (ApiLoginResponse & { needsRole: false; isNewUser: boolean })
    >('POST', '/api/auth/google', payload);

    if (res.data.needsRole) {
      return { needsRole: true, email: res.data.email, name: res.data.name };
    }

    const { accessToken, refreshToken, user: apiUser } = res.data as ApiLoginResponse & { needsRole: false };
    await Promise.all([
      storage.set(ACCESS_TOKEN_KEY,  accessToken),
      storage.set(REFRESH_TOKEN_KEY, refreshToken),
    ]);
    const user = toUser(apiUser);
    await storage.setJSON(USER_KEY, user);
    return { needsRole: false, user };
  },

  // ── Add & verify a phone number on the logged-in account ─────────────────────

  async requestPhoneOtp(phone: string): Promise<void> {
    await request('POST', '/api/auth/request-phone-otp', { phone });
  },

  async verifyPhoneOtp(phone: string, code: string): Promise<void> {
    await request('POST', '/api/auth/verify-phone-otp', { phone, code });
  },

  // ── Add & verify a real email on the logged-in account (phone-signup accounts) ─

  async requestEmailOtp(email: string): Promise<void> {
    await request('POST', '/api/auth/request-email-otp', { email });
  },

  async verifyEmailOtp(email: string, code: string): Promise<void> {
    await request('POST', '/api/auth/verify-email-otp', { email, code });
  },

  async deactivateAccount(): Promise<void> {
    await request('PATCH', '/api/auth/deactivate');
  },

  async deleteAccount(): Promise<void> {
    await request('DELETE', '/api/auth/account');
  },

  async logout(): Promise<void> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storage.get(ACCESS_TOKEN_KEY) ?? ''}`,
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
    } catch {
      // ignore — server-side invalidation is best-effort
    }
    await Promise.all(
      [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY].map((k) =>
        storage.remove(k).catch(() => {})
      )
    );
  },
};
