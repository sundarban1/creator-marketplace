import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchLandingShowcase, type EventCard } from '../../../app/api/publicMarketplace';
import type { PublicCreatorLite, PublicBusinessLite } from '../../../lib/api';
import { fetchCategories, type Category } from '../../../app/api/catalog';
import { makeCategoryLookup } from '../../../app/public/categoryLookup';

/**
 * Fetches the landing page's three preview rows — events, creators,
 * businesses — in a single call to /api/public/showcase, and shares it with
 * EventsShowcase + the two MarketplaceShowcase instances. Each stays `null`
 * until it resolves; on failure they stay `null` and the creator/business
 * rows render their static i18n fallback (mirrors useLandingStats /
 * useSuccessStories). Opportunities never fall back to fake events — callers
 * read `status` to tell loading / error / empty apart, and `retry` refetches.
 *
 * Also loads the category catalog so the preview cards can show each category
 * as a colored icon pill (matching the /creators + /businesses browse cards).
 */
export function useLandingShowcase() {
  const [events, setEvents] = useState<EventCard[] | null>(null);
  const [creators, setCreators] = useState<PublicCreatorLite[] | null>(null);
  const [businesses, setBusinesses] = useState<PublicBusinessLite[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchLandingShowcase()
      .then((res) => {
        if (cancelled) return;
        setEvents(res.events);
        setCreators(res.creators);
        setBusinesses(res.businesses);
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [attempt]);

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((cats) => { if (!cancelled) setCategories(cats); })
      .catch(() => { /* pills fall back to a plain tag icon */ });
    return () => { cancelled = true; };
  }, []);

  const categoryMeta = useMemo(() => makeCategoryLookup(categories), [categories]);

  return { events, creators, businesses, categoryMeta, status, retry };
}
