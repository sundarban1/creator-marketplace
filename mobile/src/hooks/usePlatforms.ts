import { useEffect, useState } from 'react';
import { platformService, type ApiPlatform } from '@/services/platform';

// How long a fetched list is trusted before the next mount silently refetches
// in the background — without this, a long-running app session would never
// notice an admin disabling/re-enabling a platform until force-quit/reopened.
const CACHE_TTL_MS = 5 * 60 * 1000;

let cache: ApiPlatform[] | null = null;
let cachedAt = 0;
let inflight: Promise<ApiPlatform[]> | null = null;

function isFresh() {
  return cache !== null && Date.now() - cachedAt < CACHE_TTL_MS;
}

function fetchPlatforms(): Promise<ApiPlatform[]> {
  if (isFresh()) return Promise.resolve(cache!);
  if (!inflight) {
    inflight = platformService.getPlatforms()
      .then((platforms) => { cache = platforms; cachedAt = Date.now(); return platforms; })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/** Admin-managed, active platform catalog (Instagram, TikTok, YouTube, etc.) — the
 *  single source of truth for every platform picker/selection screen across the app
 *  (campaign creation, creator preferred platforms, filters), replacing hardcoded lists. */
export function usePlatforms() {
  const [platforms, setPlatforms] = useState<ApiPlatform[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let cancelled = false;
    if (isFresh()) { setPlatforms(cache!); setLoading(false); return; }
    // Stale (or missing) cache — show whatever we have (if anything) without a
    // loading flash, and quietly refetch underneath it.
    if (cache) setPlatforms(cache);
    setLoading(!cache);
    fetchPlatforms()
      .then((p) => { if (!cancelled) setPlatforms(p); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { platforms, loading };
}

export type PlatformMeta = { icon: string; bg: string; color: string };

const DEFAULT_META: PlatformMeta = { icon: 'globe', bg: '#F5F3FF', color: '#6B7280' };

/** Resolve a platform label (as stored on a campaign/creator/social account) to its
 *  live admin-defined {icon, bg, color}, falling back to a generic globe icon for
 *  labels that no longer match any active platform. */
export function getPlatformMeta(platforms: ApiPlatform[], label: string): PlatformMeta {
  const match = platforms.find((p) => p.name === label || p.key === label);
  if (!match) return DEFAULT_META;
  return { icon: match.icon, bg: match.iconBg, color: match.color };
}
