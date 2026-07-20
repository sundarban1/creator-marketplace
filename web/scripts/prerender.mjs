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
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = join(ROOT, 'dist');
const PORT = 4174;
const ORIGIN = `http://localhost:${PORT}`;

// Admin dashboard routes (/dashboard, /login, /users, ...) are intentionally
// excluded — they're behind auth, disallowed in robots.txt, and prerendering
// an empty "please log in" shell would serve no one. Keep this list in sync
// with public/sitemap.xml and the public <Route> entries in src/App.tsx.
const ROUTES = [
  '/',
  '/creator-marketplace-nepal',
  '/content-creators',
  '/brands',
  '/influencers',
  '/find-campaigns',
  '/influencer-marketing-nepal',
  '/brand-collaboration-nepal',
  '/tiktok-creators',
  '/instagram-creators',
  '/youtube-creators',
  '/facebook-creators',
  '/support',
  '/privacy',
  '/terms',
];

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
  const results = [];
  try {
    await waitForServer(ORIGIN);

    browser = await chromium.launch();
    const page = await browser.newPage();

    for (const route of ROUTES) {
      const url = `${ORIGIN}${route}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
      // Sections animate in via framer-motion whileInView — give them a beat
      // to settle so the snapshot isn't caught mid-fade for text content
      // that matters (crawlers don't care about opacity, but this also lets
      // any late API-driven content, e.g. FAQ schema on /support, resolve).
      await page.waitForTimeout(500);

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

  console.log(`[prerender] done — ${ROUTES.length} routes prerendered.`);
}

main().catch((err) => {
  console.error('[prerender] failed:', err);
  process.exitCode = 1;
});
