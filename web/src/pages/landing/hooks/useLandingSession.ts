import { useEffect, useState } from 'react';
import { getRefreshToken, onSessionChange, readStoredUser } from '../../../app/lib/apiClient';
import type { AuthUser } from '../../../app/api/auth';

type SessionRole = 'CREATOR' | 'BUSINESS';

/**
 * The marketplace session as seen from the landing page. The landing route
 * sits outside AppProviders (it is prerendered and must not pay for them), so
 * it can't call useAppAuth — instead this reads the same stored session that
 * AppAuthContext restores from (refresh token + stored user with an app role),
 * and follows sign-in/out in other tabs.
 *
 * Starts as `null` (signed out) so the prerendered HTML is stable, then
 * resolves on mount.
 */
export function useLandingSession(): SessionRole | null {
  const [role, setRole] = useState<SessionRole | null>(null);

  useEffect(() => {
    const read = () => {
      const stored = getRefreshToken() ? readStoredUser<AuthUser>() : null;
      setRole(stored && (stored.role === 'CREATOR' || stored.role === 'BUSINESS') ? stored.role : null);
    };
    read();
    const offSession = onSessionChange(read);
    window.addEventListener('storage', read);
    return () => {
      offSession();
      window.removeEventListener('storage', read);
    };
  }, []);

  return role;
}
