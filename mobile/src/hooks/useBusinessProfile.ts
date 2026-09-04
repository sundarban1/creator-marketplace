import { useQuery, useQueryClient } from '@tanstack/react-query';
import { STALE } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';
import { profileService, type BusinessProfile } from '@/services/profile';

// The signed-in business's own profile. Fetched on several screens (home,
// profile tab, edit screens, create-campaign) that previously each ran their
// own profileService.getBusinessProfile() on mount *and* focus — this shares
// one cache entry, persists it across restarts (['profile', …] is on the
// persist whitelist), and refreshes in the background on STALE.profile.
export const businessProfileKey = ['profile', 'business'] as const;

export function useBusinessProfile() {
  const { user } = useAuth();
  return useQuery<BusinessProfile>({
    queryKey: businessProfileKey,
    queryFn: () => profileService.getBusinessProfile(),
    enabled: user?.role === 'BUSINESS',
    staleTime: STALE.profile,
  });
}

/** Force the shared business-profile cache to refetch — call from mutations
 *  that change the profile (edit profile, change categories, verification). */
export function useInvalidateBusinessProfile(): () => void {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: businessProfileKey });
  };
}
