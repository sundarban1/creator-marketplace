import { useEffect, useLayoutEffect, useRef } from 'react';

const STORAGE_KEY = 'landing:scrollY';

/** The browser's native `auto` scroll restoration can't jump back to a
 *  mid-page offset until the page has grown to its real layout height, so on
 *  a hard reload it restores late — after first paint, once React has
 *  mounted. Between those two points the page sits at scrollY 0 (whatever
 *  was there, e.g. the hero, momentarily visible instead of the section the
 *  user reloaded on), then snaps down, and that scroll change is what fires
 *  every `whileInView` entrance animation the jump scrolls past — read
 *  together as content disappearing then flashing back in. Restoring the
 *  offset ourselves in a layout effect (before the browser paints) lands it
 *  before any of that is visible, since the fallback-card content already
 *  gives sections their real height on the very first render. Companion to
 *  `history.scrollRestoration = 'manual'` in LandingPage.tsx, which stops the
 *  browser's own late restoration from fighting this one. */
export function useScrollRestoration() {
  const restored = useRef(false);

  useLayoutEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const saved = Number(sessionStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(saved) && saved > 0) {
      window.scrollTo(0, saved);
    }
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        sessionStorage.setItem(STORAGE_KEY, String(window.scrollY));
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
}
