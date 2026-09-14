import { useLayoutEffect } from 'react';

/** A hard reload should always land the landing page at the top, even if the
 *  user reloads while scrolled to a mid-page section — the browser's native
 *  `auto` scroll restoration would otherwise jump back to that offset once
 *  React has mounted (visibly late, since it can't restore until the page
 *  has grown to its real layout height), which also re-triggers every
 *  `whileInView` entrance animation the jump scrolls past. Forcing scroll to
 *  0 in a layout effect (before the browser paints) means that jump never
 *  happens. Companion to `history.scrollRestoration = 'manual'` in
 *  LandingPage.tsx, which stops the browser's own restoration from
 *  overriding this. */
export function useScrollToTop() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);
}
