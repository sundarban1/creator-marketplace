import { env } from '../config/env';
import { logger } from '../config/logger';

// Stock-photo lookup for AI-generated campaign/event drafts. The model returns
// a short subject phrase alongside the draft (see `imageQuery` in
// campaign-ai.schema.ts) and this turns it into a real photo URL, so a brand
// who says "momo tasting night" gets a photo of momos rather than whatever
// their industry category happens to map to.
//
// Entirely optional: with no UNSPLASH_ACCESS_KEY set, every call returns null
// and the mobile client falls back to its local category/keyword photo map
// (features/creator/data/templateImages.ts). Nothing here is allowed to fail
// a draft — a missing photo is a cosmetic downgrade, not an error.

export type StockPhoto = {
  url: string;
  // Unsplash's API terms require crediting the photographer wherever the photo
  // is shown. Returned so the client can, even though it doesn't render it yet.
  credit: { name: string; profileUrl: string };
};

// An Unsplash Demo app is capped at 50 requests/hour, and drafts repeat their
// subjects heavily ("cafe latte", "holi festival"), so caching by query is what
// keeps a busy hour inside the cap. Process-local on purpose — same reasoning
// as settingsCache.ts: each instance serving a slightly different photo for the
// same query is harmless, and it needs no Redis round-trip.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const cache = new Map<string, { photo: StockPhoto | null; at: number }>();

// Long enough for a normal Unsplash response, short enough that an outage adds
// a barely-noticeable pause to a draft that already took several seconds.
const REQUEST_TIMEOUT_MS = 3_000;

function cacheKey(query: string): string {
  return query.toLowerCase().replace(/\s+/g, ' ').trim();
}

function readCache(key: string): { photo: StockPhoto | null } | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return hit;
}

function writeCache(key: string, photo: StockPhoto | null): void {
  // Map preserves insertion order, so the first key is the oldest written.
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { photo, at: Date.now() });
}

type UnsplashSearchResponse = {
  results?: {
    urls?: { regular?: string };
    links?: { download_location?: string };
    user?: { name?: string; links?: { html?: string } };
  }[];
};

// Required by the Unsplash API guidelines whenever a photo is actually used —
// it's how photographers get credited with a download. Fire-and-forget: the
// draft must not wait on it, and a failure here changes nothing for the brand.
function trackDownload(downloadLocation: string): void {
  fetch(downloadLocation, {
    headers: { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch(() => { /* best effort — never surfaced */ });
}

export async function searchStockPhoto(query: string): Promise<StockPhoto | null> {
  const key = cacheKey(query);
  if (!key) return null;
  if (!env.UNSPLASH_ACCESS_KEY) {
    logger.debug({ query: key }, 'Stock photo search skipped — UNSPLASH_ACCESS_KEY not configured');
    return null;
  }

  const cached = readCache(key);
  if (cached) return cached.photo;

  try {
    const url = new URL('https://api.unsplash.com/search/photos');
    url.searchParams.set('query', key);
    url.searchParams.set('per_page', '1');
    // Landscape matches the 16:9-ish feature-image slot on every card and hero;
    // content_filter keeps anything unsuitable out of a brand's event page.
    url.searchParams.set('orientation', 'landscape');
    url.searchParams.set('content_filter', 'high');

    const res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      // 403 here is almost always the hourly rate limit, which is worth seeing
      // in logs — it means drafts are silently losing their photos.
      logger.warn({ query: key, status: res.status }, 'Unsplash photo search failed');
      return null;
    }

    const body = (await res.json()) as UnsplashSearchResponse;
    const top = body.results?.[0];
    const photoUrl = top?.urls?.regular;
    if (!top || !photoUrl) {
      // Cache the miss too — an obscure query that returns nothing would
      // otherwise re-spend a rate-limit slot on every retry.
      writeCache(key, null);
      return null;
    }

    const photo: StockPhoto = {
      url: photoUrl,
      credit: {
        name: top.user?.name ?? 'Unsplash',
        profileUrl: top.user?.links?.html ?? 'https://unsplash.com',
      },
    };
    writeCache(key, photo);
    if (top.links?.download_location) trackDownload(top.links.download_location);
    return photo;
  } catch (err) {
    logger.warn({ query: key, err: err instanceof Error ? err.message : err }, 'Unsplash photo search errored');
    return null;
  }
}
