import { useQuery } from '@tanstack/react-query';
import { STALE } from '@/lib/queryClient';
import { categoryService, type ApiCategory } from '@/services/category';

type CategoryScope = 'CREATOR' | 'BUSINESS' | 'BOTH';

type CacheKey = 'CREATOR' | 'BUSINESS' | 'BOTH' | 'CREATOR:strict' | 'ALL';

// Stable empty reference so consumers that list `categories` in a useEffect
// dependency array don't see a new [] every render while the query is pending.
const EMPTY: ApiCategory[] = [];

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

// Maps a cache key back to the (scope, strict) pair its fetch needs. Kept as
// one place so useCategories and useAllCategories can't drift apart.
function resolveScope(key: CacheKey): { scope: CategoryScope | undefined; strict: boolean } {
  if (key === 'ALL') return { scope: undefined, strict: false };
  if (key === 'CREATOR:strict') return { scope: 'CREATOR', strict: true };
  return { scope: key, strict: false };
}

function categoriesQuery(key: CacheKey) {
  const { scope, strict } = resolveScope(key);
  return {
    queryKey: ['categories', key] as const,
    queryFn: () => categoryService.getCategories(scope, strict).then((raw) => dedupeByName(raw, scope)),
    staleTime: STALE.static,
  };
}

/** Admin-created categories scoped to CREATOR or BUSINESS — for picker/selection
 *  screens (onboarding, create-campaign, edit-categories, filters). Pass
 *  `strict` for CREATOR to opt out of the default "+ BOTH" widening — BOTH-scope
 *  rows are content niches (e.g. "Hotels", "Restaurants") with no group/parent,
 *  which are wrong to mix into a provider-*type* picker. Pass 'BOTH' for the
 *  industry list on its own, with no side-specific rows mixed in. */
export function useCategories(scope: CategoryScope, strict?: boolean) {
  const key: CacheKey = strict ? 'CREATOR:strict' : scope;
  const q = useQuery(categoriesQuery(key));
  // `loading` stays false whenever cached data (fresh or stale) is already on
  // screen — a background refetch must never flash the picker back to a spinner.
  return { categories: q.data ?? EMPTY, loading: q.isPending };
}

/** Every active category regardless of scope — for display/lookup screens that
 *  resolve an existing campaign/creator's category string to {icon, bg, color}. */
export function useAllCategories() {
  const q = useQuery(categoriesQuery('ALL'));
  return { categories: q.data ?? EMPTY, loading: q.isPending };
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
