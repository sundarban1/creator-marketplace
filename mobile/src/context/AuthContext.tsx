import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { authService } from '@/services/auth';
import { setSessionExpiredHandler, clearSessionExpiredGuard } from '@/lib/api';
import type { User } from '@/types';
import { USER_KEY } from '@/utilities/constants';
import { storage } from '@/utilities/storage';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Stable ref so the session-expired handler always calls the current logout
  // without needing to re-register every render.
  const logoutRef = useRef<(() => Promise<void>) | undefined>(undefined);

  useEffect(() => {
    authService.getStoredUser().then((u) => {
      setUser(u);
      setIsLoading(false);
    });

    // Register once — the ref keeps the reference live
    setSessionExpiredHandler(() => { logoutRef.current?.(); });

    return () => { setSessionExpiredHandler(() => { /* unmounted */ }); };
  }, []);

  async function login(email: string, password: string) {
    clearSessionExpiredGuard(); // reset the once-guard so future expiries fire again
    const u = await authService.login({ email, password });
    setUser(u);
  }

  async function logout() {
    try {
      await authService.logout();
    } catch {
      // always clear state even if server call fails
    } finally {
      setUser(null);
    }
  }

  // Keep the ref in sync with the latest logout closure
  logoutRef.current = logout;

  function updateUser(patch: Partial<User>) {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      void storage.setJSON(USER_KEY, updated);
      return updated;
    });
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
