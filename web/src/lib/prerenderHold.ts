// Keeps the prerendered HTML snapshot (scripts/prerender.mjs) on screen until
// the live React page is ready to replace it.
//
// Without this, createRoot() wipes the snapshot immediately, so a visitor to
// e.g. /events/:slug saw: full page → white RouteFallback spinner (lazy
// chunks) → skeleton (data fetch) → full page again — a visible blink. Now the
// snapshot is moved out of #root and stays visible while React mounts into a
// hidden #root; the two swap in a single frame once the page is ready.
//
// "Ready" is the first commit of the route tree (<PrerenderRelease/> in
// App.tsx), except for the data-backed detail pages below, which call
// useReleasePrerenderWhen(!loading) so the snapshot also covers their fetch.

const MAX_HOLD_MS = 8000;

// Detail pages that render a skeleton while fetching — keep holding past the
// route commit until the page itself releases.
const DATA_PAGE_PATTERNS = [
  /^\/events\/[^/]+\/?$/,
  /^\/community\/events\/[^/]+\/?$/,
  /^\/creators\/(?!search\/?$)[^/]+\/?$/,
  /^\/businesses\/[^/]+\/?$/,
];

let snapshot: HTMLElement | null = null;
let root: HTMLElement | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

export function holdPrerenderSnapshot(rootEl: HTMLElement) {
  if (!rootEl.firstElementChild) return; // plain SPA shell — nothing to hold
  snapshot = document.createElement('div');
  while (rootEl.firstChild) snapshot.appendChild(rootEl.firstChild);
  rootEl.parentNode?.insertBefore(snapshot, rootEl);
  rootEl.style.display = 'none';
  root = rootEl;
  timer = setTimeout(releasePrerenderSnapshot, MAX_HOLD_MS);
}

export function releasePrerenderSnapshot() {
  if (!snapshot || !root) return;
  clearTimeout(timer);
  root.style.display = '';
  snapshot.remove();
  snapshot = null;
}

export function prerenderWaitsForData(pathname: string) {
  return DATA_PAGE_PATTERNS.some((re) => re.test(pathname));
}
