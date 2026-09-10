import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useT } from '../i18n';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import {
  fetchCreatorFilterOptions,
  fetchPublicCreators,
  type CreatorCard as CreatorCardData,
  type CreatorFilterOptions,
  type CreatorSort,
} from '../api/publicMarketplace';
import { SEO } from '../../lib/seo/SEO';
import { webPageSchema } from '../../lib/seo/schema';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { CreatorCard } from './CreatorCard';

const PAGE_SIZE = 12;
const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'facebook'];

export function CreatorsPage() {
  const t = useT();
  const [params, setParams] = useSearchParams();

  const search = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const platform = params.get('platform') ?? '';
  const location = params.get('location') ?? '';
  const sort = (params.get('sort') as CreatorSort) || 'newest';
  const debouncedSearch = useDebouncedValue(search, 350);
  const debouncedLocation = useDebouncedValue(location, 350);

  const [filterOptions, setFilterOptions] = useState<CreatorFilterOptions | null>(null);
  useEffect(() => {
    const c = new AbortController();
    fetchCreatorFilterOptions(c.signal).then(setFilterOptions).catch(() => {});
    return () => c.abort();
  }, []);

  const [items, setItems] = useState<CreatorCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'loading' | 'loadingMore' | 'ready' | 'error'>('loading');
  const reqId = useRef(0);

  const query = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      categories: category ? [category] : undefined,
      platforms: platform ? [platform] : undefined,
      location: debouncedLocation || undefined,
      sort,
    }),
    [debouncedSearch, category, platform, debouncedLocation, sort],
  );

  const load = useCallback(
    async (nextPage: number, append: boolean) => {
      const id = ++reqId.current;
      setStatus(append ? 'loadingMore' : 'loading');
      try {
        const res = await fetchPublicCreators({ ...query, page: nextPage, limit: PAGE_SIZE });
        if (id !== reqId.current) return;
        setItems((prev) => (append ? [...prev, ...res.creators] : res.creators));
        setTotal(res.total);
        setPage(nextPage);
        setStatus('ready');
      } catch {
        if (id !== reqId.current) return;
        setStatus('error');
      }
    },
    [query],
  );

  // Reload from page 1 whenever the query changes.
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

  const hasFilters = Boolean(search || category || platform || location || sort !== 'newest');
  const canLoadMore = items.length < total;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <SEO
        title={t('public.creatorsTitle')}
        description={t('public.creatorsSubtitle')}
        path="/creators"
        jsonLd={webPageSchema({
          path: '/creators',
          title: t('public.creatorsTitle'),
          description: t('public.creatorsSubtitle'),
        })}
      />

      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-[2.5rem]">{t('public.creatorsTitle')}</h1>
        <p className="mt-2 text-[15px] text-ink-soft">{t('public.creatorsSubtitle')}</p>
      </header>

      {/* Controls */}
      <div className="mt-8 space-y-3">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="search"
            value={search}
            onChange={(e) => patch('q', e.target.value)}
            placeholder={t('public.searchCreatorsPlaceholder')}
            aria-label={t('public.searchCreatorsPlaceholder')}
            className="h-12 w-full rounded-xl border border-line-strong bg-surface pl-11 pr-4 text-[15px] text-ink placeholder:text-ink-soft/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/35"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            aria-label={t('public.category')}
            value={category}
            onChange={(e) => patch('category', e.target.value)}
            placeholder={t('public.allCategories')}
            options={(filterOptions?.categories ?? []).map((c) => ({ value: c, label: c }))}
          />
          <Select
            aria-label={t('public.platform')}
            value={platform}
            onChange={(e) => patch('platform', e.target.value)}
            placeholder={t('public.allPlatforms')}
            options={(filterOptions?.platforms ?? PLATFORMS).map((p) => ({
              value: p.toLowerCase(),
              label: p[0].toUpperCase() + p.slice(1),
            }))}
          />
          <input
            type="text"
            value={location}
            onChange={(e) => patch('location', e.target.value)}
            placeholder={t('public.location')}
            aria-label={t('public.location')}
            className="h-11 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-[14px] text-ink placeholder:text-ink-soft/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/35"
          />
          <Select
            aria-label="Sort"
            value={sort}
            onChange={(e) => patch('sort', e.target.value === 'newest' ? '' : e.target.value)}
            options={[
              { value: 'newest', label: t('public.sortNewest') },
              { value: 'oldest', label: t('public.sortOldest') },
              { value: 'followers', label: t('public.sortFollowers') },
            ]}
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-[13px] text-ink-soft">
            {status === 'loading' ? ' ' : t('public.resultsCount', { count: total })}
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

      {/* Results */}
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
              <div key={i} className="rounded-2xl border border-line bg-surface p-5">
                <div className="flex gap-3">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="flex-1 space-y-2 pt-1">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="mt-4 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-4/5" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            variant="no-results"
            title={t('public.noCreatorsTitle')}
            description={t('public.noCreatorsBody')}
            action={hasFilters ? { label: t('public.clearAll'), onClick: () => setParams({}, { replace: true }) } : undefined}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((c) => (
                <CreatorCard key={c.id} creator={c} />
              ))}
            </div>
            {canLoadMore && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="secondary"
                  loading={status === 'loadingMore'}
                  onClick={() => load(page + 1, true)}
                >
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
