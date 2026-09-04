import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { portfolioService } from '@/services/portfolio';
import { campaignService } from '@/services/campaign';
import { useFavoriteBusinesses } from '@/hooks/useFavoriteBusinesses';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { useRefetchOnFocusIfStale } from '@/hooks/useRefetchOnFocusIfStale';
import { STALE } from '@/lib/queryClient';
import { CreatorProfileView } from '@/features/creator/components/CreatorProfileView';
import { toOwnerVm, emptyOwnerVm } from '@/features/creator/utils/creatorProfileVm';
import type { ApiPortfolioItem } from '@/services/portfolio';

const NO_PORTFOLIO: ApiPortfolioItem[] = [];

// The creator viewing its own profile. Same page a business sees at
// (business)/creator-detail — <CreatorProfileView mode="owner"> layers the edit
// affordances (avatar/cover upload, section edit links, tappable stats, the
// portfolio manage strip) on top of the shared read-only layout.
export default function CreatorProfileScreen() {
  const { user } = useAuth();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const { favoriteIds, reloadIds } = useFavoriteBusinesses();

  // Shared caches — the profile query is the same entry creator home + Discover
  // use, so tab switches are instant. Replaces the getProfile/getMyApplications/
  // listMine trio that re-ran on every focus with a manual offlineCache fallback.
  const profileQuery = useCreatorProfile();
  const applicationsQuery = useQuery({
    queryKey: ['applications', 'creator', { status: 'ACCEPTED', limit: 50 }],
    queryFn: () => campaignService.getMyApplications({ status: 'ACCEPTED', limit: 50 }),
    enabled: user?.role === 'CREATOR',
    staleTime: STALE.list,
  });
  const portfolioQuery = useQuery({
    queryKey: ['portfolio', 'mine'],
    queryFn: () => portfolioService.listMine(),
    enabled: user?.role === 'CREATOR',
    staleTime: STALE.profile,
  });
  useRefetchOnFocusIfStale(profileQuery, applicationsQuery, portfolioQuery);

  // The favourite-business ids live in their own hook; keep re-syncing them on
  // focus (cheap, and covers un-favouriting done on another screen).
  useFocusEffect(useCallback(() => { void reloadIds(); }, [reloadIds]));

  const profile = profileQuery.data;
  // Only ACCEPTED + RELEASED counts as a completed event.
  const completedEvents = (applicationsQuery.data?.proposals ?? []).filter(
    (p) => p.workStatus === 'COMPLETED' && p.paymentStatus === 'RELEASED',
  ).length;

  const vm = profile
    ? toOwnerVm(profile, {
        completedEvents,
        savedBrands: favoriteIds.size,
        savedByBusinesses: profile.savedByBusinessCount ?? 0,
        portfolioItems: portfolioQuery.data ?? NO_PORTFOLIO,
      })
    : emptyOwnerVm(user?.name ?? 'Creator');

  return (
    <CreatorProfileView mode="owner" vm={vm} focusReviews={focus === 'reviews'} />
  );
}
