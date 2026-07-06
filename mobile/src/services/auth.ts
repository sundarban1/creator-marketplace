import { request, API_BASE }                              from '@/lib/api';
import { storage }                                        from '@/utilities/storage';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from '@/utilities/constants';
import type { ApiLoginResponse }                          from '@/lib/api';
import type { User }                                      from '@/types';

function toUser(apiUser: ApiLoginResponse['user']): User {
  return {
    id:           apiUser.id,
    email:        apiUser.email,
    role:         apiUser.role as User['role'],
    name:         apiUser.name,
    avatar:       apiUser.avatar ?? undefined,
    // isFirstLogin is true when the user has not completed onboarding (DB-driven)
    isFirstLogin: !apiUser.isOnboarded,
  };
}

export const authService = {
  async login(payload: { email: string; password: string }): Promise<User> {
    const res = await request<ApiLoginResponse>('POST', '/api/auth/login', payload);
    const { accessToken, refreshToken, user: apiUser } = res.data;

    await Promise.all([
      storage.set(ACCESS_TOKEN_KEY,  accessToken),
      storage.set(REFRESH_TOKEN_KEY, refreshToken),
    ]);

    const user = toUser(apiUser);
    await storage.setJSON(USER_KEY, user);
    return user;
  },

  async register(payload: {
    email:         string;
    phone?:        string;
    password:      string;
    role:          'CREATOR' | 'BUSINESS';
    fullName?:     string;
    businessName?: string;
  }): Promise<{ email: string }> {
    const res = await request<{ email: string }>('POST', '/api/auth/register', payload);
    return res.data;
  },

  async verifyOtp(email: string, code: string): Promise<User> {
    const res = await request<ApiLoginResponse>('POST', '/api/auth/verify-otp', { email, code });
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

  async resendOtp(email: string): Promise<void> {
    await request('POST', '/api/auth/resend-otp', { email });
  },

  // ── Forgot password (phone OTP) ───────────────────────────────────────────

  async forgotPasswordByPhone(phone: string): Promise<void> {
    await request('POST', '/api/auth/forgot-password-phone', { phone });
  },

  async verifyResetOtp(phone: string, code: string): Promise<string> {
    const res = await request<{ resetToken: string }>('POST', '/api/auth/verify-reset-otp', { phone, code });
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
    await storage.hydrate([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
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

  async requestPhoneOtp(phone: string): Promise<void> {
    await request('POST', '/api/auth/request-phone-otp', { phone });
  },

  async verifyPhoneOtp(phone: string, code: string): Promise<void> {
    await request('POST', '/api/auth/verify-phone-otp', { phone, code });
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
