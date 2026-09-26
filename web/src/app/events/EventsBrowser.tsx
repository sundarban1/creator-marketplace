import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useT } from '../i18n';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { useAsync } from '../lib/useAsync';
import { fetchPublicEvents, type EventCard as EventCardData, type EventSort } from '../api/publicMarketplace';
import { fetchCategories, fetchCampaignPlatforms } from '../api/catalog';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { EventCard } from '../public/EventCard';
import { DashEventCard } from '../creator/dash-ui/DashEventCard';
import { DashTabs } from '../creator/dash-ui/DashTabs';
import { cn } from '../ui/cn';
import { fadeUp, stagger } from '../../pages/landing/lib/motion';

const PAGE_SIZE = 12;

const BUDGET_PRESETS: { value: string; min?: number; max?: number }[] = [
  { value: 'under5k', max: 5000 },
  { value: '5to10k', min: 5000, max: 10000 },
  { value: '10to20k', min: 10000, max: 20000 },
  { value: 'over20k', min: 20000 },
];

/**
 * Shared search + filter + paginated grid of events. The public `/events` page
 * and the creator `/creator/events` page wrap this with their own chrome and
 * `hrefBase` for the detail link.
 */
export function EventsBrowser({
  hrefBase,
  appliedIds,
  showSearch = true,
  variant = 'editorial',
}: {
  hrefBase: string;
  /** campaignIds the viewer has already applied to — shown with an "Applied" tag. */
  appliedIds?: Set<string>;
  /** When false, the wrapping page owns the search input (e.g. the public hero). */
  showSearch?: boolean;
  /**
   * `'dashboard'` swaps in the creator dashboard's flat card + underline type
   * tabs (used only by `/creator/events`); `'editorial'` (default) keeps the
   * public marketplace's current look untouched.
   */
  variant?: 'editorial' | 'dashboard';
}) {
  const t = useT();
  const [params, setParams] = useSearchParams();

  const search = params.get('q') ?? '';
  const type = params.get('type') ?? '';
  const category = params.get('category') ?? '';
  const platform = params.get('platform') ?? '';
  const budget = params.get('budget') ?? '';
  const sort = (params.get('sort') as EventSort) || 'newest';
  const debouncedSearch = useDebouncedValue(search, 350);
  const dashboard = variant === 'dashboard';

  const categories = useAsync((s) => fetchCategories(s), []);
  const platforms = useAsync((s) => fetchCampaignPlatforms(s), []);
  const budgetRange = BUDGET_PRESETS.find((b) => b.value === budget);

  const [items, setItems] = useState<EventCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'loading' | 'loadingMore' | 'ready' | 'error'>('loading');
  const reqId = useRef(0);

  const load = useCallback(
    async (nextPage: number, append: boolean) => {
      const id = ++reqId.current;
      setStatus(append ? 'loadingMore' : 'loading');
      try {
        const res = await fetchPublicEvents({
          search: debouncedSearch || undefined,
          campaignType: (type as 'PAID_CAMPAIGN' | 'OPEN_EVENT') || undefined,
          category: category ? [category] : undefined,
          platform: platform ? [platform] : undefined,
          minBudget: budgetRange?.min,
          maxBudget: budgetRange?.max,
          sort: sort === 'newest' ? undefined : sort,
          page: nextPage,
          limit: PAGE_SIZE,
        });
        if (id !== reqId.current) return;
        setItems((prev) => (append ? [...prev, ...res.items] : res.items));
        setTotal(res.pagination?.total ?? res.items.length);
        setPage(nextPage);
        setStatus('ready');
      } catch {
        if (id !== reqId.current) return;
        setStatus('error');
      }
    },
    [debouncedSearch, type, category, platform, budgetRange, sort],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(1, false);
  }, [load]);

  const patch = (key: string, value: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };

  const hasFilters = Boolean(search || type || category || platform || budget || sort !== 'newest');
  const canLoadMore = items.length < total;
  const typeTabs = [
    { value: '', label: t('public.allTypes') },
    { value: 'PAID_CAMPAIGN', label: t('public.typePaid') },
    { value: 'OPEN_EVENT', label: t('public.typeOpenEvent') },
  ];

  const categoryOptions = useMemo(
    () => (categories.data ?? []).map((c) => ({ value: c.name, label: c.name })),
    [categories.data],
  );
  const platformOptions = useMemo(
    () => (platforms.data ?? []).map((p) => ({ value: p.toLowerCase(), label: p[0].toUpperCase() + p.slice(1) })),
    [platforms.data],
  );
  const budgetOptions = BUDGET_PRESETS.map((b) => ({ value: b.value, label: t(`public.budget_${b.value}`) }));
  const sortOptions: { value: EventSort; label: string }[] = [
    { value: 'newest', label: t('public.sortNewest') },
    { value: 'oldest', label: t('public.sortOldest') },
    { value: 'budget_high', label: t('public.sortBudgetHigh') },
  ];

  return (
    <div>
      <div className="space-y-3">
        {dashboard && <DashTabs tabs={typeTabs} value={type} onChange={(v) => patch('type', v)} />}
        <div
          className={cn(
            'grid gap-3',
            dashboard ? '' : showSearch ? 'sm:grid-cols-[1fr_220px]' : 'sm:grid-cols-2',
          )}
        >
          {showSearch && (
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                type="search"
                value={search}
                onChange={(e) => patch('q', e.target.value)}
                placeholder={t('public.searchEventsPlaceholder')}
                aria-label={t('public.searchEventsPlaceholder')}
                className={cn(
                  'h-12 w-full pl-11 pr-4 text-[15px] text-ink placeholder:text-ink-soft/60 focus:outline-none',
                  dashboard
                    ? 'rounded-xl bg-ink/[0.03] focus:bg-surface focus:ring-2 focus:ring-violet/20'
                    : 'rounded-xl border border-line-strong bg-surface focus:border-brand focus:ring-2 focus:ring-brand/35',
                )}
              />
            </div>
          )}
          {!dashboard && (
            <Select
              aria-label={t('public.allTypes')}
              value={type}
              onChange={(e) => patch('type', e.target.value)}
              placeholder={t('public.allTypes')}
              options={[
                { value: 'PAID_CAMPAIGN', label: t('public.typePaid') },
                { value: 'OPEN_EVENT', label: t('public.typeOpenEvent') },
              ]}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Select
            aria-label={t('public.category')}
            value={category}
            onChange={(e) => patch('category', e.target.value)}
            placeholder={t('public.allCategories')}
            options={categoryOptions}
          />
          <Select
            aria-label={t('public.platform')}
            value={platform}
            onChange={(e) => patch('platform', e.target.value)}
            placeholder={t('public.allPlatforms')}
            options={platformOptions}
          />
          <Select
            aria-label={t('public.budget')}
            value={budget}
            onChange={(e) => patch('budget', e.target.value)}
            placeholder={t('public.allBudgets')}
            options={budgetOptions}
          />
          <Select
            aria-label={t('public.sort')}
            value={sort}
            onChange={(e) => patch('sort', e.target.value === 'newest' ? '' : e.target.value)}
            options={sortOptions}
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-[13px] text-ink-soft">
            {status === 'loading' ? ' ' : t('public.eventsResultsCount', { count: total })}
          </p>
          {hasFilters && (
            <button
              onClick={() => setParams({}, { replace: true })}
              className={cn(
                'inline-flex items-center gap-1.5 text-[13px] font-semibold hover:underline',
                dashboard ? 'text-violet-dark' : 'text-violet',
              )}
            >
              <SlidersHorizontal size={13} />
              {t('public.clearAll')}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        {status === 'error' ? (
          <EmptyState
            variant="error"
            title={t('common.somethingWrong')}
            action={{ label: t('common.retry'), onClick: () => load(1, false) }}
          />
        ) : status === 'loading' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'overflow-hidden rounded-2xl',
                  dashboard ? 'bg-white shadow-sm ring-1 ring-ink/[0.04]' : 'border border-line bg-surface',
                )}
              >
                <Skeleton className="aspect-[16/9] w-full rounded-none" />
                <div className="space-y-2 p-5">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            variant="no-events"
            title={t('public.noEventsTitle')}
            description={t('public.noEventsBody')}
            action={hasFilters ? { label: t('public.clearAll'), onClick: () => setParams({}, { replace: true }) } : undefined}
          />
        ) : (
          <>
            <motion.div
              initial="hidden"
              animate="show"
              variants={stagger(0.05)}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {items.map((e) => (
                <motion.div key={e.id} variants={fadeUp} className="relative">
                  {appliedIds?.has(e.id) && (
                    <span
                      className={cn(
                        'absolute right-3 top-3 z-20 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        dashboard ? 'bg-white/95 text-success shadow-sm' : 'bg-success-soft text-success',
                      )}
                    >
                      {t('creatorEvents.appliedTag')}
                    </span>
                  )}
                  {dashboard ? <DashEventCard event={e} hrefBase={hrefBase} /> : <EventCard event={e} hrefBase={hrefBase} />}
                </motion.div>
              ))}
            </motion.div>
            {canLoadMore && (
              <div className={cn('mt-8 flex justify-center')}>
                <Button variant="secondary" loading={status === 'loadingMore'} onClick={() => load(page + 1, true)}>
                  {t('public.loadMore')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
