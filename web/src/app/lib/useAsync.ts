import { useCallback, useEffect, useState } from 'react';

/**
 * Minimal data-fetch hook — the project has no data-fetching library. Re-runs
 * whenever `deps` change (pass the values the fetch depends on), discards stale
 * responses via AbortController, and exposes `reload()`.
 *
 * `fn` is expected to be defined inline; only `deps` drive re-fetching.
 */
export function useAsync<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
): { data: T | null; loading: boolean; error: Error | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    // Deliberate: a deps change starts a new fetch, so the loading flag must
    // flip now. The stale-response guard above keeps this correct.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    fn(controller.signal)
      .then((result) => {
        if (active) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, loading, error, reload };
}
