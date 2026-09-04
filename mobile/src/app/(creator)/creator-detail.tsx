import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { creatorService } from '@/services/creator';
import { STALE } from '@/lib/queryClient';
import { CreatorProfileView } from '@/features/creator/components/CreatorProfileView';
import { toVisitorVm, privateVisitorVm } from '@/features/creator/utils/creatorProfileVm';

// A creator viewing another creator (a peer). Same page as everywhere else —
// <CreatorProfileView mode="peer"> renders it read-only with the peer-only
// chrome (message-request bar, no services/team/report — those are for a
// hiring business).
export default function CreatorPeerDetailScreen() {
  const { id, viaTeam } = useLocalSearchParams<{ id: string; viaTeam?: string }>();

  // Cache-first: revisiting a peer profile (e.g. back from a message thread)
  // renders instantly from cache while the background refresh runs.
  const q = useQuery({
    queryKey: ['creator', id, 'peer'],
    queryFn: () => creatorService.getPeerCreatorProfile(id),
    enabled: !!id,
    staleTime: STALE.profile,
  });

  const profile = q.data;
  const isPrivate = !!profile?.isPrivate;
  const vm = !profile ? null : profile.isPrivate ? privateVisitorVm(profile) : toVisitorVm(profile);

  return (
    <CreatorProfileView
      mode="peer"
      vm={vm}
      loading={q.isPending}
      error={q.isError && !profile}
      isPrivate={isPrivate}
      onRetry={() => { void q.refetch(); }}
      viaTeam={viaTeam === '1'}
    />
  );
}
