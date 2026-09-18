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
// The cap is a parameter, not hardcoded, because the two callers want
// different sizes for the same reason they share this module: a sitemap
// entry is just a URL (cheap — a wider net is fine), while a prerender entry
// is a full Playwright page load (expensive — kept smaller by default).
const DEFAULT_ENTITY_LIMIT = 60;

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
    fetchJson(`${apiOrigin}/api/public/businesses?limit=${limit}`),
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
