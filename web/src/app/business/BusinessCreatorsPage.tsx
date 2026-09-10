import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { fetchCreatorFilterOptions } from '../api/publicMarketplace';
import {
  listBusinessCreators,
  fetchSavedCreatorIds,
  toggleSaveCreator,
  type BusinessCreatorCard,
} from '../api/business';
import { PageHeader } from '../ui/PageHeader';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { BizCreatorCard } from './BizCreatorCard';

export function BusinessCreatorsPage() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const sort = params.get('sort') ?? 'newest';
  const debouncedSearch = useDebouncedValue(search, 350);

  const filterOptions = useAsync((s) => fetchCreatorFilterOptions(s), []);
  const savedIds = useAsync((s) => fetchSavedCreatorIds(s), []);
  // Locally toggled ids overlay the fetched set (so the heart flips instantly).
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());
  const isSaved = (id: string) => overrides.get(id) ?? (savedIds.data ?? []).includes(id);

  const [items, setItems] = useState<BusinessCreatorCard[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'loading' | 'loadingMore' | 'ready' | 'error'>('loading');
  const reqId = useRef(0);

  const load = useCallback(
    async (nextPage: number, append: boolean) => {
      const id = ++reqId.current;
      setStatus(append ? 'loadingMore' : 'loading');
      try {
        const res = await listBusinessCreators(
          {
            search: debouncedSearch || undefined,
            categories: category ? [category] : undefined,
            sort: sort === 'newest' ? undefined : sort,
            page: nextPage,
          },
        );
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
    [debouncedSearch, category, sort],
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

  const onToggleSave = async (id: string) => {
    const nextValue = !isSaved(id);
    setOverrides((prev) => new Map(prev).set(id, nextValue));
    try {
      await toggleSaveCreator(id);
    } catch {
      setOverrides((prev) => {
        const m = new Map(prev);
        m.delete(id);
        return m;
      });
    }
  };

  const canLoadMore = items.length < total;

  return (
    <>
      <PageHeader title={t('biz.findTitle')} description={t('biz.findSubtitle')} />

      <div className="space-y-3">
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            aria-label={t('public.category')}
            value={category}
            onChange={(e) => patch('category', e.target.value)}
            placeholder={t('public.allCategories')}
            options={(filterOptions.data?.categories ?? []).map((c) => ({ value: c, label: c }))}
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
        <p className="text-[13px] text-ink-soft">
          {status === 'loading' ? ' ' : t('public.resultsCount', { count: total })}
        </p>
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
        ) : items.length === 0 ? (
          <EmptyState variant="no-results" title={t('public.noCreatorsTitle')} description={t('public.noCreatorsBody')} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((c) => (
                <BizCreatorCard key={c.id} creator={c} saved={isSaved(c.id)} onToggleSave={() => onToggleSave(c.id)} />
              ))}
            </div>
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
