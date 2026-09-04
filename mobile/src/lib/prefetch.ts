import type { QueryClient } from '@tanstack/react-query';
import { campaignService } from '@/services/campaign';
import { creatorService } from '@/services/creator';
import { businessService } from '@/services/business';
import { STALE } from './queryClient';

// Prefetch helpers for the entity detail screens (campaign-detail,
// creator-detail x2, business-detail). Call from a list row's onPressIn —
// touch-down fires ~100-300ms before onPress/navigation lands, so the
// detail screen's own useQuery below often finds a warm (or already
// in-flight) cache entry the instant it mounts instead of starting cold.
//
// Each helper mirrors the EXACT queryKey + queryFn + staleTime the
// corresponding detail screen's own useQuery uses (see campaign-detail.tsx,
// (business)/creator-detail.tsx, (creator)/creator-detail.tsx,
// (creator)/business-detail.tsx) — this has to genuinely warm the same
// cache entry, not populate a shadow copy under a different key. React
// Query no-ops a prefetch when that key is already fresh, so calling this
// on every touch-down is safe and doesn't create extra requests for a card
// the user is just idly tapping around on.

export function prefetchCampaign(queryClient: QueryClient, id: string): void {
  void queryClient.prefetchQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignService.getById(id),
    staleTime: STALE.profile,
  });
}

/** Creator viewed by another creator (peer) — (creator)/creator-detail.tsx. */
export function prefetchCreatorPeer(queryClient: QueryClient, id: string): void {
  void queryClient.prefetchQuery({
    queryKey: ['creator', id, 'peer'],
    queryFn: () => creatorService.getPeerCreatorProfile(id),
    staleTime: STALE.profile,
  });
}

/** Creator viewed by a business — (business)/creator-detail.tsx. */
export function prefetchCreatorPublic(queryClient: QueryClient, id: string): void {
  void queryClient.prefetchQuery({
    queryKey: ['creator', id, 'public'],
    queryFn: () => creatorService.getCreatorPublicProfile(id),
    staleTime: STALE.profile,
  });
}

export function prefetchBusiness(queryClient: QueryClient, id: string): void {
  void queryClient.prefetchQuery({
    queryKey: ['business', id],
    queryFn: () => businessService.getBusinessById(id),
    staleTime: STALE.profile,
  });
}
