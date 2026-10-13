import { useMemo, useState } from 'react';
import { Gift, Smartphone, Star, Tag } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchDeals, fetchPointsHistory, type Promotion } from '../api/promotion';
import { DashCard, DashCardHeader } from './dash-ui/DashCard';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { SearchInput } from '../ui/SearchInput';
import { Skeleton } from '../ui/Skeleton';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const npr = (n: number) => n.toLocaleString('en-IN');

/**
 * "Business Deals" tab of the creator Kolab Rewards page — web twin of mobile
 * wallet.tsx's DealsTab + deals.tsx + deal-detail.tsx. The points balance lives
 * in the page's shared balance card (wallet balance = Kolab Reward Points), so
 * this panel is just discoverable deals + points activity. Redemption itself is
 * a QR handshake at the business, so it stays in the app; the deal modal says
 * so instead of offering a Redeem button.
 */
export function RewardsDealsPanel() {
  const t = useT();
  const history = useAsync((s) => fetchPointsHistory(s), []);
  const deals = useAsync((s) => fetchDeals(s), []);
  const [search, setSearch] = useState('');
  const [openDeal, setOpenDeal] = useState<Promotion | null>(null);

  const filteredDeals = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = deals.data ?? [];
    return q
      ? list.filter((d) => `${d.title} ${d.businessName ?? ''} ${d.description ?? ''}`.toLowerCase().includes(q))
      : list;
  }, [deals.data, search]);

  const offLabel = (d: Promotion) =>
    d.discountType === 'PERCENTAGE' ? t('deals.percentOff', { n: d.discountValue }) : t('deals.amountOff', { n: npr(d.discountValue) });

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        {/* Deals */}
        <DashCard>
          <DashCardHeader title={t('deals.headerTitle')} />
          <p className="-mt-2 mb-4 text-[13px] text-ink-soft">{t('deals.subtitle')}</p>
          <SearchInput value={search} onChange={setSearch} placeholder={t('deals.searchPlaceholder')} />
          <div className="mt-4">
            {deals.loading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            ) : deals.error ? (
              <EmptyState variant="error" size="sm" title={t('deals.loadError')} action={{ label: t('common.retry'), onClick: deals.reload }} />
            ) : filteredDeals.length === 0 ? (
              <EmptyState
                variant="empty"
                size="sm"
                icon={<Tag size={24} strokeWidth={1.75} />}
                title={t('deals.emptyTitle')}
                description={t('deals.emptyHint')}
                action={{ label: t('deals.exploreEventsButton'), href: '/creator/events' }}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredDeals.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setOpenDeal(d)}
                    className="flex flex-col rounded-xl border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong hover:bg-surface-dim"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar name={d.businessName ?? 'Business'} src={d.businessLogoUrl} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-soft">{d.businessName}</span>
                      <span className="flex-shrink-0 rounded-full bg-success-soft px-2.5 py-0.5 text-[12px] font-semibold text-success">
                        {offLabel(d)}
                      </span>
                    </div>
                    <p className="mt-2.5 line-clamp-2 text-[14.5px] font-semibold text-ink">{d.title}</p>
                    <p className="mt-auto pt-2 text-[12px] text-ink-soft">{t('deals.validUntil', { date: fmtDate(d.validUntil) })}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DashCard>

        {/* Activity */}
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
      </div>

      <Modal open={!!openDeal} onClose={() => setOpenDeal(null)} title={openDeal?.title ?? t('deals.headerTitle')}>
        {openDeal && (
          <div className="space-y-4">
            {openDeal.imageUrl && <img src={openDeal.imageUrl} alt="" className="aspect-[16/9] w-full rounded-xl object-cover" />}
            <div className="flex items-center gap-3">
              <Avatar name={openDeal.businessName ?? 'Business'} src={openDeal.businessLogoUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink">{openDeal.businessName}</p>
                {openDeal.businessLocation && <p className="truncate text-[12.5px] text-ink-soft">{openDeal.businessLocation}</p>}
              </div>
              <span className="rounded-full bg-success-soft px-3 py-1 text-[13px] font-semibold text-success">{offLabel(openDeal)}</span>
            </div>
            {openDeal.description && <p className="whitespace-pre-line text-[14px] text-ink-soft">{openDeal.description}</p>}
            <div className="rounded-xl border border-line bg-surface-dim p-4">
              <p className="text-[13px] font-semibold text-ink">{t('deals.termsTitle')}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-ink-soft">
                <li>{t('deals.termOnePerCreator')}</li>
                <li>{t('deals.validRange', { from: fmtDate(openDeal.validFrom), to: fmtDate(openDeal.validUntil) })}</li>
                {openDeal.minSpend > 0 && <li>{t('deals.termMinSpend', { amount: npr(openDeal.minSpend) })}</li>}
                {openDeal.maxDiscountCap != null && <li>{t('deals.termMaxDiscount', { amount: npr(openDeal.maxDiscountCap) })}</li>}
              </ul>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-violet/[0.06] px-4 py-3">
              <Smartphone size={18} className="mt-0.5 flex-shrink-0 text-violet-dark" />
              <p className="text-[13px] text-ink">{t('deals.redeemInApp')}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
