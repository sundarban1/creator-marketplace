/**
 * Runtime detection for Google Sign-In's platform-specific flow (see
 * lib/googleAuth.ts). Deliberately UA-based, not screen-width based — a
 * narrow desktop window (dev tools open, a tiled window manager) isn't a
 * mobile browser, and a wide-viewport tablet-in-landscape can still be one.
 */
export function isMobileWebBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
