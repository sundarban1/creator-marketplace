import { useEffect, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

export type HeadlinePair = { a: string; b: string };

const TYPE_MS = 90;
const HOLD_MS = 1700;
const DELETE_MS = 32;
const PAIR_GAP_MS = 250;

/** Types and deletes two words together, one character at a time, cycling
 *  through `pairs`. Both words share one "revealed character count" so they
 *  visibly type and vanish in sync — a shorter word just finishes first and
 *  waits for the longer one to catch up before the hold. Reduces to a static
 *  (untyped) first pair for prefers-reduced-motion. */
export function useHeadlineTypewriter(pairs: HeadlinePair[]) {
  const reducedMotion = useReducedMotion();
  const [pairIndex, setPairIndex] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'holding' | 'deleting'>('typing');
  const [count, setCount] = useState(0);

  const pair = pairs[pairIndex] ?? { a: '', b: '' };
  const maxLen = Math.max(pair.a.length, pair.b.length);

  useEffect(() => {
    if (reducedMotion) return;

    if (phase === 'typing') {
      if (count < maxLen) {
        const t = setTimeout(() => setCount((c) => c + 1), TYPE_MS);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase('holding'), 200);
      return () => clearTimeout(t);
    }

    if (phase === 'holding') {
      const t = setTimeout(() => setPhase('deleting'), HOLD_MS);
      return () => clearTimeout(t);
    }

    // deleting
    if (count > 0) {
      const t = setTimeout(() => setCount((c) => c - 1), DELETE_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setPairIndex((i) => (i + 1) % pairs.length);
      setPhase('typing');
    }, PAIR_GAP_MS);
    return () => clearTimeout(t);
  }, [reducedMotion, phase, count, maxLen, pairs.length]);

  if (reducedMotion) return { a: pair.a, b: pair.b };
  return {
    a: pair.a.slice(0, Math.min(count, pair.a.length)),
    b: pair.b.slice(0, Math.min(count, pair.b.length)),
  };
}
