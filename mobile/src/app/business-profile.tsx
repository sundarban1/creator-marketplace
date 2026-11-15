import { Redirect, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { BusinessProfileView } from '@/features/business/components/BusinessProfileView';
import { privateVisitorVm, toVisitorVm } from '@/features/business/utils/businessProfileVm';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { STALE } from '@/lib/queryClient';
import { publicService } from '@/services/public';

// Public business profile for the Guest navigation. Reads
// /api/public/businesses/:id (id or slug) — private businesses come back
// masked. Same BusinessProfileView the creator app uses, in `guest` mode.
export default function PublicBusinessProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const q = useQuery({
    queryKey: ['guest', 'business', id],
    queryFn: () => publicService.getBusiness(id),
    enabled: !!id && user?.role !== 'CREATOR',
    staleTime: STALE.profile,
  });
  const { refreshing, onRefresh } = usePullToRefresh(q);

  // Signed in (e.g. returned here after login): creators get the full
  // business-detail screen. Businesses have no business-detail screen of
  // their own, so they keep this read-only view.
  if (user?.role === 'CREATOR' && id) {
    return <Redirect href={{ pathname: '/(creator)/business-detail', params: { id } }} />;
  }

  const business = q.data;
  const vm = !business ? null : business.isPrivate ? privateVisitorVm(business) : toVisitorVm(business);

  return (
    <BusinessProfileView
      mode="guest"
      vm={vm}
      loading={q.isPending}
      error={q.isError && !business}
      isPrivate={!!business?.isPrivate}
      onRetry={() => { void q.refetch(); }}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
}
