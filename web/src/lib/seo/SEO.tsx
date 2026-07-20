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

// Renders <title>/<meta>/<link> directly in the component tree — React 19
// automatically hoists these into <head>, deduping by tag+key so the previous
// page's tags are cleanly replaced on client-side route changes. No
// react-helmet or similar library needed.
//
// <script> tags are NOT part of that hoisting contract, but JSON-LD doesn't
// need <head> placement to be valid — Google reads structured data anywhere
// in the rendered document — so the schema scripts below just render in place.
export function SEO({ title, description, path, image = DEFAULT_OG_IMAGE, type = 'website', noindex = false, keywords, jsonLd }: SEOProps) {
  const url = absoluteUrl(path);
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}
      <link rel="canonical" href={url} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

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
