import { useEffect, useState } from 'react';

/** Tracks the OS-level "reduce motion" preference. Every scroll-driven or
 *  cursor-driven animation hook in this page should gate its setup on this
 *  so users who've asked for less motion actually get less motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
