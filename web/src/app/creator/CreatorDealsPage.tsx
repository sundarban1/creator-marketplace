import { useMemo, useState } from 'react';
import { CalendarClock, MapPin, Smartphone, Tag } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchDeals, type Promotion } from '../api/promotion';
import { DashPageHeader } from './dash-ui/DashPageHeader';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { SearchInput } from '../ui/SearchInput';
import { Skeleton } from '../ui/Skeleton';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const npr = (n: number) => n.toLocaleString('en-IN');

/**
 * Business Deals — creator Discover page listing businesses' promotions
 * (web twin of mobile's deals.tsx + deal-detail.tsx). Browsing only: redeeming
 * is a QR handshake at the business, so it happens in the Kolab mobile app —
 * the page and the deal modal both say so instead of offering a Redeem button.
 */
export function CreatorDealsPage() {
  const t = useT();
  const deals = useAsync((s) => fetchDeals(s), []);
  const [search, setSearch] = useState('');
  const [openDeal, setOpenDeal] = useState<Promotion | null>(null);

  const all = useMemo(() => deals.data ?? [], [deals.data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? all.filter((d) => `${d.title} ${d.businessName ?? ''} ${d.description ?? ''} ${d.businessLocation ?? ''}`.toLowerCase().includes(q))
      : all;
  }, [all, search]);

  const offLabel = (d: Promotion) =>
    d.discountType === 'PERCENTAGE' ? t('deals.percentOff', { n: d.discountValue }) : t('deals.amountOff', { n: npr(d.discountValue) });

  return (
    <div>
      <DashPageHeader title={t('deals.headerTitle')} description={t('deals.subtitle')} />

      <AppOnlyNotice />

      {all.length > 0 && (
        <div className="mt-5 max-w-md">
          <SearchInput value={search} onChange={setSearch} placeholder={t('deals.searchPlaceholder')} />
        </div>
      )}

      <div className="mt-5">
        {deals.loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)}
          </div>
        ) : deals.error ? (
          <EmptyState variant="error" title={t('deals.loadError')} action={{ label: t('common.retry'), onClick: deals.reload }} />
        ) : all.length === 0 ? (
          <EmptyState
            variant="empty"
            icon={<Tag size={26} strokeWidth={1.75} />}
            title={t('deals.emptyTitle')}
            description={t('deals.emptyHint')}
            action={{ label: t('deals.exploreEventsButton'), href: '/creator/events' }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            variant="no-results"
            title={t('deals.noResultsTitle')}
            description={t('deals.noResultsHint')}
            action={{ label: t('deals.clearSearch'), onClick: () => setSearch('') }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setOpenDeal(d)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lg"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-violet/15 to-dash-pink/15">
                  {d.imageUrl ? (
                    <img src={d.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-violet-dark/60">
                      <Tag size={34} strokeWidth={1.5} />
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-success px-3 py-1 text-[12.5px] font-bold text-white shadow">
                    {offLabel(d)}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={d.businessName ?? 'Business'} src={d.businessLogoUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-ink">{d.businessName}</p>
                      {d.businessLocation && (
                        <p className="flex items-center gap-1 truncate text-[12px] text-ink-soft">
                          <MapPin size={11} className="flex-shrink-0" />
                          <span className="truncate">{d.businessLocation}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-[15px] font-semibold text-ink">{d.title}</p>
                  <p className="mt-auto flex items-center gap-1.5 pt-3 text-[12px] text-ink-soft">
                    <CalendarClock size={12} />
                    {t('deals.validUntil', { date: fmtDate(d.validUntil) })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
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

/** Redemption is a QR scan at the business, which only the mobile app does. */
function AppOnlyNotice() {
  const t = useT();
  return (
    <div className="flex items-start gap-3.5 rounded-2xl border border-violet/20 bg-violet/[0.06] p-4 sm:items-center">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet/[0.12] text-violet-dark">
        <Smartphone size={19} />
      </span>
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-ink">{t('deals.appNoticeTitle')}</p>
        <p className="mt-0.5 text-[13px] text-ink-soft">{t('deals.appNoticeBody')}</p>
      </div>
    </div>
  );
}
