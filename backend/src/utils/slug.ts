// Shared slug generation for public-URL-bearing models that don't have a
// user-chosen handle the way CreatorProfile.username does (BusinessProfile,
// Campaign) — kolab.com.np/businesses/{slug}, kolab.com.np/events/{slug}
// instead of a bare cuid, for readable URLs and SERP snippets.

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents so e.g. "Café" -> "cafe", not "caf"
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, ''); // slice() above can leave a trailing "-" mid-word
}

/**
 * Turns `base` into a slug guaranteed unique per `isTaken`, by appending
 * `-2`, `-3`, ... on collision. Falls back to a short random suffix past 50
 * attempts (a pathological case — many rows sharing the exact same name)
 * rather than looping indefinitely.
 */
export async function generateUniqueSlug(base: string, isTaken: (slug: string) => Promise<boolean>): Promise<string> {
  const root = slugify(base) || 'item';
  let candidate = root;
  let suffix = 2;
  while (await isTaken(candidate)) {
    candidate = `${root}-${suffix}`;
    suffix += 1;
    if (suffix > 50) {
      candidate = `${root}-${Math.random().toString(36).slice(2, 8)}`;
      break;
    }
  }
  return candidate;
}
