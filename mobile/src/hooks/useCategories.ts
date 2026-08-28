import { useEffect, useState } from 'react';
import { categoryService, type ApiCategory } from '@/services/category';

type CategoryScope = 'CREATOR' | 'BUSINESS' | 'BOTH';

type CacheKey = 'CREATOR' | 'BUSINESS' | 'BOTH' | 'CREATOR:strict' | 'ALL';

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

// Category.name isn't unique in the DB — only `key` is. The CREATOR-scope
// 'Other' provider role and the BOTH-scope 'Other' industry both exist, so any
// non-strict scoped fetch (which widens to "scope OR BOTH") returns two rows
// labelled 'Other'. Everything downstream — filters, profile tags, campaign
// categories — matches on the name string, so same-named rows are
// indistinguishable to both the user and the filtering, and they collide as
// React keys in the chip rows. Keep one row per name, preferring the one whose
// scope exactly matches what the caller asked for (so the CREATOR picker keeps
// the grouped provider role rather than the ungrouped industry row).
function dedupeByName(cats: ApiCategory[], scope?: CategoryScope): ApiCategory[] {
  const byName = new Map<string, ApiCategory>();
  for (const c of cats) {
    const kept = byName.get(c.name);
    if (!kept || (scope !== undefined && c.scope === scope && kept.scope !== scope)) byName.set(c.name, c);
  }
  return [...byName.values()];
}

/** True for the catch-all "Other" category — the two seeded rows
 *  (`other-industry`, `other-provider`) by key, plus any row/label named
 *  "Other" (admin-created ones, or a plain stored category string with no key). */
export function isOtherCategory(c: { key?: string; name?: string } | string): boolean {
  const name = typeof c === 'string' ? c : c.name;
  const key  = typeof c === 'string' ? undefined : c.key;
  return key === 'other-industry' || key === 'other-provider' || name === 'Other';
}

/** Pins the catch-all "Other" row to the end of a picker/list instead of
 *  wherever the API's name-ascending sort drops it — sort is stable, so every
 *  other row keeps its position. Accepts either category objects (`key` optional
 *  so a caller can mix live rows with stale saved-name-only chips) or plain
 *  category-name strings (read-only tag lists). */
export function sortOtherLast<T extends { key?: string; name: string } | string>(cats: T[]): T[] {
  return [...cats].sort((a, b) => Number(isOtherCategory(a)) - Number(isOtherCategory(b)));
}

/** Pulls the business's own onboarding-selected industry/industries to the
 *  front of a picker — sort is stable, so every other row keeps its
 *  alphabetical position. Run before `sortOtherLast` so a selected "Other"
 *  still ends up pinned last, matching every other picker's convention. */
export function sortSelectedFirst<T extends { key?: string; name: string }>(cats: T[], selectedNames: string[]): T[] {
  if (selectedNames.length === 0) return cats;
  const isSelected = (c: T) => selectedNames.includes(c.name);
  return [...cats].sort((a, b) => Number(isSelected(b)) - Number(isSelected(a)));
}

function fetchScoped(key: CacheKey, scope?: CategoryScope, strict?: boolean): Promise<ApiCategory[]> {
  if (isFresh(key)) return Promise.resolve(cache[key]!);
  if (!inflight[key]) {
    inflight[key] = categoryService.getCategories(scope, strict)
      .then((raw) => {
        const cats = dedupeByName(raw, scope);
        cache[key] = cats; cachedAt[key] = Date.now(); return cats;
      })
      .finally(() => { delete inflight[key]; });
  }
  return inflight[key]!;
}

/** Admin-created categories scoped to CREATOR or BUSINESS — for picker/selection
 *  screens (onboarding, create-campaign, edit-categories, filters). Pass
 *  `strict` for CREATOR to opt out of the default "+ BOTH" widening — BOTH-scope
 *  rows are content niches (e.g. "Hotels", "Restaurants") with no group/parent,
 *  which are wrong to mix into a provider-*type* picker. Pass 'BOTH' for the
 *  industry list on its own, with no side-specific rows mixed in. */
export function useCategories(scope: CategoryScope, strict?: boolean) {
  const key: CacheKey = strict ? 'CREATOR:strict' : scope;
  const [categories, setCategories] = useState<ApiCategory[]>(cache[key] ?? []);
  const [loading, setLoading] = useState(!cache[key]);

  useEffect(() => {
    let cancelled = false;
    if (isFresh(key)) { setCategories(cache[key]!); setLoading(false); return; }
    // Stale (or missing) cache — show whatever we have (if anything) without a
    // loading flash, and quietly refetch underneath it.
    if (cache[key]) setCategories(cache[key]!);
    setLoading(!cache[key]);
    fetchScoped(key, scope, strict)
      .then((cats) => { if (!cancelled) setCategories(cats); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [key, scope, strict]);

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
