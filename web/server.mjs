// Production static-file server for the prerendered dist/ output.
//
// Render's static-site hosting was serving dist/index.html (the homepage)
// for every path that didn't have an exact literal file match — including
// paths that DO have their own prerendered page (dist/terms/index.html,
// dist/food-influencers-nepal/index.html, ...). Google's crawler saw the
// homepage's content and canonical tag back for those URLs and flagged
// them as Soft 404 / duplicate-of-canonical in Search Console. This server
// replaces that opaque host-level fallback with explicit routing so each
// prerendered route serves its own file, genuinely SPA-only routes (the
// authed dashboard) get the bare shell, and anything else gets a real
// HTTP 404 instead of a silent 200.
import express from 'express';
import compression from 'compression';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');
const PORT = process.env.PORT ?? 3000;

// Vite emits every JS/CSS/font/image chunk under /assets/ with a content
// hash in the filename, so those bytes are immutable — a changed file gets a
// changed URL. Anything else (HTML shells, sitemap.xml, robots.txt, the
// prerendered index.html files) must stay fresh so a deploy is picked up
// immediately. Without this the origin sent no freshness signal at all, so
// browsers revalidated every asset every visit and Cloudflare wouldn't hold
// them at the edge.
const IMMUTABLE_ONE_YEAR = 'public, max-age=31536000, immutable';
const REVALIDATE = 'public, max-age=0, must-revalidate';

function setAssetHeaders(res, filePath) {
  res.setHeader(
    'Cache-Control',
    filePath.includes(`${DIST}/assets/`) || filePath.includes(`${DIST}\\assets\\`)
      ? IMMUTABLE_ONE_YEAR
      : REVALIDATE,
  );
}

// Client-only routes behind ProtectedRoute in src/App.tsx — never
// prerendered (auth-gated, disallowed in robots.txt), so any request under
// these prefixes gets the bare SPA shell and React Router + AuthProvider
// resolve it in the browser.
const SPA_PREFIXES = [
  '/dashboard', '/login', '/admin', '/users', '/creators', '/businesses',
  '/campaigns', '/analytics', '/categories', '/platforms', '/success-stories',
  '/payments', '/referrals', '/reports', '/help-center', '/faqs',
  '/support-inbox', '/get-in-touch', '/legal', '/contracts', '/conversations',
  '/notifications', '/settings', '/rate-limits',
];

const app = express();

// Render's Docker web services don't gzip responses the way its static-site
// hosting does; Cloudflare compresses at the edge for proxied traffic, but
// this also covers direct-to-origin hits and the *.onrender.com URL.
app.use(compression());

// Real built files (JS/CSS bundles, images, sitemap.xml, robots.txt,
// favicons) served exactly as-is. index:false/redirect:false so this
// middleware never guesses at directory index files or issues trailing-
// slash redirects — that's handled explicitly below instead.
app.use(express.static(DIST, { index: false, redirect: false, setHeaders: setAssetHeaders }));

app.get('/healthz', (_req, res) => res.status(200).send('ok'));

app.use((req, res) => {
  const path = req.path === '/' ? '' : req.path.replace(/\/+$/, '');

  // Every response here is an HTML document (a prerendered page or the SPA
  // shell) — never cache it hard, or a deploy won't reach browsers until the
  // asset URLs inside it happen to change.
  res.setHeader('Cache-Control', REVALIDATE);

  const prerendered = join(DIST, path, 'index.html');
  if (existsSync(prerendered)) {
    return res.status(200).sendFile(prerendered);
  }

  if (SPA_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return res.status(200).sendFile(join(DIST, 'index.html'));
  }

  const notFound = join(DIST, '404', 'index.html');
  return res.status(404).sendFile(existsSync(notFound) ? notFound : join(DIST, 'index.html'));
});

// Render's Docker health check connects to the container from outside the
// process — binding without an explicit host can resolve to the IPv6-only
// `::1`/loopback interface in some container network configs, which accepts
// connections from inside the container (why the log below still prints) but
// is unreachable from Render's checker, so the deploy sits at "listening"
// until it times out. `0.0.0.0` guarantees it's reachable from outside.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] listening on :${PORT}`);
});
