/** A soft curved seam placed at the top of a section, filled with that
 *  section's own background color, so the transition from the lighter
 *  section above reads as a gentle dip instead of a hard flat line. */
export function SectionWave({ fill }: { fill: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -translate-y-[99%] overflow-hidden leading-none">
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="h-14 w-full sm:h-20">
        <path
          d="M0,40 C220,90 380,0 620,28 C860,56 980,10 1220,34 C1320,44 1400,52 1440,50 L1440,90 L0,90 Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}
