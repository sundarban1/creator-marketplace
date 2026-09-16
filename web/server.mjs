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

// Client-only routes — never prerendered, so any request under these prefixes
// gets the bare SPA shell and React Router resolves it in the browser.
//   - /admin/*                    : the entire admin dashboard.
//   - /login /signup /verify …    : marketplace auth screens.
//   - /creator/* /business/*      : the authenticated marketplace app.
// Public marketplace pages (/creators, /events, …) will be prerendered and are
// intentionally NOT listed here.
const SPA_PREFIXES = [
  '/admin',
  '/login', '/signup', '/verify', '/forgot-password',
  '/creator', '/business',
  '/oauth',
];

// Public, indexable SPA routes — client-rendered (React 19 hoists their SEO
// tags), served with a 200 so crawlers index them. Distinct from SPA_PREFIXES
// only in intent; both fall back to the same shell.
//
// '/businesses' must be listed explicitly here — it does NOT fall through to
// the '/business' entry in SPA_PREFIXES above, because that check requires a
// '/' right after the prefix (`path.startsWith(prefix + '/')`) and
// '/businesses' has no such boundary. Before this was added, every request
// to /businesses or /businesses/:id missed both prefix lists and fell to the
// real-404 branch below, in production.
const PUBLIC_SPA_PREFIXES = ['/creators', '/businesses', '/events'];

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

  const allSpa = [...SPA_PREFIXES, ...PUBLIC_SPA_PREFIXES];
  if (allSpa.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
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
