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
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');
const PORT = process.env.PORT ?? 3000;

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

// Real built files (JS/CSS bundles, images, sitemap.xml, robots.txt,
// favicons) served exactly as-is. index:false/redirect:false so this
// middleware never guesses at directory index files or issues trailing-
// slash redirects — that's handled explicitly below instead.
app.use(express.static(DIST, { index: false, redirect: false }));

app.get('/healthz', (_req, res) => res.status(200).send('ok'));

app.use((req, res) => {
  const path = req.path === '/' ? '' : req.path.replace(/\/+$/, '');

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

app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
