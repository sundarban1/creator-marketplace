import { Redirect, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { CreatorProfileView } from '@/features/creator/components/CreatorProfileView';
import { privateVisitorVm, toVisitorVm } from '@/features/creator/utils/creatorProfileVm';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { STALE } from '@/lib/queryClient';
import { publicService } from '@/services/public';

// Public creator profile for the Guest navigation — a signed-out visitor
// browsing talent. Reads /api/public/creators/:handle (id or username); a
// creator who turned off their public profile comes back masked (isPrivate)
// and renders the private placeholder. Same CreatorProfileView the signed-in
// apps use, in `guest` mode (account actions → login prompt).
export default function PublicCreatorProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { user } = useAuth();

  const q = useQuery({
    queryKey: ['guest', 'creator', handle],
    queryFn: () => publicService.getCreator(handle),
    enabled: !!handle && !user,
    staleTime: STALE.profile,
  });
  const { refreshing, onRefresh } = usePullToRefresh(q);

  // Reached while signed in (e.g. a "return here after login" intent) — use
  // the role's own profile screen, which has the full signed-in actions.
  if (user && handle) {
    return user.role === 'BUSINESS'
      ? <Redirect href={{ pathname: '/(business)/creator-detail', params: { id: handle } }} />
      : <Redirect href={{ pathname: '/(creator)/creator-detail', params: { id: handle } }} />;
  }

  const profile = q.data;
  const vm = !profile ? null : profile.isPrivate ? privateVisitorVm(profile) : toVisitorVm(profile);

  return (
    <CreatorProfileView
      mode="guest"
      vm={vm}
      loading={q.isPending}
      error={q.isError && !profile}
      isPrivate={!!profile?.isPrivate}
      onRetry={() => { void q.refetch(); }}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
}
