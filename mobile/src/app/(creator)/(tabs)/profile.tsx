import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { creatorService, type ApiCreatorProfile } from '@/services/creator';
import { portfolioService, type ApiPortfolioItem } from '@/services/portfolio';
import { campaignService } from '@/services/campaign';
import { useFavoriteBusinesses } from '@/hooks/useFavoriteBusinesses';
import { getCached, setCached } from '@/utilities/offlineCache';
import { CreatorProfileView } from '@/features/creator/components/CreatorProfileView';
import { toOwnerVm, emptyOwnerVm } from '@/features/creator/utils/creatorProfileVm';

// The creator viewing its own profile. Same page a business sees at
// (business)/creator-detail — <CreatorProfileView mode="owner"> layers the edit
// affordances (avatar/cover upload, section edit links, tappable stats, the
// portfolio manage strip) on top of the shared read-only layout.
export default function CreatorProfileScreen() {
  const { user } = useAuth();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const { favoriteIds, reloadIds } = useFavoriteBusinesses();

  const [profile, setProfile]               = useState<ApiCreatorProfile | null>(null);
  const [completedEvents, setCompleted]     = useState(0);
  const [portfolioItems, setPortfolioItems] = useState<ApiPortfolioItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      void reloadIds();
      void getCached<ApiCreatorProfile>('creator_profile').then((cached) => {
        if (cached) setProfile((p) => p ?? cached);
      });
      creatorService.getProfile()
        .then((p) => { setProfile(p); void setCached('creator_profile', p); })
        .catch(() => {});
      // Only ACCEPTED + RELEASED counts as a completed event (see the pre-
      // unification screen's comment).
      campaignService.getMyApplications({ status: 'ACCEPTED', limit: 50 })
        .then(({ proposals }) => {
          setCompleted(proposals.filter((p) => p.workStatus === 'COMPLETED' && p.paymentStatus === 'RELEASED').length);
        })
        .catch(() => {});
      portfolioService.listMine().then(setPortfolioItems).catch(() => {});
    }, []),
  );

  const vm = profile
    ? toOwnerVm(profile, {
        completedEvents,
        savedBrands: favoriteIds.size,
        savedByBusinesses: profile.savedByBusinessCount ?? 0,
        portfolioItems,
      })
    : emptyOwnerVm(user?.name ?? 'Creator');

  return (
    <CreatorProfileView mode="owner" vm={vm} focusReviews={focus === 'reviews'} />
  );
}
