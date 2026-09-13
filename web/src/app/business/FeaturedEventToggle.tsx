import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchFeaturedQuota } from '../api/business';
import { rupees } from '../lib/format';
import { Switch } from '../ui/Switch';
import { Skeleton } from '../ui/Skeleton';

/**
 * "Feature this event" row for create/edit — reflects the admin's
 * `featuredEvent.paywallEnabled` setting (see CampaignService.getFeaturedQuota).
 * Paywall off (the default) or this business is on the free-email allowlist:
 * behaves exactly like a plain always-on switch, same as before this existed.
 * Paywall on and the business's free quota is used up: the switch is disabled
 * rather than left on and silently ignored — the backend drops `isFeatured`
 * once the quota is exhausted (create()), so a switch that *looks* on but
 * does nothing would be misleading.
 */
export function FeaturedEventToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const t = useT();
  const quota = useAsync((s) => fetchFeaturedQuota(s), []);

  if (quota.loading) {
    return <Skeleton className="h-[60px] w-full rounded-xl" />;
  }

  const locked = !!quota.data && !quota.data.unlimited && quota.data.remaining <= 0;
  const hint =
    quota.data && !quota.data.unlimited
      ? locked
        ? t('biz.featureQuotaExhausted', { price: rupees(quota.data.price) })
        : t('biz.featureQuotaRemaining', { count: quota.data.remaining })
      : t('biz.featureThisEventHint');

  return (
    <div className="flex items-center justify-between rounded-xl border border-line-strong px-4 py-3">
      <div className="min-w-0 pr-4">
        <p className="text-[13px] font-semibold text-ink">{t('biz.featureThisEvent')}</p>
        <p className="text-[12px] text-ink-soft">{hint}</p>
      </div>
      <Switch
        checked={locked ? false : checked}
        onChange={onChange}
        disabled={locked}
        label={t('biz.featureThisEvent')}
      />
    </div>
  );
}
