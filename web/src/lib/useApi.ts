import { useState, useEffect, useCallback } from 'react';
import type { ApiResponse } from './api';

interface UseApiResult<T> {
  data:    ApiResponse<T> | null;
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

export function useApi<T>(fetcher: () => Promise<ApiResponse<T>>): UseApiResult<T> {
  const [data,    setData]    = useState<ApiResponse<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tick,    setTick]    = useState(0);

  const refetch = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher()
      .then((d)  => { if (!cancelled) setData(d);  })
      .catch((e: unknown) => {
        if (!cancelled) setError((e as Error).message ?? 'Unknown error');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  return { data, loading, error, refetch };
}
