import { useId, type CSSProperties } from 'react';

/** Height (px) of the diagonal cut carved out of a section's top edge. Small
 * relative to every section's own vertical padding (py-20 and up), so it
 * reads as a crisp seam rather than eating into the content. */
export const SECTION_CUT_HEIGHT = 48;

/** Style to spread onto a `<section>` that should open with a diagonal cut
 * instead of a flat edge. `clip-path` slices the section's own painted box on
 * an angle; the matching negative margin pulls it up by that same amount so
 * the sliced-away triangle overlaps the section above and reveals it through
 * the cut — a real clip on the box itself, not a shape drawn over it, so it
 * isn't affected by either section's own `overflow-hidden`. `flip` mirrors
 * which corner is shallow so consecutive cuts down the page don't all lean
 * the same way. */
export function sectionCutStyle(flip = false): CSSProperties {
  const clipPath = flip
    ? `polygon(0 0, 100% ${SECTION_CUT_HEIGHT}px, 100% 100%, 0 100%)`
    : `polygon(0 ${SECTION_CUT_HEIGHT}px, 100% 0, 100% 100%, 0 100%)`;
  return { clipPath, marginTop: -SECTION_CUT_HEIGHT };
}

/** The thin brand-gradient hairline traced just inside a section's diagonal
 * cut (see `sectionCutStyle`) so the seam catches a bit of light instead of
 * disappearing into the fill. Render as the section's first child. */
export function SectionCutAccent({ flip = false }: { flip?: boolean }) {
  const gradientId = useId();
  const inset = 3; // keeps the stroke's own width fully inside the clipped shape
  const edge = flip
    ? `0,${inset} 1440,${SECTION_CUT_HEIGHT - inset}`
    : `0,${SECTION_CUT_HEIGHT - inset} 1440,${inset}`;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 1440 ${SECTION_CUT_HEIGHT}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 top-0 h-12 w-full"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-violet)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="var(--color-brand-orange)" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <polyline points={edge} fill="none" stroke={`url(#${gradientId})`} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
