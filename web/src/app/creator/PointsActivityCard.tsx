import { Gift, Star, Tag } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchPointsHistory } from '../api/promotion';
import { DashCard, DashCardHeader } from './dash-ui/DashCard';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const npr = (n: number) => n.toLocaleString('en-IN');

/**
 * Kolab Reward Points activity (points used at businesses via deals, admin
 * adjustments) — shown on the creator Kolab Rewards page. The deals themselves
 * live on their own Discover page (CreatorDealsPage).
 */
export function PointsActivityCard() {
  const t = useT();
  const history = useAsync((s) => fetchPointsHistory(s), []);

  return (
    <DashCard>
      <DashCardHeader title={t('rewards.recentActivityTitle')} />
      {history.loading ? (
        <Skeleton className="h-24 w-full" />
      ) : (history.data ?? []).length === 0 ? (
        <EmptyState
          variant="empty"
          size="sm"
          icon={<Gift size={24} strokeWidth={1.75} />}
          title={t('rewards.noActivityYet')}
          description={t('rewards.noActivityHint')}
        />
      ) : (
        <ul className="divide-y divide-ink/[0.05]">
          {(history.data ?? []).map((row) => (
            <li key={row.id} className="flex items-center gap-3 py-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet/[0.08] text-violet-dark">
                {row.type === 'PROMO_REDEMPTION_DEBIT' ? <Tag size={15} /> : <Star size={15} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-ink">
                  {row.type === 'PROMO_REDEMPTION_DEBIT'
                    ? row.businessName
                      ? t('rewards.txPromoRedemptionAt', { business: row.businessName })
                      : t('rewards.txPromoRedemption')
                    : t('rewards.txAdjustment')}
                </p>
                <p className="text-[12px] text-ink-soft">{fmtDate(row.createdAt)}</p>
              </div>
              <span className={row.direction === 'CREDIT' ? 'text-[14px] font-semibold text-success' : 'text-[14px] font-semibold text-ink'}>
                {row.direction === 'CREDIT' ? '+' : '−'}
                {npr(row.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashCard>
  );
}
