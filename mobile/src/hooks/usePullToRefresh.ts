import { useCallback, useEffect, useRef, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';

type Refetchable = Pick<UseQueryResult, 'refetch'> & { isFetched?: boolean };

/**
 * Pull-to-refresh for screens backed by TanStack Query. Cached detail data can
 * be up to its staleTime old (and is restored from disk on cold start), so an
 * edit made elsewhere — the web app, another device — needs an explicit way to
 * show up without logging out (which is what clears the cache).
 *
 * Only refetches queries that have actually run, so disabled queries (e.g. a
 * creator-only query on a business session) stay disabled. Queries are read
 * through a ref so the returned onRefresh is stable.
 */
export function usePullToRefresh(...queries: Refetchable[]): { refreshing: boolean; onRefresh: () => Promise<void> } {
  const ref = useRef(queries);
  useEffect(() => {
    ref.current = queries;
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all(ref.current.filter((q) => q.isFetched !== false).map((q) => q.refetch()));
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { refreshing, onRefresh };
}
