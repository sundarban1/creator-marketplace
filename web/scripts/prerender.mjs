// Post-build static-HTML generator for the public marketing pages.
//
// This app is a client-only Vite SPA (no SSR/SSG framework) — `vite build`
// alone produces one shell dist/index.html that's blank until React mounts.
// That's a real problem for two audiences that don't execute JavaScript:
// link-preview crawlers (WhatsApp, Facebook, Twitter/X, Slack all fetch og:*
// tags from the raw HTML response) and the first wave of Googlebot's crawl.
//
// This script boots the built app with `vite preview`, uses Playwright to
// visit each public route, and writes the fully-rendered DOM (including the
// <title>/<meta>/<script type="application/ld+json"> tags the <SEO/>
// component injects at runtime) back out as that route's static index.html.
// The client bundle is unchanged and still mounts on top via
// createRoot(...).render() (see src/main.tsx) — this isn't true SSR
// hydration, just a first-paint / crawler snapshot, which is all a marketing
// site needs.
//
// Requires Playwright's Chromium browser to be installed in the build
// environment: `npx playwright install --with-deps chromium`.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchIndexableEntities } from './lib/fetchEntities.mjs';
import { STATIC_ROUTES } from './lib/staticRoutes.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = join(ROOT, 'dist');
const PORT = 4174;
const ORIGIN = `http://localhost:${PORT}`;

// The API origin public pages fetch live data from (legal docs, and — once
// dynamic entity routes are added below — creator/business/event detail
// data). Read the same way Vite bakes it into the client bundle
// (`import.meta.env.VITE_API_URL`, see src/lib/api.ts), but this script runs
// as a plain Node process after the build, not through Vite, so it can't
// read `import.meta.env` — fall back to parsing .env.production directly.
async function resolveApiOrigin() {
  if (process.env.VITE_API_URL) return process.env.VITE_API_URL;
  try {
    const envFile = await readFile(join(ROOT, '.env.production'), 'utf8');
    const match = envFile.match(/^VITE_API_URL=(.+)$/m);
    if (match) return match[1].trim();
  } catch {
    // .env.production missing — fall through to the same default api.ts uses.
  }
  return 'http://localhost:3000';
}

// STATIC_ROUTES (scripts/lib/staticRoutes.mjs) is the shared marketing-page
// list — also used by generate-sitemap.mjs. '/404' is added here only,
// since it's not a real route (no <Route> in src/App.tsx matches it, so it
// falls through to the catch-all `*` → NotFoundPage) and has no business in
// a sitemap; prerendering it gives server.mjs a real dist/404/index.html to
// serve with an actual HTTP 404 status for genuinely unknown URLs.
const ROUTES = [...STATIC_ROUTES, '/404'];

function waitForServer(url, timeoutMs = 20_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) return resolve();
      } catch {
        // server not up yet — keep polling
      }
      if (Date.now() - start > timeoutMs) return reject(new Error(`Preview server didn't respond within ${timeoutMs}ms`));
      setTimeout(tick, 300);
    };
    tick();
  });
}

async function main() {
  console.log('[prerender] starting `vite preview`...');
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'pipe',
  });

  let browser;
  // Crawl phase and write phase are deliberately separate passes. Writing
  // dist/<route>/index.html mid-crawl was an earlier version of this script's
  // bug: vite preview's SPA-fallback serves dist/index.html for any path with
  // no matching static file, so once "/" got its prerendered (tag-filled)
  // HTML written to dist/index.html, every *later* route in the loop that
  // hadn't been written yet booted from that already-tagged document instead
  // of the pristine SPA shell. React's <title> hoisting replaces the prior
  // title, but <meta>/<link> tags it didn't itself render (because they came
  // from static server HTML, not a React tree it's tracking) just accumulate
  // — so e.g. /brands ended up with both its own og:title AND the homepage's.
  // Collecting all HTML in memory first, and only writing to disk after the
  // entire crawl finishes, guarantees every route boots from the same
  // untouched shell regardless of processing order.
  const apiOrigin = await resolveApiOrigin();
  console.log(`[prerender] API origin allowlisted: ${apiOrigin}`);

  // Dynamic creator/business/event detail pages, on top of the 41 hardcoded
  // marketing routes above — see fetchEntities.mjs for why this is a capped
  // batch, not every entity. Best-effort: a live-API hiccup during the build
  // shouldn't fail the whole prerender step, just skip the dynamic routes for
  // this run (the static marketing pages are what actually gates a deploy).
  let dynamicRoutes = [];
  try {
    const { creators, businesses, events } = await fetchIndexableEntities(apiOrigin);
    dynamicRoutes = [...creators, ...businesses, ...events].map((e) => e.path);
    console.log(`[prerender] fetched ${dynamicRoutes.length} dynamic entity route(s) (${creators.length} creators, ${businesses.length} businesses, ${events.length} events)`);
  } catch (err) {
    console.warn(`[prerender] skipping dynamic entity routes — API fetch failed: ${err instanceof Error ? err.message : err}`);
  }
  const allRoutes = [...ROUTES, ...dynamicRoutes];

  const results = [];
  try {
    await waitForServer(ORIGIN);

    browser = await chromium.launch();
    const page = await browser.newPage();

    // Block every request that isn't served by the local preview server or
    // the live API.
    //
    // Three reasons. First, correctness: the landing page's Collaboration
    // section loads the live Google Maps JS API (useJsApiLoader), and if it
    // loads here, page.content() below bakes Maps' injected custom-element
    // definitions into the static HTML. In production that snapshot is
    // served first, then the real client mounts and loads Maps a *second*
    // time into a page that already has it — "already defined" / "already
    // loaded outside @googlemaps/js-api-loader" and cascading failures.
    //
    // Second, reliability: the shell also pulls Google Fonts and gtag.js,
    // and some pages reference Cloudinary/Pexels media. None of them affect
    // the captured HTML (the <link>/<img> tags are in the DOM either way),
    // but on a build machine any one of them can hang, and a single hanging
    // request means the page never reaches a quiet network — which is what
    // used to blow the navigation timeout partway through the crawl.
    //
    // Third — the API origin has to be let through, not just the local
    // preview server. Pages like /privacy, /terms (legal doc body) and the
    // dynamic creator/business/event detail routes below all fetch their
    // real content from the live backend; blocking that call doesn't leave
    // them empty, it makes the fetch reject, which for /privacy and /terms
    // was silently baking "Couldn't load this page. Please try again." into
    // the static snapshot search engines and link-preview bots actually see.
    await page.route('**', (route) => {
      const url = route.request().url();
      if (url.startsWith(ORIGIN) || url.startsWith(apiOrigin)) return route.continue();
      return route.abort();
    });

    for (const route of allRoutes) {
      const url = `${ORIGIN}${route}`;
      // Deliberately not `waitUntil: 'networkidle'`. Playwright itself
      // discourages it, and here it's actively wrong: "no requests for
      // 500ms" is a property of the whole network, so one slow or hanging
      // resource fails the navigation even though the DOM we want to
      // capture rendered long ago. What actually signals readiness for this
      // app is React having mounted, so wait on that instead.
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForFunction(() => {
        const root = document.getElementById('root');
        if (!root || root.childElementCount === 0) return false;
        // Public routes are lazy-loaded (see App.tsx) — until the route's
        // chunk resolves, #root holds only the <Suspense> fallback spinner.
        // Don't snapshot that: wait for the real page to replace it.
        if (root.querySelector('[role="status"][aria-label="Loading"]')) return false;
        return true;
      }, undefined, { timeout: 30_000 });
      // Some pages (legal docs, dynamic entity pages) show an
      // `animate-pulse` skeleton while their own API fetch resolves, on top
      // of the route-chunk Suspense fallback already waited out above. Give
      // that a bounded wait too — non-fatal if it never clears (a genuinely
      // empty/error state is still better captured as itself than timed out
      // mid-skeleton), since not every route uses this pattern.
      await page.waitForFunction(() => !document.querySelector('.animate-pulse'), undefined, { timeout: 8_000 }).catch(() => {});

      // Sections animate in via framer-motion whileInView — give them a beat
      // to settle so the snapshot isn't caught mid-fade for text content
      // that matters (crawlers don't care about opacity, but this also lets
      // any late API-driven content, e.g. FAQ schema on /support, resolve).
      await page.waitForTimeout(500);

      // The Maps loader inserts its <script id="kolab-google-maps"> tag into
      // the DOM synchronously, before the (blocked, see route() above) fetch
      // even happens — so the stub tag itself still ends up in the snapshot.
      // Left in, it would actually load for real once served in production,
      // and @googlemaps/js-api-loader in that fresh page doesn't know it
      // didn't create the tag, so it throws "already loaded outside
      // @googlemaps/js-api-loader". Strip it before capturing.
      await page.evaluate(() => document.getElementById('kolab-google-maps')?.remove());

      const html = await page.content();
      results.push({ route, html });
      console.log(`[prerender] crawled ${route}`);
    }
  } finally {
    await browser?.close();
    preview.kill();
  }

  for (const { route, html } of results) {
    const outDir = route === '/' ? DIST : join(DIST, route.slice(1));
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, 'index.html'), `<!doctype html>\n${html}`, 'utf8');
    console.log(`[prerender] wrote ${route === '/' ? '/index.html' : `${route}/index.html`}`);
  }

  console.log(`[prerender] done — ${allRoutes.length} routes prerendered.`);
}

main()
  .then(() => {
    // Force-exit rather than letting the event loop drain on its own —
    // if the spawned `vite preview` process (or a lingering pipe/socket
    // from it) doesn't fully die even after preview.kill(), Node just
    // hangs forever with nothing left to do. That's silent in a local
    // terminal (you'd eventually Ctrl+C), but on Render it means the
    // build never returns control and gets killed by the build timeout
    // with no error logged — indistinguishable from the script itself
    // failing, except every route already crawled and wrote cleanly.
    process.exit(0);
  })
  .catch((err) => {
    console.error('[prerender] failed:', err);
    process.exit(1);
  });
