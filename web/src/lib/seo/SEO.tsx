import { useEffect } from 'react';
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME } from './config';

export interface SEOProps {
  /** Page title. "| Kolab" is appended automatically unless already present. */
  title: string;
  description: string;
  /** Route path, e.g. "/" or "/content-creators" — used to build canonical + og:url. */
  path: string;
  image?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
  keywords?: string[];
  /** One schema.org object, or several (e.g. WebPage + FAQPage + BreadcrumbList together). */
  jsonLd?: object | object[];
}

// index.html ships a static <title>/description/canonical/OG/Twitter set so
// link-preview crawlers that don't execute JS (Slack, WhatsApp, iMessage,
// Facebook's first-fetch) still see correct tags. Once React hydrates, this
// component must overwrite those SAME elements in place rather than render
// new ones alongside them — React's own <title>/<meta>/<link> hoisting only
// dedupes tags that React itself rendered, so a second <meta name="description">
// rendered here would sit next to (not replace) the static one from
// index.html, producing exactly the "duplicate meta description" /
// "duplicate canonical link" errors SEO crawlers flag. Doing this
// imperatively via querySelector, keyed on the same attributes a crawler
// dedupes on, guarantees exactly one instance of each tag always exists.
function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function removeMeta(attr: 'name' | 'property', key: string) {
  document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();
}

export function SEO({ title, description, path, image = DEFAULT_OG_IMAGE, type = 'website', noindex = false, keywords, jsonLd }: SEOProps) {
  const url = absoluteUrl(path);
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  const keywordsContent = keywords && keywords.length > 0 ? keywords.join(', ') : null;

  useEffect(() => {
    document.title = fullTitle;
    upsertMeta('name', 'description', description);
    if (keywordsContent) {
      upsertMeta('name', 'keywords', keywordsContent);
    } else {
      removeMeta('name', 'keywords');
    }
    upsertLink('canonical', url);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:locale', 'en_US');

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);
  }, [fullTitle, description, url, image, type, noindex, keywordsContent]);

  // <script> tags are the one piece that's fine to render declaratively —
  // JSON-LD doesn't need <head> placement to be valid (Google reads
  // structured data anywhere in the rendered document) and index.html never
  // ships a static one, so there's nothing for this to duplicate.
  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          // Escaping "<" blocks a "</script>"-in-content injection from closing
          // the tag early — defense in depth even though today's schema inputs
          // are all static strings we control.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
        />
      ))}
    </>
  );
}
