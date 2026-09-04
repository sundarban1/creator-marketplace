import { useQuery } from '@tanstack/react-query';
import { STALE } from '@/lib/queryClient';
import { platformService, type ApiPlatform } from '@/services/platform';

// Stable empty reference so consumers that list `platforms` in a useEffect
// dependency array don't see a new [] every render while the query is pending.
const EMPTY: ApiPlatform[] = [];

/** Admin-managed, active platform catalog (Instagram, TikTok, YouTube, etc.) — the
 *  single source of truth for every platform picker/selection screen across the app
 *  (campaign creation, creator preferred platforms, filters), replacing hardcoded lists. */
export function usePlatforms() {
  const q = useQuery({
    queryKey: ['platforms'],
    queryFn: () => platformService.getPlatforms(),
    staleTime: STALE.static,
  });
  // `loading` stays false whenever cached data (fresh or stale) is already on
  // screen — a background refetch must never flash the picker back to a spinner.
  return { platforms: q.data ?? EMPTY, loading: q.isPending };
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
