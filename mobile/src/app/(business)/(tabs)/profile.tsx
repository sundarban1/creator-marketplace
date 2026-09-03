import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { profileService, type BusinessProfile } from '@/services/profile';
import { campaignService } from '@/services/campaign';
import { creatorService } from '@/services/creator';
import { getCached, setCached } from '@/utilities/offlineCache';
import { BusinessProfileView } from '@/features/business/components/BusinessProfileView';
import { toOwnerVm, emptyOwnerVm } from '@/features/business/utils/businessProfileVm';

// The business viewing its own profile. Same page a creator sees at
// (creator)/business-detail — <BusinessProfileView mode="owner"> layers the
// edit affordances (cover/logo upload, section edit links, tappable stats) on
// top of the shared read-only layout.
export default function BusinessProfileScreen() {
  const { user } = useAuth();
  const { focus } = useLocalSearchParams<{ focus?: string }>();

  const [profile, setProfile]                 = useState<BusinessProfile | null>(null);
  const [activeCampaigns, setActiveCampaigns] = useState(0);
  const [savedCreators, setSavedCreators]     = useState(0);

  useFocusEffect(
    useCallback(() => {
      // Last-known profile first (offline), without clobbering a fresher load.
      void getCached<BusinessProfile>('business_profile').then((cached) => {
        if (cached) setProfile((p) => p ?? cached);
      });
      profileService.getBusinessProfile()
        .then((p) => { setProfile(p); void setCached('business_profile', p); })
        .catch(() => {});
      campaignService.listMy()
        .then(({ campaigns }) => setActiveCampaigns(campaigns.filter((c) => c.status === 'active').length))
        .catch(() => {});
      creatorService.getSavedCreators()
        .then((creators) => setSavedCreators(creators.length))
        .catch(() => {});
    }, []),
  );

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
