// Canonical production origin — every absolute URL built for SEO tags
// (canonical, og:url, schema @id/url fields, sitemap) is derived from this
// so a domain change is a one-line edit instead of a grep-and-replace.
export const SITE_URL = 'https://ourkolab.com';
export const SITE_NAME = 'Kolab';

// 1024x1024 brand mark — usable as a fallback og:image, but square art
// crops awkwardly in link-preview cards (which expect ~1200x630). Swap in
// a purpose-made social card image here once one exists.
export const DEFAULT_OG_IMAGE = `${SITE_URL}/icon.png`;

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
