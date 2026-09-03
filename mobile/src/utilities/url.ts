// Website-field helpers shared by the creator / business "Edit Profile"
// screens. The backend validates `website` with `z.string().url()`, so a
// value that fails `isValidWebsiteUrl` here would be bounced server-side with
// a generic save error — we catch it up front and normalise the scheme so a
// user typing "acme.com" still saves as "https://acme.com".

/** Trim input and prepend `https://` when the user omitted the scheme. Blank in → blank out. */
export function normalizeWebsiteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * True when `raw` looks like a usable web address. Accepts input with or
 * without a scheme (see `normalizeWebsiteUrl`). Requires a dotted host with a
 * 2+ char TLD; allows an optional port, path, query and fragment.
 */
export function isValidWebsiteUrl(raw: string): boolean {
  const url = normalizeWebsiteUrl(raw);
  if (!url) return false;
  return /^https?:\/\/(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(url);
}
