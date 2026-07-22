import { useEffect, useState } from 'react';
import { categoryService, type ApiCategory } from '@/services/category';

type CacheKey = 'CREATOR' | 'BUSINESS' | 'ALL';

// How long a fetched list is trusted before the next mount silently refetches
// in the background — without this, a long-running app session would never
// notice an admin disabling/re-enabling a category until force-quit/reopened.
const CACHE_TTL_MS = 5 * 60 * 1000;

const cache: Partial<Record<CacheKey, ApiCategory[]>> = {};
const cachedAt: Partial<Record<CacheKey, number>> = {};
const inflight: Partial<Record<CacheKey, Promise<ApiCategory[]>>> = {};

function isFresh(key: CacheKey) {
  return cache[key] !== undefined && Date.now() - (cachedAt[key] ?? 0) < CACHE_TTL_MS;
}

function fetchScoped(key: CacheKey, scope?: 'CREATOR' | 'BUSINESS'): Promise<ApiCategory[]> {
  if (isFresh(key)) return Promise.resolve(cache[key]!);
  if (!inflight[key]) {
    inflight[key] = categoryService.getCategories(scope)
      .then((cats) => { cache[key] = cats; cachedAt[key] = Date.now(); return cats; })
      .finally(() => { delete inflight[key]; });
  }
  return inflight[key]!;
}

/** Admin-created categories scoped to CREATOR or BUSINESS — for picker/selection
 *  screens (onboarding, create-campaign, edit-categories, filters). */
export function useCategories(scope: 'CREATOR' | 'BUSINESS') {
  const [categories, setCategories] = useState<ApiCategory[]>(cache[scope] ?? []);
  const [loading, setLoading] = useState(!cache[scope]);

  useEffect(() => {
    let cancelled = false;
    if (isFresh(scope)) { setCategories(cache[scope]!); setLoading(false); return; }
    // Stale (or missing) cache — show whatever we have (if anything) without a
    // loading flash, and quietly refetch underneath it.
    if (cache[scope]) setCategories(cache[scope]!);
    setLoading(!cache[scope]);
    fetchScoped(scope, scope)
      .then((cats) => { if (!cancelled) setCategories(cats); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [scope]);

  return { categories, loading };
}

/** Every active category regardless of scope — for display/lookup screens that
 *  resolve an existing campaign/creator's category string to {icon, bg, color}. */
export function useAllCategories() {
  const [categories, setCategories] = useState<ApiCategory[]>(cache.ALL ?? []);
  const [loading, setLoading] = useState(!cache.ALL);

  useEffect(() => {
    let cancelled = false;
    if (isFresh('ALL')) { setCategories(cache.ALL!); setLoading(false); return; }
    if (cache.ALL) setCategories(cache.ALL);
    setLoading(!cache.ALL);
    fetchScoped('ALL')
      .then((cats) => { if (!cancelled) setCategories(cats); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { categories, loading };
}

export type CategoryMeta = { icon: string; bg: string; color: string };

const DEFAULT_META: CategoryMeta = { icon: 'tag', bg: '#F5F3FF', color: '#6B7280' };

/** Resolve a category label (as stored on a campaign/creator/business) to its
 *  live admin-defined {icon, bg, color}, falling back to a generic tag icon
 *  for labels that no longer match any active category. */
export function getCategoryMeta(categories: ApiCategory[], label: string): CategoryMeta {
  const match = categories.find((c) => c.name === label || c.key === label);
  if (!match) return DEFAULT_META;
  return { icon: match.icon, bg: match.iconBg, color: match.color };
}
