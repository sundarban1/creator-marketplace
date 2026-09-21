// Shared by scripts/prerender.mjs (which needs a route list to snapshot) and
// scripts/generate-sitemap.mjs (which needs the same set of URLs to publish)
// — a single source of "what dynamic entities are public and indexable
// right now" so the two build steps can't drift out of sync with each other.
//
// Deliberately bounded, not "every creator/business/event that exists": a
// pure build-time snapshot doesn't scale the way it does for the ~40 static
// marketing pages once the marketplace has thousands of entities — see
// docs/SEO_AUDIT.md §5 step 2's "build-time batch vs on-demand cache" choice
// point. This takes the batch option, capped, as the production-safe first
// step; a genuinely complete solution (every public entity, always current)
// would move to on-request prerendering/ISR instead of a build-time crawl.
//
// Both callers now use this SAME limit (previously the sitemap asked for a
// wider 200 while prerender only snapshotted 60 — cheap to list more URLs,
// so it seemed like a free win). It isn't free: every sitemap URL beyond
// what prerender.mjs actually snapshots has no static HTML, so server.mjs
// falls back to the bare CSR shell for it. Googlebot's first pass is
// HTML-only, and for a low-authority/new domain it frequently never comes
// back to do the JS-rendering pass — those URLs sit as Search Console's
// "Discovered — currently not indexed" indefinitely instead of getting
// indexed. Advertising fewer URLs that are all actually renderable beats
// advertising more that mostly aren't.
export const DEFAULT_ENTITY_LIMIT = 60;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

/**
 * @param {string} apiOrigin
 * @param {number} [limit]
 * @returns {Promise<{ creators: {path: string}[], businesses: {path: string}[], events: {path: string}[] }>}
 */
export async function fetchIndexableEntities(apiOrigin, limit = DEFAULT_ENTITY_LIMIT) {
  const [creatorsRes, businessesRes, eventsRes] = await Promise.all([
    fetchJson(`${apiOrigin}/api/public/creators?limit=${limit}&sort=followers`),
    // No `sort` param falls back to the repo's default order (isVerified
    // desc, businessName asc) — deterministic, but not tied to which
    // businesses actually benefit most from being indexed. Explicit
    // `sort=newest` (same convention public.service.ts already uses for the
    // homepage preview) at least means the capped batch is the businesses
    // most likely to still need organic visibility, not an arbitrary slice.
    fetchJson(`${apiOrigin}/api/public/businesses?limit=${limit}&sort=newest`),
    // campaignType omitted — /api/public/events already defaults to
    // status=ACTIVE (see public.routes.ts), which covers both paid
    // campaigns and open events without a separate call for each.
    fetchJson(`${apiOrigin}/api/public/events?limit=${limit}`),
  ]);

  const creators = (creatorsRes.data?.creators ?? [])
    // A creator with neither a username nor a public-enough profile to have
    // one assigned isn't worth a dedicated indexable URL yet.
    .filter((c) => c.username)
    .map((c) => ({ path: `/creators/${encodeURIComponent(c.username)}` }));

  const businesses = (businessesRes.data?.businesses ?? [])
    .map((b) => ({ path: `/businesses/${encodeURIComponent(b.slug ?? b.id)}` }));

  const events = (Array.isArray(eventsRes.data) ? eventsRes.data : [])
    .map((e) => ({ path: `/events/${encodeURIComponent(e.slug ?? e.id)}` }));

  return { creators, businesses, events };
}
