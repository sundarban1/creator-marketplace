import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { AppState } from 'react-native';
import { ApiError, OfflineError } from './api';
import { network } from './network';

// ── Server-state cache (TanStack Query) ───────────────────────────────────────
// This layer sits ON TOP of lib/api.ts's request() — it never replaces the
// transport. request() still owns auth/refresh/timeout/offline-gating; Query
// owns caching, request de-duplication, background refetch and invalidation.
//
// Phase 1 wires the client up and migrates the two admin-catalog hooks
// (useCategories / usePlatforms) onto it. Later phases move the screen reads
// over one at a time.

// ── Freshness tiers ──────────────────────────────────────────────────────────
// How long a query's data is served without a background refetch. Pick the
// tier that matches how fast the underlying data actually changes — the whole
// point is that different data gets different policies (see requirement §31),
// not one global refetch-everything rule.
export const STALE = {
  /** Always refetch on mount/focus — authoritative data that must never be shown stale (wallet balance, escrow/transaction status). */
  realtime: 0,
  /** ~30s — changes often but a brief lag is harmless (notifications, unread counts). */
  frequent: 30_000,
  /** 1min — list feeds (campaigns, creators, businesses, conversations). */
  list: 60_000,
  /** 2min — entity detail / profile pages. */
  profile: 2 * 60_000,
  /** 5min — admin-managed catalogs that change rarely (categories, platforms). */
  static: 5 * 60_000,
} as const;

// Query-key roots whose data is safe and useful to restore from disk on the
// next cold start. Everything else stays in memory only. Message bodies are
// deliberately excluded — chat keeps its own cache (Phase 4) and we don't want
// large transcripts in the persisted blob.
const PERSISTED_QUERY_ROOTS = new Set<string>([
  'categories',
  'platforms',
  'campaigns',
  'campaign',
  'creator',
  'creators',
  'businesses',
  'business',
  'applications',
  'proposals',
  'portfolio',
  'notifications',
  'profile',
  'wallet',
  'conversations',
]);

// A 4xx won't fix itself on retry (except the two "come back later" codes); an
// OfflineError means there's no point trying again until connectivity returns
// (onlineManager handles that resume). Everything else gets the default two
// retries with backoff.
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof OfflineError) return false;
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return error.status === 408 || error.status === 429 ? failureCount < 2 : false;
  }
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE.list,
      // Keep unused data around for a day so returning to a screen (or a cold
      // start with a persisted cache) renders instantly from cache while the
      // background refetch runs.
      gcTime: 24 * 60 * 60 * 1000,
      retry: shouldRetry,
      refetchOnReconnect: true,
      // Gated by focusManager below — on RN "focus" means the app returning to
      // the foreground, not every screen mount.
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
});

// ── onlineManager ────────────────────────────────────────────────────────────
// Reuse lib/network.ts's single shared NetInfo listener instead of letting
// Query register its own. Seed the current value synchronously, then forward
// every transition.
onlineManager.setEventListener((setOnline) => {
  setOnline(network.isOnline());
  return network.subscribe((online) => setOnline(online));
});

// ── focusManager ────────────────────────────────────────────────────────────
// React Native has no window focus event; drive Query's focus signal from
// AppState so a backgrounded-then-resumed app triggers the same stale-query
// refetch a browser tab regaining focus would.
focusManager.setEventListener((handleFocus) => {
  const sub = AppState.addEventListener('change', (state) => {
    handleFocus(state === 'active');
  });
  return () => sub.remove();
});

// ── Persistence ─────────────────────────────────────────────────────────────
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'kolab-react-query-cache',
  // Coalesce rapid cache writes (a screen firing several queries at once)
  // into one AsyncStorage write.
  throttleTime: 2_000,
});

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: asyncStoragePersister,
  // Drop anything older than a day rather than hydrating a stale blob.
  maxAge: 24 * 60 * 60 * 1000,
  // Bump on every app version so a released cache-shape change can't hydrate
  // into a build that expects the new shape and crash.
  buster: Application.nativeApplicationVersion ?? 'dev',
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      if (query.state.status !== 'success') return false;
      const root = Array.isArray(query.queryKey) ? query.queryKey[0] : query.queryKey;
      return typeof root === 'string' && PERSISTED_QUERY_ROOTS.has(root);
    },
  },
};
