import { useEffect, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';

/** Slowly, continuously auto-scrolls a horizontal container — pauses while
 *  the user is hovering/touching/dragging so manual browsing still works,
 *  and loops seamlessly assuming the caller renders its item list twice
 *  back-to-back (so resetting scrollLeft at the halfway point is invisible).
 *  No-ops entirely under prefers-reduced-motion. */
export function useAutoScroll<T extends HTMLElement>(speed = 0.4) {
  const ref = useRef<T>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion) return;

    let frame: number;
    let paused = false;
    // Tracked separately from el.scrollLeft, which browsers round to whole
    // pixels on read — accumulating fractional speed values directly against
    // that rounded value gets truncated back to the same integer every
    // frame, so the scroll position never advances.
    let pos = el.scrollLeft;

    function step() {
      if (!paused && el) {
        pos += speed;
        const half = el.scrollWidth / 2;
        if (pos >= half) pos -= half;
        el.scrollLeft = pos;
      }
      frame = requestAnimationFrame(step);
    }
    frame = requestAnimationFrame(step);

    const pause = () => { paused = true; };
    const resume = () => { if (el) pos = el.scrollLeft; paused = false; };

    el.addEventListener('pointerenter', pause);
    el.addEventListener('pointerleave', resume);
    el.addEventListener('pointerdown', pause);
    el.addEventListener('pointerup', resume);
    el.addEventListener('touchstart', pause, { passive: true });
    el.addEventListener('touchend', resume);

    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointerenter', pause);
      el.removeEventListener('pointerleave', resume);
      el.removeEventListener('pointerdown', pause);
      el.removeEventListener('pointerup', resume);
      el.removeEventListener('touchstart', pause);
      el.removeEventListener('touchend', resume);
    };
  }, [reducedMotion, speed]);

  return ref;
}
