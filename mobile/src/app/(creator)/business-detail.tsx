import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { businessService } from '@/services/business';
import { campaignService } from '@/services/campaign';
import { STALE } from '@/lib/queryClient';
import { logger } from '@/utilities/logger';
import { BusinessProfileView } from '@/features/business/components/BusinessProfileView';
import { toVisitorVm, privateVisitorVm } from '@/features/business/utils/businessProfileVm';

const NO_APPLICATIONS: Awaited<ReturnType<typeof campaignService.getMyApplications>>['proposals'] = [];

// A creator viewing a business. Same page the business sees on its own Profile
// tab — <BusinessProfileView mode="visitor"> renders it read-only and adds the
// visitor-only chrome (back / favorite / report, message-request bar, the
// business's active events).
export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // Cache-first: revisiting a business's profile renders instantly from
  // cache while the background refresh runs.
  const bizQuery = useQuery({
    queryKey: ['business', id],
    queryFn: () => businessService.getBusinessById(id),
    enabled: !!id,
    staleTime: STALE.profile,
  });
  // Shared with every other screen that reads the creator's own applications
  // (no params here — the full list — so it's a distinct cache entry from the
  // ACCEPTED-only ones the home/profile tabs use).
  const applicationsQuery = useQuery({
    queryKey: ['applications', 'creator', 'all'],
    queryFn: () => campaignService.getMyApplications().then((r) => r.proposals),
    staleTime: STALE.list,
  });

  // Raw error text never reaches the user — logger.error ships it to Sentry,
  // BusinessProfileView shows a sanitized, translated sentence instead.
  useEffect(() => {
    if (bizQuery.error) logger.error('[business-detail] load failed', bizQuery.error);
  }, [bizQuery.error]);

  const business = bizQuery.data;
  const appliedCampaignIds = new Set((applicationsQuery.data ?? NO_APPLICATIONS).map((a) => a.campaignId));
  const isPrivate = !!business?.isPrivate;
  const vm = !business
    ? null
    : business.isPrivate
      ? privateVisitorVm(business)
      : toVisitorVm(business);

  return (
    <BusinessProfileView
      mode="visitor"
      loading={bizQuery.isPending}
      error={bizQuery.isError && !business}
      isPrivate={isPrivate}
      vm={vm}
      onRetry={() => { void bizQuery.refetch(); }}
      appliedCampaignIds={appliedCampaignIds}
    />
  );
}
