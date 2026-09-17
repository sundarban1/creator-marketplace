import { useEffect, useRef, type ReactNode } from 'react';
import { ensureGsapRegistered, gsap } from '../lib/gsap';

// A card-deck scroll effect: unlike StickyScrollCards' crossfade (the
// outgoing card fully fades before the incoming one appears), here every
// earlier card stays on screen and recedes — scaling down and sliding back —
// as the next one rises in front of it, so the whole stack of already-seen
// cards peeks out beneath the current one. Uses the same GSAP ScrollTrigger
// `pin` mechanism as StickyScrollCards (see that file's comment for why):
// `position: sticky` doesn't survive this page's `overflow-x-hidden`
// ancestor, so pinning has to reposition the element directly rather than
// relying on the CSS sticky algorithm. Below `lg` and under reduced motion,
// no GSAP runs — cards render as an ordinary vertical stack, each revealed
// by its own scroll-into-view animation instead of the pinned deck.
export function StackingCards({
  cards,
  rail,
  className = '',
  cardWidthClassName = 'max-w-xl',
  viewportsPerCard = 1.1,
  onActiveChange,
}: {
  cards: ReactNode[];
  /** Rendered as an absolutely-positioned sibling of the card stack, inside
   *  the same pinned root — a progress rail/counter needs to live in here to
   *  stay visually fixed during the pin instead of scrolling past it. */
  rail?: ReactNode;
  className?: string;
  cardWidthClassName?: string;
  /** How much scroll (in viewport heights) each card gets before the next
   *  one rises on top of it — the "scroll speed" knob. */
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

      const cardEls = gsap.utils.toArray<HTMLElement>('.stack-deck-card', stage);
      if (cardEls.length < 2) return;

      gsap.set(stage, { height: '100vh' });
      gsap.set(cardEls, {
        position: 'absolute',
        top: '50%',
        left: '50%',
        xPercent: -50,
        yPercent: -50,
        width: '100%',
      });
      cardEls.forEach((el, i) => gsap.set(el, { zIndex: i + 1 }));
      gsap.set(cardEls[0], { y: 0, scale: 1, autoAlpha: 1 });
      cardEls.slice(1).forEach((el) => gsap.set(el, { y: 160, scale: 0.9, autoAlpha: 0 }));

      // Icons get a slightly delayed, slightly shorter version of the same
      // motion as their card — a small parallax lag so the icon feels like
      // it's arriving on its own beat rather than glued to the card body.
      const iconOf = (el: HTMLElement) => el.querySelector<HTMLElement>('.stack-deck-icon');
      gsap.set(iconOf(cardEls[0]) ?? [], { y: 0, opacity: 1 });
      cardEls.slice(1).forEach((el) => gsap.set(iconOf(el) ?? [], { y: 26, opacity: 0 }));

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          pin: true,
          scrub: 1.1,
          start: 'top top',
          end: () => '+=' + window.innerHeight * viewportsPerCard * (cardEls.length - 1),
          invalidateOnRefresh: true,
          onUpdate: (self) => onActiveChange?.(Math.round(self.progress * (cardEls.length - 1))),
        },
      });

      // Each card gets a full 1-unit segment of scroll, but only the first
      // ENTER_FRAC of it is animated — the rest is a dwell where the card
      // just sits still, fully in place, so there's a comfortable range of
      // scroll where nothing is mid-transition. Without this, back-to-back
      // 1-unit tweens leave every scroll position mid-crossfade between two
      // cards, which reads as illegible double-exposed text rather than a
      // clean stack.
      const ENTER_FRAC = 0.45;

      cardEls.forEach((el, i) => {
        if (i === 0) return;
        const pos = i - 1;

        tl.to(el, { y: 0, scale: 1, autoAlpha: 1, ease: 'power2.out', duration: ENTER_FRAC }, pos);
        const icon = iconOf(el);
        if (icon) tl.to(icon, { y: 0, opacity: 1, ease: 'power2.out', duration: ENTER_FRAC * 0.7 }, pos + 0.1);

        // Every card seen so far recedes a bit further back in the stack —
        // the closer one (small depth) drops just far enough to clear the
        // new card's bottom edge (a real peek, not overlapping text), while
        // deeper ones shrink and fade until they're fully hidden beyond
        // ~3 cards back so the stack doesn't turn into visual noise.
        cardEls.slice(0, i).forEach((prev, j) => {
          const depth = i - j;
          tl.to(
            prev,
            {
              y: depth * 46,
              scale: Math.max(1 - depth * 0.06, 0.78),
              autoAlpha: Math.max(1 - depth * 0.38, 0),
              ease: 'none',
              duration: ENTER_FRAC,
            },
            pos,
          );
        });
      });

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
        gsap.set(stage, { clearProps: 'all' });
        gsap.set(cardEls, { clearProps: 'all' });
        cardEls.forEach((el) => gsap.set(iconOf(el) ?? [], { clearProps: 'all' }));
        onActiveChange?.(0);
      };
    });

    return () => mm.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length, viewportsPerCard]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {rail}
      <div ref={stageRef} className={`relative mx-auto ${cardWidthClassName}`}>
        {cards.map((card, i) => (
          <div key={i} className="stack-deck-card">
            {card}
          </div>
        ))}
      </div>
    </div>
  );
}
