import { useEffect, useRef, type ReactNode } from 'react';
import { ensureGsapRegistered, gsap } from '../lib/gsap';

// CSS `position: sticky` doesn't work here — LandingPageInner's root wrapper
// sets `overflow-x-hidden`, and any ancestor with a non-visible overflow
// breaks sticky positioning for its descendants. Showcase.tsx hit the same
// wall for its pinned horizontal scroll and solved it with GSAP
// ScrollTrigger's `pin` (which repositions the element directly rather than
// relying on the CSS sticky algorithm) — this mirrors that approach: pin the
// stage for one viewport per card and crossfade/scale between them on a
// scrubbed timeline. Below `lg` and under reduced motion, no GSAP runs at
// all — the cards render as an ordinary vertical stack.
export function StickyScrollCards({
  cards,
  rail,
  className = '',
  cardWidthClassName = 'max-w-2xl',
  viewportsPerCard = 1.6,
  onActiveChange,
}: {
  cards: ReactNode[];
  /** Rendered as an absolutely-positioned sibling of the card stack, inside
   *  the same pinned root — anything else (e.g. a progress rail) needs to
   *  live in here to stay visually fixed during the pin instead of
   *  scrolling past it. */
  rail?: ReactNode;
  className?: string;
  /** Controls how wide each card gets — set on the stage wrapper (not the
   *  card itself), since the pinned variant forces each card to `width:
   *  100%` of its stage via GSAP, overriding any max-width the card sets
   *  on itself. */
  cardWidthClassName?: string;
  /** How much scroll (in viewport heights) each card gets before the next
   *  one takes over — the actual "scroll speed" knob. Higher = more wheel
   *  travel per card = feels slower/more deliberate. */
  viewportsPerCard?: number;
  onActiveChange?: (index: number) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureGsapRegistered();
    const mm = gsap.matchMedia();

    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const root = rootRef.current;
      const stage = stageRef.current;
      if (!root || !stage) return;

      const cardEls = gsap.utils.toArray<HTMLElement>('.story-stage-card', stage);
      if (cardEls.length < 2) return;

      gsap.set(stage, { height: '100vh' });
      gsap.set(cardEls, {
        position: 'absolute',
        top: '50%',
        left: '50%',
        xPercent: -50,
        yPercent: -50,
        width: '100%',
        autoAlpha: 0,
        y: 36,
        scale: 0.94,
      });
      gsap.set(cardEls[0], { autoAlpha: 1, y: 0, scale: 1 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          pin: true,
          scrub: 1.2,
          start: 'top top',
          end: () => '+=' + window.innerHeight * viewportsPerCard * (cardEls.length - 1),
          invalidateOnRefresh: true,
          onUpdate: (self) => onActiveChange?.(Math.round(self.progress * (cardEls.length - 1))),
        },
      });

      // Sequential, not simultaneous: the outgoing card fully clears (first
      // half of the segment) before the incoming one starts fading in
      // (second half). Both easing over the same half of the segment would
      // leave two cards' worth of text overlapping mid-scroll, which reads
      // as noise rather than a page turn.
      cardEls.forEach((el, i) => {
        if (i === 0) return;
        const pos = i - 1;
        tl.to(cardEls[i - 1], { autoAlpha: 0, y: -28, scale: 0.9, ease: 'none', duration: 0.5 }, pos);
        tl.to(el, { autoAlpha: 1, y: 0, scale: 1, ease: 'none', duration: 0.5 }, pos + 0.5);
      });

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
        gsap.set(stage, { clearProps: 'all' });
        gsap.set(cardEls, { clearProps: 'all' });
        onActiveChange?.(0);
      };
    });

    return () => mm.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length, viewportsPerCard]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {rail}
      <div ref={stageRef} className={`relative mx-auto flex flex-col gap-6 px-6 py-16 ${cardWidthClassName}`}>
        {cards.map((card, i) => (
          <div key={i} className="story-stage-card">
            {card}
          </div>
        ))}
      </div>
    </div>
  );
}
