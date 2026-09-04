import { useQuery, useQueryClient } from '@tanstack/react-query';
import { STALE } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';
import { creatorService, type ApiCreatorProfile } from '@/services/creator';

// The signed-in creator's own profile. Fetched on several screens (home,
// discover, profile tab, edit screens) that previously each ran their own
// creatorService.getProfile() on mount *and* focus — this shares one cache
// entry across all of them, persists it across restarts (['profile', …] is
// on the persist whitelist), and refreshes in the background on the
// STALE.profile schedule instead of on every screen focus.
export const creatorProfileKey = ['profile', 'creator'] as const;

export function useCreatorProfile() {
  const { user } = useAuth();
  return useQuery<ApiCreatorProfile>({
    queryKey: creatorProfileKey,
    queryFn: () => creatorService.getProfile(),
    // The endpoint is creator-only; skip it entirely for a business/admin
    // session (and during the brief logged-out window before redirect).
    enabled: user?.role === 'CREATOR',
    staleTime: STALE.profile,
  });
}

/** Force the shared creator-profile cache to refetch — call from mutations
 *  that change the profile (edit profile, change categories, verification). */
export function useInvalidateCreatorProfile(): () => void {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: creatorProfileKey });
  };
}
