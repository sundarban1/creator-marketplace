import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import { useT, type TFn } from '../i18n';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { compactNumber } from '../lib/format';
import {
  searchPublicCreators,
  type BroaderCreatorSearch,
  type CreatorCard as CreatorCardData,
  type CreatorSearchInterpretation,
} from '../api/publicMarketplace';
import { fetchCategories, type Category } from '../api/catalog';
import { SEO } from '../../lib/seo/SEO';
import { fadeUp, stagger } from '../../pages/landing/lib/motion';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { CreatorCard } from './CreatorCard';
import { BrowseHero } from './BrowseHero';
import { LocationAutocomplete } from './LocationAutocomplete';
import { makeCategoryLookup } from './categoryLookup';

const PAGE_SIZE = 12;
const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'facebook'] as const;
const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  facebook: 'Facebook',
};
/** Filter value that explicitly clears a location/platform the query itself named. */
const ANY = 'any';
const FOLLOWER_STEPS = [1_000, 10_000, 50_000, 100_000, 1_000_000];

type Status = 'loading' | 'loadingMore' | 'ready' | 'error';
type Summary = Pick<CreatorSearchInterpretation, 'topic' | 'location' | 'minFollowers' | 'maxFollowers'> & {
  platform: string | null;
  ranked?: boolean;
};

function capitalize(s: string): string {
  return s.replace(/(^|\s)(\p{L})/gu, (_, sp: string, ch: string) => sp + ch.toUpperCase());
}

/**
 * "Food creators in Kathmandu" / "Top TikTok creators across Nepal" /
 * "Creators in Pokhara with 10K+ followers".
 */
function summaryTitle(t: TFn, s: Summary): string {
  const what = [
    s.ranked ? t('public.searchRankedByFollowers') : null,
    s.topic ? capitalize(s.topic) : null,
    s.platform ? PLATFORM_LABELS[s.platform] ?? capitalize(s.platform) : null,
  ]
    .filter(Boolean)
    .join(' ');
  const base = what && s.location
    ? t('public.searchTitleIn', { what, location: s.location })
    : what
      ? t('public.searchTitleAcrossNepal', { what })
      : s.location
        ? t('public.searchTitleAllIn', { location: s.location })
        : t('public.searchTitleAll');
  const audience =
    s.minFollowers != null && s.maxFollowers != null
      ? t('public.searchWithFollowersRange', { min: compactNumber(s.minFollowers), max: compactNumber(s.maxFollowers) })
      : s.minFollowers != null
        ? t('public.searchWithFollowersMin', { count: compactNumber(s.minFollowers) })
        : s.maxFollowers != null
          ? t('public.searchWithFollowersMax', { count: compactNumber(s.maxFollowers) })
          : '';
  return audience ? `${base} ${audience}` : base;
}

/** 10000 → "10k", 1500000 → "1.5m" — the spelling the backend parser reads back. */
function queryAmount(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)}m`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(2)}k`;
  return String(n);
}

/**
 * The query a broader-search suggestion navigates to. Always English phrasing
 * — it's parsed by the backend (creatorSearchIntent.ts), which reads it back
 * into exactly this topic/place/platform.
 */
function broaderQuery(b: BroaderCreatorSearch): string {
  const what = [b.topic, b.platform ? PLATFORM_LABELS[b.platform] ?? b.platform : null].filter(Boolean).join(' ');
  const audience =
    b.minFollowers != null && b.maxFollowers != null
      ? ` with ${queryAmount(b.minFollowers)}-${queryAmount(b.maxFollowers)} followers`
      : b.minFollowers != null
        ? ` with ${queryAmount(b.minFollowers)}+ followers`
        : b.maxFollowers != null
          ? ` under ${queryAmount(b.maxFollowers)} followers`
          : '';
  if (!what && !b.location && !audience) return '';
  return `${what ? `${capitalize(what)} creators` : 'Creators'}${audience} in ${b.location ?? 'Nepal'}`;
}

/**
 * /creators/search — public, no sign-in. Where the landing hero's natural-
 * language search lands. The backend interprets `q` into topic/place/platform
 * and returns real public creators; the dropdowns here override what it parsed.
 */
export function CreatorSearchPage() {
  const t = useT();
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const platformParam = params.get('platform') ?? '';
  const locationParam = params.get('location') ?? '';
  const minFollowersParam = params.get('minFollowers');
  const sortParam = (params.get('sort') ?? '') as '' | 'relevance' | 'followers';
  const debouncedLocation = useDebouncedValue(locationParam, 350);

  const [draft, setDraft] = useState(q);
  useEffect(() => {
    // Keep the box in sync when q changes from outside it (broader-search
    // chip, back/forward) — the URL is the source of truth.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(q);
  }, [q]);

  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    const c = new AbortController();
    fetchCategories(c.signal).then(setCategories).catch(() => {});
    return () => c.abort();
  }, []);
  const categoryMeta = useMemo(() => makeCategoryLookup(categories), [categories]);
  const categoryOptions = useMemo(
    () => categories.filter((c) => c.scope === 'BOTH').map((c) => ({ value: c.name, label: c.name })),
    [categories],
  );

  const [items, setItems] = useState<CreatorCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [interpretation, setInterpretation] = useState<CreatorSearchInterpretation | null>(null);
  const [broader, setBroader] = useState<BroaderCreatorSearch[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const reqId = useRef(0);

  const load = useCallback(
    async (nextPage: number, append: boolean) => {
      const id = ++reqId.current;
      setStatus(append ? 'loadingMore' : 'loading');
      try {
        const res = await searchPublicCreators({
          q,
          page: nextPage,
          limit: PAGE_SIZE,
          location: debouncedLocation,
          platform: platformParam,
          category,
          minFollowers: minFollowersParam ?? undefined,
          sort: sortParam,
        });
        if (id !== reqId.current) return;
        setItems((prev) => (append ? [...prev, ...res.creators] : res.creators));
        setTotal(res.total);
        setPage(nextPage);
        setInterpretation(res.interpretation);
        if (!append) setBroader(res.broaderSearches);
        setStatus('ready');
      } catch {
        if (id !== reqId.current) return;
        setStatus('error');
      }
    },
    [q, debouncedLocation, platformParam, category, minFollowersParam, sortParam],
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

  const submit = () => {
    const next = draft.trim();
    // A fresh search starts from what the new sentence says — overrides from
    // the previous one would otherwise silently fight it.
    setParams(next ? { q: next } : {});
  };

  const goBroader = (b: BroaderCreatorSearch) => {
    const next = broaderQuery(b);
    setParams(next ? { q: next, ...(category ? { category } : {}) } : category ? { category } : {});
  };

  // Effective values: an explicit override, else what the query named.
  const effectivePlatform =
    platformParam === ANY ? '' : platformParam || interpretation?.platforms[0] || '';
  const effectiveLocation = locationParam === ANY ? '' : locationParam || interpretation?.location || '';
  // Clearing a filter the query itself set needs the explicit ANY, or the
  // backend would just re-apply the parsed value.
  const clearValue = (parsed: string | null | undefined) => (parsed ? ANY : '');
  // interpretation already reflects the minFollowers/sort overrides (the
  // backend applies them before echoing it back).
  const effectiveMinFollowers = interpretation?.minFollowers ?? null;
  const effectiveSort = sortParam || (interpretation?.sortByFollowers ? 'followers' : 'relevance');
  const followerOptions = [...new Set([...FOLLOWER_STEPS, ...(effectiveMinFollowers ? [effectiveMinFollowers] : [])])]
    .sort((a, b) => a - b)
    .map((n) => ({ value: String(n), label: `${compactNumber(n)}+` }));

  const summary: Summary | null = interpretation
    ? {
        topic: interpretation.topic,
        location: effectiveLocation || null,
        platform: effectivePlatform || null,
        minFollowers: interpretation.minFollowers,
        maxFollowers: interpretation.maxFollowers,
        ranked: effectiveSort === 'followers' && !interpretation.minFollowers,
      }
    : null;
  const title = !q && !category && !effectivePlatform && !effectiveLocation
    ? t('public.searchTitleDefault')
    : summary
      ? summaryTitle(t, summary)
      : t('public.searchTitleDefault');

  const hasOverrides = Boolean(category || platformParam || locationParam || minFollowersParam !== null || sortParam);
  const wanted = interpretation?.creatorCount ?? null;
  const canLoadMore = items.length < total;

  const broaderChips = broader.length > 0 && (
    <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
      {broader.map((b) => (
        <button
          key={`${b.topic}|${b.location}|${b.platform}|${b.minFollowers}|${b.maxFollowers}`}
          type="button"
          onClick={() => goBroader(b)}
          className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:border-violet/50 hover:text-violet"
        >
          {summaryTitle(t, b)}
          <span className="text-ink-soft">· {t('public.searchBroaderCount', { count: b.count })}</span>
        </button>
      ))}
    </div>
  );

  return (
    <>
      <SEO
        title={title}
        description={t('public.searchSubtitle')}
        path={q ? `/creators/search?q=${encodeURIComponent(q)}` : '/creators/search'}
        noindex
      />

      <BrowseHero
        title={title}
        subtitle={t('public.searchSubtitle')}
        search={draft}
        onSearch={setDraft}
        onSubmit={submit}
        submitLabel={t('public.searchSubmit')}
        searchPlaceholder={t('public.searchPlaceholder')}
      />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        {/* Lightweight filters — only what the data model actually has. */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          <Select
            aria-label={t('public.category')}
            value={category}
            onChange={(e) => patch('category', e.target.value)}
            placeholder={t('public.allCategories')}
            options={categoryOptions}
          />
          <Select
            aria-label={t('public.platform')}
            value={effectivePlatform}
            onChange={(e) =>
              patch('platform', e.target.value || clearValue(interpretation?.platforms[0]))
            }
            placeholder={t('public.allPlatforms')}
            options={PLATFORMS.map((p) => ({ value: p, label: PLATFORM_LABELS[p]! }))}
          />
          <LocationAutocomplete
            value={effectiveLocation}
            onChange={(v) => patch('location', v || clearValue(interpretation?.location))}
            placeholder={t('public.location')}
          />
          <Select
            aria-label={t('public.searchFollowersFilter')}
            value={effectiveMinFollowers ? String(effectiveMinFollowers) : ''}
            onChange={(e) =>
              // '0' (not a deleted param) so a minimum the query named stays cleared.
              patch('minFollowers', e.target.value || (interpretation?.minFollowers ? '0' : ''))
            }
            placeholder={t('public.searchAnyFollowers')}
            options={followerOptions}
          />
          <Select
            aria-label={t('public.sort')}
            value={effectiveSort}
            onChange={(e) => patch('sort', e.target.value)}
            options={[
              { value: 'relevance', label: t('public.searchSortBestMatch') },
              { value: 'followers', label: t('public.sortFollowers') },
            ]}
          />
        </div>

        <div className="mt-3 flex min-h-[20px] items-center justify-between">
          <p className="text-[13px] text-ink-soft" aria-live="polite">
            {status === 'loading'
              ? t('public.searching')
              : status === 'error' || total === 0
                ? ''
                : total === 1
                  ? t('public.searchResultsCountOne')
                  : t('public.searchResultsCount', { count: total })}
          </p>
          {hasOverrides && (
            <button
              onClick={() => setParams(q ? { q } : {}, { replace: true })}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-violet hover:underline"
            >
              <SlidersHorizontal size={13} />
              {t('public.searchClearFilters')}
            </button>
          )}
        </div>

        <div className="mt-6">
          {status === 'error' ? (
            <EmptyState
              variant="error"
              title={t('public.searchErrorTitle')}
              action={{ label: t('public.searchTryAgain'), onClick: () => load(1, false) }}
            />
          ) : status === 'loading' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
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
            <div className="space-y-5">
              <EmptyState
                variant="no-results"
                title={t('public.searchNoResultsTitle')}
                description={broader.length > 0 ? t('public.searchNoResultsBody') : undefined}
                action={hasOverrides ? { label: t('public.searchClearFilters'), onClick: () => setParams(q ? { q } : {}) } : undefined}
              />
              {broaderChips && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-[13px] font-semibold text-ink">{t('public.searchTryBroader')}</p>
                  {broaderChips}
                </div>
              )}
            </div>
          ) : (
            <>
              {wanted !== null && total < wanted && (
                <div className="mb-6 space-y-3 rounded-2xl border border-line bg-surface-dim/60 p-4">
                  <p className="text-[13px] leading-relaxed text-ink-soft">
                    {t('public.searchFewerThanAsked', { wanted, count: total })}
                  </p>
                  {broaderChips}
                </div>
              )}
              <motion.div
                initial="hidden"
                animate="show"
                variants={stagger(0.05)}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {items.map((c) => (
                  <motion.div key={c.id} variants={fadeUp} className="h-full">
                    <CreatorCard
                      creator={c}
                      categoryMeta={categoryMeta}
                      followersPlatform={effectivePlatform || undefined}
                    />
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
      </div>
    </>
  );
}
