import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { creatorService } from '@/services/creator';
import { STALE } from '@/lib/queryClient';
import { CreatorProfileView } from '@/features/creator/components/CreatorProfileView';
import { toVisitorVm, privateVisitorVm } from '@/features/creator/utils/creatorProfileVm';

// A business viewing a creator. Same page the creator sees on its own Profile
// tab — <CreatorProfileView mode="business"> renders it read-only and adds the
// business-only chrome (services + service-request, team roster, portfolio
// gallery, report, message-request bar).
export default function CreatorDetailScreen() {
  const { id, viaTeam } = useLocalSearchParams<{ id: string; viaTeam?: string }>();

  // Cache-first: revisiting a creator's profile (e.g. back from a proposal
  // screen) renders instantly from cache while the background refresh runs.
  const q = useQuery({
    queryKey: ['creator', id, 'public'],
    queryFn: () => creatorService.getCreatorPublicProfile(id),
    enabled: !!id,
    staleTime: STALE.profile,
  });

  const profile = q.data;
  const isPrivate = !!profile?.isPrivate;
  const vm = !profile ? null : profile.isPrivate ? privateVisitorVm(profile) : toVisitorVm(profile);

  return (
    <CreatorProfileView
      mode="business"
      vm={vm}
      loading={q.isPending}
      error={q.isError && !profile}
      isPrivate={isPrivate}
      onRetry={() => { void q.refetch(); }}
      viaTeam={viaTeam === '1'}
    />
  );
}
