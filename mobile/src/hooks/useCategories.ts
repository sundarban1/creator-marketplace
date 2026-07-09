import { useEffect, useState } from 'react';
import { categoryService, type ApiCategory } from '@/services/category';

type CacheKey = 'CREATOR' | 'BUSINESS' | 'ALL';

const cache: Partial<Record<CacheKey, ApiCategory[]>> = {};
const inflight: Partial<Record<CacheKey, Promise<ApiCategory[]>>> = {};

function fetchScoped(key: CacheKey, scope?: 'CREATOR' | 'BUSINESS'): Promise<ApiCategory[]> {
  if (cache[key]) return Promise.resolve(cache[key]!);
  if (!inflight[key]) {
    inflight[key] = categoryService.getCategories(scope)
      .then((cats) => { cache[key] = cats; return cats; })
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
    if (cache[scope]) { setCategories(cache[scope]!); setLoading(false); return; }
    setLoading(true);
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
    if (cache.ALL) { setCategories(cache.ALL); setLoading(false); return; }
    setLoading(true);
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
