// Section surfaces (similarweb.com-style rhythm): a deep navy base for the
// "product" moments, light white/mist sections for the explanatory ones, and
// big rounded-top panels wherever the page flips between the two — each panel
// is pulled up over the one before so its surface shows in the corners.
export const SURFACE = {
  navy: 'bg-lp-navy text-lp-fg',
  white: 'bg-lp-canvas text-lp-black dark:bg-lp-navy-2 dark:text-lp-fg',
  mist: 'bg-lp-mist text-lp-black dark:bg-lp-navy-2 dark:text-lp-fg',
} as const;

/** Straight-edged band, continuing the surface above. */
export const band = (surface: keyof typeof SURFACE) => `relative ${SURFACE[surface]}`;
/** Rounded-top panel that overlaps the previous section. */
export const panel = (surface: keyof typeof SURFACE) =>
  `relative -mt-12 rounded-t-[clamp(28px,4vw,56px)] ${SURFACE[surface]}`;

/** Section heading — thin and large; wrap the key phrase in `lp-gradient-text` or `font-bold`. */
export const H2 = 'lp-display text-balance text-[clamp(2rem,4.4vw,3rem)]';
/** Small uppercase label above a heading. */
export const KICKER = 'text-xs font-medium uppercase tracking-[0.14em]';
/** Body copy under a heading. */
export const LEAD = 'text-[17px] font-light leading-relaxed';
