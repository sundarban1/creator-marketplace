import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger, ensureGsapRegistered } from '../lib/gsap';
import { useReducedMotion } from './useReducedMotion';

interface LenisContextValue {
  scrollTo: (target: string | HTMLElement, opts?: { offset?: number }) => void;
}

const LenisContext = createContext<LenisContextValue | null>(null);

/** Mounts one Lenis instance for the whole landing page and bridges it to
 *  GSAP's ticker so ScrollTrigger stays in sync with Lenis's smoothed scroll
 *  position instead of listening to the native scroll event independently
 *  (the two fighting over "what is the scroll position" is what causes
 *  pinned-section jitter). Only one rAF loop drives everything: gsap.ticker. */
export function LenisProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const lenisRef = useRef<Lenis | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureGsapRegistered();

    if (reducedMotion) {
      // Native scrolling only — no smoothing, no scroll-jacking.
      lenisRef.current = null;
      setReady(true);
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      touchMultiplier: 1.4,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    setReady(true);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reducedMotion]);

  function scrollTo(target: string | HTMLElement, opts?: { offset?: number }) {
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(target, { offset: opts?.offset ?? 0 });
      return;
    }
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    el?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  if (!ready) return null;

  return <LenisContext.Provider value={{ scrollTo }}>{children}</LenisContext.Provider>;
}

export function useLenisScroll(): LenisContextValue {
  const ctx = useContext(LenisContext);
  if (!ctx) throw new Error('useLenisScroll must be used within LenisProvider');
  return ctx;
}
