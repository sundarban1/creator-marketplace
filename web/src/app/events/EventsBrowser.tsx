import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useT } from '../i18n';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { fetchPublicEvents, type EventCard as EventCardData } from '../api/publicMarketplace';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { EventCard } from '../public/EventCard';
import { cn } from '../ui/cn';

const PAGE_SIZE = 12;

/**
 * Shared search + filter + paginated grid of events. The public `/events` page
 * and the creator `/creator/events` page wrap this with their own chrome and
 * `hrefBase` for the detail link.
 */
export function EventsBrowser({
  hrefBase,
  appliedIds,
}: {
  hrefBase: string;
  /** campaignIds the viewer has already applied to — shown with an "Applied" tag. */
  appliedIds?: Set<string>;
}) {
  const t = useT();
  const [params, setParams] = useSearchParams();

  const search = params.get('q') ?? '';
  const type = params.get('type') ?? '';
  const debouncedSearch = useDebouncedValue(search, 350);

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
    [debouncedSearch, type],
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

  const hasFilters = Boolean(search || type);
  const canLoadMore = items.length < total;

  return (
    <div>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="search"
              value={search}
              onChange={(e) => patch('q', e.target.value)}
              placeholder={t('public.searchEventsPlaceholder')}
              aria-label={t('public.searchEventsPlaceholder')}
              className="h-12 w-full rounded-xl border border-line-strong bg-surface pl-11 pr-4 text-[15px] text-ink placeholder:text-ink-soft/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/35"
            />
          </div>
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
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-[13px] text-ink-soft">
            {status === 'loading' ? ' ' : t('public.eventsResultsCount', { count: total })}
          </p>
          {hasFilters && (
            <button
              onClick={() => setParams({}, { replace: true })}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline"
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
              <div key={i} className="overflow-hidden rounded-2xl border border-line bg-surface">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((e) => (
                <div key={e.id} className="relative">
                  {appliedIds?.has(e.id) && (
                    <span className="absolute right-3 top-3 z-10 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
                      {t('creatorEvents.appliedTag')}
                    </span>
                  )}
                  <EventCard event={e} hrefBase={hrefBase} />
                </div>
              ))}
            </div>
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
