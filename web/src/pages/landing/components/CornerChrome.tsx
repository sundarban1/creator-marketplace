import { useEffect, useState } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { SECTION_IDS } from '../constants';

const SECTION_ORDER = Object.values(SECTION_IDS);

/** Small persistent readouts pinned to the bottom corners of the viewport for
 *  the whole scroll — "/current-section" on the left, live scroll % on the
 *  right. `mix-blend-mode: difference` (white-on-difference) is what lets a
 *  single fixed color work over both the paper/white sections and the ink
 *  ones without per-section theming: white differenced against a light
 *  background reads dark, differenced against black reads white.
 *
 *  Desktop-only (sm+) — on a phone this just competes with the thumb and the
 *  browser's own chrome for the same screen edge. */
export function CornerChrome() {
  const [active, setActive] = useState<string>(SECTION_ORDER[0]!);
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });
  const percent = useTransform(smoothProgress, (v) => `${Math.round(v * 100)}%`);

  useEffect(() => {
    const targets = SECTION_ORDER
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick whichever observed section currently has the most of itself
        // inside the viewport, not just the first one that crosses the
        // threshold — otherwise a short section stacked next to a tall one
        // flickers between the two as their edges pass by together.
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const top = visible.reduce((a, b) => (b.intersectionRatio > a.intersectionRatio ? b : a));
        setActive(top.target.id);
      },
      { threshold: [0.2, 0.4, 0.6, 0.8], rootMargin: '-15% 0px -15% 0px' },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        aria-hidden
        style={{ mixBlendMode: 'difference' }}
        className="pointer-events-none fixed bottom-5 left-6 z-40 hidden sm:block"
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-white">
          /{active}
        </span>
      </div>
      {/* Offset well above ChatWidget's own fixed bottom-5/right-5 bubble
          (~64px tall) so the two never overlap. */}
      <div
        aria-hidden
        style={{ mixBlendMode: 'difference' }}
        className="pointer-events-none fixed bottom-24 right-6 z-40 hidden sm:block"
      >
        <motion.span className="font-mono text-[11px] uppercase tracking-[0.25em] text-white">
          {percent}
        </motion.span>
      </div>
    </>
  );
}
