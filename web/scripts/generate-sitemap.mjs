// Generates dist/sitemap.xml at build time, replacing the old hand-maintained
// public/sitemap.xml (which only ever listed the static marketing pages and
// had to be kept in sync with src/App.tsx and robots.txt by hand — see
// docs/SEO_AUDIT.md §2.3/§3).
//
// Includes exactly the same dynamic creator/business/event detail URLs
// prerender.mjs snapshots (via the shared fetchIndexableEntities, at its
// shared DEFAULT_ENTITY_LIMIT). This used to ask for a wider 200 here while
// prerender.mjs only snapshotted 60 — a sitemap entry is just a <url>, so
// listing more seemed free. It wasn't: every entity in the sitemap but
// outside the prerender batch has no static HTML (server.mjs falls back to
// the bare CSR shell for it), and Googlebot's first, HTML-only crawl pass
// saw nothing worth indexing — Search Console piled those up as "Discovered
// — currently not indexed" instead of ever indexing them. Entities beyond
// this shared limit are still reachable and indexable (same CSR-shell
// fallback), just not pre-announced via the sitemap.
//
// Runs after `vite build` (see package.json's `build` script) so it can
// write straight into dist/, overwriting the copy Vite already copied from
// public/sitemap.xml — no public/sitemap.xml source file needed anymore.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_ENTITY_LIMIT, fetchIndexableEntities } from './lib/fetchEntities.mjs';
import { STATIC_ROUTES } from './lib/staticRoutes.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = join(ROOT, 'dist');
const SITE_URL = 'https://kolab.com.np';

// Static pages keep the hand-tuned priority/changefreq the old sitemap.xml
// had — SEO-meaningful (homepage and core pages outrank a city page), so
// worth preserving explicitly rather than flattening to one default.
const PRIORITY = {
  '/': 1.0,
  '/creator-marketplace-nepal': 0.9,
  '/content-creators': 0.9,
  '/brands': 0.9,
  '/influencer-marketing-nepal': 0.8,
  '/brand-collaboration-nepal': 0.8,
  '/paid-collaborations-nepal': 0.8,
  '/influencers': 0.8,
  '/find-campaigns': 0.8,
  '/tiktok-creators': 0.7,
  '/instagram-creators': 0.7,
  '/youtube-creators': 0.7,
  '/facebook-creators': 0.7,
  '/ugc-creators-nepal': 0.7,
  '/support': 0.5,
  '/privacy': 0.3,
  '/terms': 0.3,
  '/about': 0.5,
  '/trust-and-safety': 0.5,
};
const DEFAULT_STATIC_PRIORITY = 0.6;
const DYNAMIC_PRIORITY = { creators: 0.6, businesses: 0.6, events: 0.7 };

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

function xmlEscape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function urlEntry(path, { priority, changefreq }) {
  return [
    '  <url>',
    `    <loc>${xmlEscape(`${SITE_URL}${path}`)}</loc>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority.toFixed(1)}</priority>`,
    '  </url>',
  ].join('\n');
}

async function main() {
  const apiOrigin = await resolveApiOrigin();

  let entities = { creators: [], businesses: [], events: [] };
  try {
    entities = await fetchIndexableEntities(apiOrigin, DEFAULT_ENTITY_LIMIT);
  } catch (err) {
    // Same posture as prerender.mjs: a live-API hiccup shouldn't fail the
    // build, just ship a sitemap with the static pages only for this run.
    console.warn(`[sitemap] skipping dynamic entity URLs — API fetch failed: ${err instanceof Error ? err.message : err}`);
  }

  const staticEntries = STATIC_ROUTES.map((path) =>
    urlEntry(path, { priority: PRIORITY[path] ?? DEFAULT_STATIC_PRIORITY, changefreq: 'weekly' }),
  );

  const dynamicEntries = [
    ...entities.creators.map((e) => urlEntry(e.path, { priority: DYNAMIC_PRIORITY.creators, changefreq: 'weekly' })),
    ...entities.businesses.map((e) => urlEntry(e.path, { priority: DYNAMIC_PRIORITY.businesses, changefreq: 'weekly' })),
    ...entities.events.map((e) => urlEntry(e.path, { priority: DYNAMIC_PRIORITY.events, changefreq: 'daily' })),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticEntries,
    ...dynamicEntries,
    '</urlset>',
    '',
  ].join('\n');

  await mkdir(DIST, { recursive: true });
  await writeFile(join(DIST, 'sitemap.xml'), xml, 'utf8');
  console.log(`[sitemap] wrote dist/sitemap.xml — ${staticEntries.length} static + ${dynamicEntries.length} dynamic (${entities.creators.length} creators, ${entities.businesses.length} businesses, ${entities.events.length} events) = ${staticEntries.length + dynamicEntries.length} URLs`);
}

main().catch((err) => {
  console.error('[sitemap] failed:', err);
  process.exit(1);
});
