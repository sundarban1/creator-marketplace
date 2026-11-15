import { useEffect, useRef } from 'react';

// Light background refresh for the moderation queue — new reports show up
// without a reload. Paused while the browser tab is hidden so idle admin tabs
// cost nothing.
export function usePoll(refetch: () => void, intervalMs = 60_000) {
  const cb = useRef(refetch);
  useEffect(() => { cb.current = refetch; });
  useEffect(() => {
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') cb.current(); }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
}
