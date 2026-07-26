import { useEffect, useRef, useState } from 'react';
import { gsap } from '../lib/gsap';
import { useReducedMotion } from './useReducedMotion';

/** Animates a number counting up from 0 to `target` once the returned ref
 *  scrolls into view. Used by the Trust Stats and Analytics sections. */
export function useCountUp(target: number, opts?: { duration?: number; decimals?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(0);
  const reducedMotion = useReducedMotion();
  const inView = useRef(false);
  const valueRef = useRef(0);
  valueRef.current = value;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reducedMotion) {
      setValue(target);
      return;
    }

    function animateTo(from: number) {
      const counter = { n: from };
      gsap.to(counter, {
        n: target,
        duration: opts?.duration ?? 1.8,
        ease: 'power2.out',
        onUpdate: () => setValue(counter.n),
      });
    }

    // Already on screen from a previous run of this effect — e.g. `target`
    // just changed because the live stats fetch resolved after the fallback
    // value had already animated in. Re-animate to the new target instead of
    // silently staying stuck on the stale one.
    if (inView.current) {
      animateTo(valueRef.current);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        inView.current = true;
        observer.disconnect();
        animateTo(0);
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
