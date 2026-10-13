import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { fadeUp, stagger } from '../../pages/landing/lib/motion';
import { fetchPublicBusinesses, type BusinessCard as BusinessCardData } from '../api/publicMarketplace';
import { fetchCategories } from '../api/catalog';
import { fetchFavoriteBusinesses, fetchSavedByBusinesses } from '../api/creator';
import { SegmentedControl } from '../ui/SegmentedControl';
import { SearchInput } from '../ui/SearchInput';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { makeCategoryLookup } from '../public/categoryLookup';
import { LocationAutocomplete } from '../public/LocationAutocomplete';
import { BusinessCard } from '../public/BusinessCard';
import { DashPageHeader } from './dash-ui/DashPageHeader';

export function CreatorDiscoverBusinessesPage() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const location = params.get('location') ?? '';
  // Favorites / "Saved me" views — mobile's favorite-businesses and
  // saved-by-businesses screens, folded into the one browse page.
  const rawView = params.get('view');
  const view: 'all' | 'favorites' | 'savedBy' = rawView === 'favorites' || rawView === 'savedBy' ? rawView : 'all';
  const debouncedSearch = useDebouncedValue(search, 350);
  const debouncedLocation = useDebouncedValue(location, 350);

  const categories = useAsync((s) => fetchCategories(s), []);
  const categoryMeta = useMemo(() => makeCategoryLookup(categories.data ?? []), [categories.data]);
  // Category filter shows only cross-scope categories (scope === 'BOTH').
  const categoryOptions = useMemo(
    () => (categories.data ?? []).filter((c) => c.scope === 'BOTH').map((c) => ({ value: c.name, label: c.name })),
    [categories.data],
  );

  const [items, setItems] = useState<BusinessCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'loading' | 'loadingMore' | 'ready' | 'error'>('loading');
  const reqId = useRef(0);

  const load = useCallback(
    async (nextPage: number, append: boolean) => {
      const id = ++reqId.current;
      setStatus(append ? 'loadingMore' : 'loading');
      try {
        if (view !== 'all') {
          const fetchList = view === 'favorites' ? fetchFavoriteBusinesses : fetchSavedByBusinesses;
          const list = await fetchList({
            category: category || undefined,
            locations: debouncedLocation ? [debouncedLocation] : undefined,
          });
          if (id !== reqId.current) return;
          // These endpoints have no text search — filter by name here.
          const needle = debouncedSearch.trim().toLowerCase();
          const filtered = needle ? list.filter((b) => (b.businessName ?? '').toLowerCase().includes(needle)) : list;
          setItems(filtered);
          setTotal(filtered.length);
          setPage(1);
          setStatus('ready');
          return;
        }
        const res = await fetchPublicBusinesses({
          search: debouncedSearch || undefined,
          category: category || undefined,
          locations: debouncedLocation ? [debouncedLocation] : undefined,
          page: nextPage,
        });
        if (id !== reqId.current) return;
        setItems((prev) => (append ? [...prev, ...res.businesses] : res.businesses));
        setTotal(res.total);
        setPage(nextPage);
        setStatus('ready');
      } catch {
        if (id !== reqId.current) return;
        setStatus('error');
      }
    },
    [view, debouncedSearch, category, debouncedLocation],
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

  const canLoadMore = items.length < total;
  const hasFilters = Boolean(search || category || location);
  const clearFilters = () => setParams(view === 'all' ? {} : { view }, { replace: true });

  return (
    <>
      <DashPageHeader title={t('nav.discoverBusinesses')} description={t('public.businessesSubtitle')} />

      <div className="mb-4 overflow-x-auto">
        <SegmentedControl
          ariaLabel={t('favoriteBusinesses.viewLabel')}
          value={view}
          onChange={(v) => patch('view', v === 'all' ? '' : v)}
          options={[
            { value: 'all', label: t('favoriteBusinesses.all') },
            { value: 'favorites', label: t('favoriteBusinesses.favorites') },
            { value: 'savedBy', label: t('favoriteBusinesses.savedBy') },
          ]}
        />
      </div>

      <div className="space-y-3">
        <SearchInput
          value={search}
          onChange={(v) => patch('q', v)}
          placeholder={t('public.searchBusinessesPlaceholder')}
        />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Select
            aria-label={t('public.category')}
            value={category}
            onChange={(e) => patch('category', e.target.value)}
            placeholder={t('public.allCategories')}
            options={categoryOptions}
          />
          <LocationAutocomplete
            value={location}
            onChange={(v) => patch('location', v)}
            placeholder={t('public.location')}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-ink-soft">
            {status === 'loading' ? ' ' : t('public.businessesResultsCount', { count: total })}
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-violet-dark hover:underline"
            >
              <SlidersHorizontal size={13} />
              {t('public.clearAll')}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        {status === 'error' ? (
          <EmptyState variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: () => load(1, false) }} />
        ) : status === 'loading' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 && view !== 'all' && !hasFilters ? (
          <EmptyState
            variant="empty"
            title={view === 'favorites' ? t('favoriteBusinesses.emptyFavorites') : t('favoriteBusinesses.emptySavedBy')}
            description={view === 'favorites' ? t('favoriteBusinesses.emptyFavoritesHint') : t('favoriteBusinesses.emptySavedByHint')}
            action={{ label: t('favoriteBusinesses.browse'), onClick: () => patch('view', '') }}
          />
        ) : items.length === 0 ? (
          <EmptyState
            variant="no-results"
            title={t('public.noBusinessesTitle')}
            description={t('public.noBusinessesBody')}
            action={hasFilters ? { label: t('public.clearAll'), onClick: clearFilters } : undefined}
          />
        ) : (
          <>
            <motion.div
              initial="hidden"
              animate="show"
              variants={stagger(0.05)}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {items.map((b) => (
                <motion.div key={b.id} variants={fadeUp} className="h-full min-w-0">
                  <BusinessCard business={b} categoryMeta={categoryMeta} hrefBase="/creator/businesses" />
                </motion.div>
              ))}
            </motion.div>
            {canLoadMore && (
              <div className="mt-8 flex justify-center">
                <Button variant="secondary" loading={status === 'loadingMore'} onClick={() => load(page + 1, true)}>
                  {t('public.loadMore')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
