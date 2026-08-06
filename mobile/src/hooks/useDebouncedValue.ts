import { useEffect, useRef, useState } from 'react';

/**
 * Returns a debounced copy of `value` that only updates `delayMs` after the
 * last change — the "settle" half of a search-input debounce (pair with the
 * live `value` for the controlled TextInput, and the returned debounced copy
 * for the actual fetch-triggering effect/dependency array).
 *
 * The second tuple element lets a caller bypass the delay — e.g. a "Clear
 * filters" button that should reset the debounced value immediately instead
 * of leaving stale filtered results on screen for `delayMs` — most callers
 * can ignore it.
 */
export function useDebouncedValue<T>(value: T, delayMs = 400): [T, (v: T) => void] {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(value), delayMs);
    return () => { if (timer.current) clearTimeout(timer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delayMs]);

  function setImmediately(v: T) {
    if (timer.current) clearTimeout(timer.current);
    setDebounced(v);
  }

  return [debounced, setImmediately];
}
