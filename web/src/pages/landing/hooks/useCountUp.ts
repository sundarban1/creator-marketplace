import { useEffect, useRef, useState } from 'react';
import { gsap } from '../lib/gsap';
import { useReducedMotion } from './useReducedMotion';

/** Animates a number counting up from 0 to `target` once the returned ref
 *  scrolls into view. Used by the Trust Stats and Analytics sections. */
export function useCountUp(target: number, opts?: { duration?: number; decimals?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(0);
  const reducedMotion = useReducedMotion();
  const played = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reducedMotion) {
      setValue(target);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || played.current) return;
        played.current = true;
        const counter = { n: 0 };
        gsap.to(counter, {
          n: target,
          duration: opts?.duration ?? 1.8,
          ease: 'power2.out',
          onUpdate: () => setValue(counter.n),
        });
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, reducedMotion, opts?.duration]);

  const decimals = opts?.decimals ?? 0;
  const display = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString();

  return { ref, display };
}
