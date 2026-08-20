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

    // Fraunces/Inter load with display=swap (index.html) — a late font swap
    // after any section's ScrollTrigger has already measured itself (e.g.
    // Showcase's pinned horizontal scroll) can shift layout height and desync
    // its cached start/end. One shared refresh here covers every section.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    // Fonts aren't the only thing that loads late: the Collaboration section's
    // Google Map, video posters, and other async content can also finish
    // loading well after this and change the document's total height without
    // firing any font/resize event. A stale ScrollTrigger cache after that
    // makes a pinned section (e.g. Showcase's horizontal scroll) report the
    // wrong absolute position — clicking a nav link into it from below can
    // land mid-pin instead of at its true start. Keep the cache honest by
    // refreshing whenever the page's actual height changes, for as long as
    // the page lives, not just once at startup.
    let resizeRaf = 0;
    const heightObserver = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    heightObserver.observe(document.documentElement);

    setReady(true);

    return () => {
      heightObserver.disconnect();
      cancelAnimationFrame(resizeRaf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reducedMotion]);

  function scrollTo(target: string | HTMLElement, opts?: { offset?: number }) {
    let el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;

    // A GSAP ScrollTrigger pin (e.g. Showcase's horizontal scroll) wraps its
    // element in a `.pin-spacer` sized to the pin's full scroll range. Once
    // scrolled past a pinned section, GSAP leaves a compensating transform on
    // the pinned element itself so it visually "catches up" to where normal
    // document flow would have put it — which makes that element's own
    // getBoundingClientRect() report a position shifted by the entire pin
    // distance when measured from below it (e.g. clicking a nav link from
    // the footer would land mid-pin instead of at its true start). The
    // spacer wrapper carries no such transform and is reliable from any
    // scroll position, so target that instead when one wraps the element.
    if (el?.parentElement?.classList.contains('pin-spacer')) {
      el = el.parentElement;
    }

    const lenis = lenisRef.current;
    if (lenis && el) {
      lenis.scrollTo(el, { offset: opts?.offset ?? 0 });
      return;
    }
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

/** Same context, but `null` outside a LenisProvider instead of throwing —
 *  for components like LandingFooter that render both on the single-page
 *  home route (inside the provider, in-page anchors make sense) and on
 *  standalone/content routes (no provider, no in-page anchors to scroll to). */
export function useLenisScrollOptional(): LenisContextValue | null {
  return useContext(LenisContext);
}
