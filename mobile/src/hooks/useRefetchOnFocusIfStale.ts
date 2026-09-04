import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import type { UseQueryResult } from '@tanstack/react-query';

type Refetchable = Pick<UseQueryResult, 'isStale' | 'isFetching' | 'isFetched' | 'refetch'>;

/**
 * Re-fetches the given queries when the screen regains focus — but only the
 * ones whose data has actually gone stale. This is the deliberate middle
 * ground the perf requirement asks for (§31): returning to a tab picks up
 * important changes, without paying the "refetch everything on every focus"
 * tax that the old useFocusEffect(load) pattern did.
 *
 * `isStale` / `isFetching` are read fresh at focus time (via a ref kept
 * current in an effect), so the focus callback has an empty dependency array
 * and never re-subscribes on render — passing query-result objects directly
 * as deps would loop.
 */
export function useRefetchOnFocusIfStale(...queries: Refetchable[]): void {
  const ref = useRef(queries);
  useEffect(() => {
    ref.current = queries;
  });

  useFocusEffect(
    useCallback(() => {
      for (const q of ref.current) {
        // `isFetched` gates out queries that have never run (disabled, or
        // still waiting on their `enabled` condition) — those are the
        // enable-flip / refetchOnMount path's job, not this one.
        if (q.isFetched && q.isStale && !q.isFetching) void q.refetch();
      }
    }, []),
  );
}
