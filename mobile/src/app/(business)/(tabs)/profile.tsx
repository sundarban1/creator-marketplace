import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { campaignService } from '@/services/campaign';
import { creatorService } from '@/services/creator';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useRefetchOnFocusIfStale } from '@/hooks/useRefetchOnFocusIfStale';
import { STALE } from '@/lib/queryClient';
import { BusinessProfileView } from '@/features/business/components/BusinessProfileView';
import { toOwnerVm, emptyOwnerVm } from '@/features/business/utils/businessProfileVm';

// The business viewing its own profile. Same page a creator sees at
// (creator)/business-detail — <BusinessProfileView mode="owner"> layers the
// edit affordances (cover/logo upload, section edit links, tappable stats) on
// top of the shared read-only layout.
export default function BusinessProfileScreen() {
  const { user } = useAuth();
  const { focus } = useLocalSearchParams<{ focus?: string }>();

  // Shared caches — the profile + campaigns queries are the same entries the
  // business home tab uses, so switching between the two tabs is instant and
  // costs no extra fetch. Replaces the getBusinessProfile/listMy/getSavedCreators
  // trio that re-ran on every focus with a manual offlineCache fallback.
  const profileQuery = useBusinessProfile();
  const campaignsQuery = useQuery({
    queryKey: ['campaigns', 'my'],
    queryFn: () => campaignService.listMy(),
    enabled: user?.role === 'BUSINESS',
    staleTime: STALE.list,
  });
  const savedCreatorsQuery = useQuery({
    queryKey: ['creators', 'saved'],
    queryFn: () => creatorService.getSavedCreators(),
    enabled: user?.role === 'BUSINESS',
    staleTime: STALE.list,
  });
  useRefetchOnFocusIfStale(profileQuery, campaignsQuery, savedCreatorsQuery);

  const profile = profileQuery.data;
  const activeCampaigns = (campaignsQuery.data?.campaigns ?? []).filter((c) => c.status === 'active').length;
  const savedCreators = savedCreatorsQuery.data?.length ?? 0;

  const vm = profile
    ? toOwnerVm(profile, { activeCampaigns, savedCreators })
    : emptyOwnerVm(user?.name ?? 'Business');

  return (
    <BusinessProfileView
      mode="owner"
      vm={vm}
      focusReviews={focus === 'reviews'}
    />
  );
}
