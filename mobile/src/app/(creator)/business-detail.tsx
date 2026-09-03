import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { businessService, type BusinessDetailResult } from '@/services/business';
import { campaignService } from '@/services/campaign';
import { logger } from '@/utilities/logger';
import { BusinessProfileView } from '@/features/business/components/BusinessProfileView';
import { toVisitorVm, privateVisitorVm } from '@/features/business/utils/businessProfileVm';

// A creator viewing a business. Same page the business sees on its own Profile
// tab — <BusinessProfileView mode="visitor"> renders it read-only and adds the
// visitor-only chrome (back / favorite / report, message-request bar, the
// business's active events).
export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [business, setBusiness] = useState<BusinessDetailResult | null>(null);
  const [appliedCampaignIds, setAppliedCampaignIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadBusiness = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setHasError(false);
    Promise.all([
      businessService.getBusinessById(id),
      campaignService.getMyApplications().then((r) => r.proposals).catch(() => []),
    ])
      .then(([biz, applications]) => {
        setBusiness(biz);
        setAppliedCampaignIds(new Set(applications.map((a) => a.campaignId)));
      })
      // Raw error text never reaches the user — logger.error ships it to Sentry,
      // BusinessProfileView shows a sanitized, translated sentence instead.
      .catch((e) => { logger.error('[business-detail] load failed', e); setHasError(true); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadBusiness();
  }, [loadBusiness]);

  const isPrivate = !!business?.isPrivate;
  const vm = !business
    ? null
    : business.isPrivate
      ? privateVisitorVm(business)
      : toVisitorVm(business);

  return (
    <BusinessProfileView
      mode="visitor"
      loading={loading}
      error={hasError}
      isPrivate={isPrivate}
      vm={vm}
      onRetry={loadBusiness}
      appliedCampaignIds={appliedCampaignIds}
    />
  );
}
