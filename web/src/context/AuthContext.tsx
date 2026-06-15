import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  api,
  setTokens,
  clearTokens,
  setStoredUser,
  getStoredUser,
  type StoredUser,
} from '../lib/api';

interface AuthContextValue {
  user:   StoredUser | null;
  login:  (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(getStoredUser);

  async function login(email: string, password: string) {
    const res = await api.auth.login(email, password);
    const { accessToken, refreshToken, user: apiUser } = res.data;

    if (apiUser.role !== 'ADMIN') {
      throw new Error('Access denied. Admin accounts only.');
    }

    setTokens(accessToken, refreshToken);

    const stored: StoredUser = {
      id:    apiUser.id,
      email: apiUser.email,
      role:  apiUser.role,
      name:  apiUser.email.split('@')[0]!.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    };
    setStoredUser(stored);
    setUser(stored);
  }

  async function logout() {
    try { await api.auth.logout(); } catch { /* ignore */ }
    clearTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
