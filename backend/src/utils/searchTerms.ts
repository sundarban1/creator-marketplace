import { Prisma } from '@prisma/client';

/**
 * Query expansion for marketplace search (works / businesses / people).
 *
 * Postgres full-text + pg_trgm already handles typos and word stems, but it's
 * still purely lexical: a search for "coffee" only finds rows that literally
 * contain "coffee", so a café listing titled "Latte art workshop at our
 * roastery" never surfaces. This module widens the query before it reaches SQL
 * by mapping each token onto a cluster of related terms, so "coffee" also
 * matches cafe / espresso / latte / barista / restaurant.
 *
 * Deliberately a hand-maintained lexicon rather than an AI or embedding step —
 * expansion happens on every keystroke-debounced search, so it has to be
 * instant, free, and give the same answer every time. Adding coverage means
 * adding a word to a group below.
 *
 * The expansion is a single hop: a token pulls in its own groups' terms, and
 * those terms are not themselves expanded again. Without that, overlapping
 * groups (cafe sits in both "coffee" and "restaurant") would chain outward
 * until every food word matched every other one.
 */

// Related-term clusters. Membership is unordered and bidirectional — every term
// in a group expands to every other term in the same group, and a term may
// appear in several groups (it then pulls in all of them). Multi-word entries
// are matched against the whole query string, not against single tokens.
const SYNONYM_GROUPS: string[][] = [
  // ── Food & drink ──
  ['coffee', 'cafe', 'café', 'coffee shop', 'coffeeshop', 'espresso', 'latte', 'cappuccino', 'americano', 'mocha', 'barista', 'roastery', 'brew', 'chiya', 'tea', 'कफी'],
  ['restaurant', 'resto', 'eatery', 'diner', 'bistro', 'dining', 'food', 'foodie', 'cuisine', 'kitchen', 'chef', 'menu', 'cafe', 'khaja', 'khana', 'thakali', 'newari', 'momo', 'momos', 'dumpling', 'street food', 'fast food', 'खाना', 'खाजा', 'रेस्टुरेन्ट'],
  ['bakery', 'bake', 'cake', 'pastry', 'dessert', 'sweets', 'mithai', 'patisserie', 'cookie', 'donut', 'chocolate'],
  ['bar', 'pub', 'lounge', 'nightclub', 'nightlife', 'cocktail', 'drinks', 'beer', 'brewery', 'wine', 'happy hour'],
  ['juice', 'smoothie', 'beverage', 'drinks', 'bubble tea', 'boba', 'soda', 'lassi'],

  // ── Hospitality & travel ──
  ['hotel', 'resort', 'lodge', 'homestay', 'guesthouse', 'hospitality', 'stay', 'accommodation'],
  ['travel', 'tour', 'tourism', 'trek', 'trekking', 'hiking', 'adventure', 'itinerary', 'backpacking', 'rafting', 'paragliding', 'yatra'],

  // ── Creative services ──
  ['photography', 'photographer', 'photo', 'photos', 'photoshoot', 'shoot', 'camera', 'portrait', 'headshot', 'studio', 'lens', 'फोटो'],
  ['video', 'videography', 'videographer', 'film', 'filmmaker', 'filmmaking', 'cinematography', 'reel', 'reels', 'vlog', 'vlogger', 'youtube', 'drone', 'editing', 'editor'],
  ['design', 'designer', 'graphic design', 'graphics', 'logo', 'illustration', 'illustrator', 'poster', 'branding', 'ui', 'ux'],
  ['art', 'artist', 'painting', 'painter', 'mural', 'sketch', 'drawing', 'illustration', 'craft'],
  ['writing', 'writer', 'copywriting', 'copywriter', 'blog', 'blogger', 'article', 'script', 'content writing', 'editor'],
  ['music', 'musician', 'singer', 'band', 'gig', 'concert', 'dj', 'live music', 'guitar', 'instrument', 'song', 'audio', 'sound', 'folk', 'संगीत'],
  ['dance', 'dancer', 'choreography', 'choreographer', 'performance', 'stage', 'नृत्य'],
  ['handicraft', 'handmade', 'craft', 'pottery', 'ceramics', 'weaving', 'pashmina', 'thangka', 'souvenir'],

  // ── Events ──
  ['event', 'events', 'concert', 'festival', 'jatra', 'meetup', 'conference', 'seminar', 'expo', 'exhibition', 'launch', 'party', 'celebration', 'program', 'कार्यक्रम'],
  ['wedding', 'marriage', 'bibaha', 'bihe', 'bridal', 'bride', 'groom', 'reception', 'engagement', 'mehendi', 'haldi', 'ceremony', 'bratabandha', 'विवाह', 'बिहे'],

  // ── Personal care & lifestyle ──
  ['fitness', 'gym', 'workout', 'trainer', 'personal trainer', 'yoga', 'pilates', 'zumba', 'crossfit', 'wellness', 'nutrition', 'diet'],
  ['beauty', 'salon', 'parlour', 'parlor', 'spa', 'makeup', 'makeup artist', 'mua', 'hair', 'hairstylist', 'barber', 'skincare', 'cosmetics', 'nails', 'grooming'],
  ['fashion', 'clothing', 'clothes', 'apparel', 'boutique', 'outfit', 'style', 'stylist', 'model', 'modeling', 'modelling', 'runway', 'tailor', 'textile', 'jewellery', 'jewelry', 'shoes', 'accessories'],
  ['health', 'clinic', 'hospital', 'doctor', 'medical', 'dental', 'dentist', 'pharmacy', 'therapy', 'counselling', 'ayurveda', 'mental health'],
  ['pet', 'pets', 'dog', 'cat', 'veterinary', 'vet', 'animal'],
  ['kids', 'children', 'baby', 'toddler', 'parenting', 'daycare', 'playgroup', 'family'],

  // ── Business & professional ──
  ['tech', 'technology', 'software', 'app', 'developer', 'coding', 'programming', 'it', 'startup', 'saas', 'website', 'web design', 'gadget', 'electronics', 'mobile', 'laptop'],
  ['marketing', 'advertising', 'ads', 'promotion', 'promo', 'branding', 'brand', 'campaign', 'social media', 'digital marketing', 'seo', 'pr', 'publicity'],
  ['influencer', 'creator', 'content creator', 'ugc', 'blogger', 'vlogger', 'ambassador', 'collaboration', 'collab', 'sponsorship'],
  ['education', 'tuition', 'tutor', 'teaching', 'teacher', 'coaching', 'class', 'classes', 'course', 'training', 'workshop', 'school', 'college', 'institute', 'academy'],
  ['real estate', 'property', 'house', 'home', 'apartment', 'flat', 'land', 'rent', 'rental', 'housing', 'interior', 'interior design', 'furniture', 'decor', 'architecture'],
  ['finance', 'bank', 'banking', 'loan', 'insurance', 'investment', 'fintech', 'payment', 'wallet', 'remittance', 'accounting', 'tax'],
  ['grocery', 'store', 'shop', 'retail', 'supermarket', 'mart', 'ecommerce', 'online store', 'delivery'],
  ['auto', 'car', 'bike', 'motorcycle', 'scooter', 'vehicle', 'automobile', 'garage', 'showroom'],
  ['agriculture', 'farm', 'farming', 'organic', 'vegetables', 'dairy', 'poultry', 'krishi'],
  ['ngo', 'nonprofit', 'charity', 'volunteer', 'donation', 'awareness', 'community', 'fundraiser', 'social work'],

  // ── Sports & gaming ──
  ['sports', 'football', 'futsal', 'cricket', 'basketball', 'cycling', 'running', 'marathon', 'tournament', 'athlete', 'fitness'],
  ['gaming', 'gamer', 'esports', 'streamer', 'game', 'twitch'],

  // ── Marketplace vocabulary ──
  ['work', 'works', 'job', 'gig', 'opportunity', 'hiring', 'freelance', 'project', 'assignment', 'काम'],
];

// Dropped before expansion: too common to carry meaning, and expanding them
// would pull in unrelated groups ("bar" in "bar near me" is fine, "near" is not).
const STOPWORDS = new Set([
  'a', 'an', 'and', 'the', 'or', 'of', 'for', 'in', 'on', 'at', 'to', 'with', 'near', 'me',
  'my', 'i', 'is', 'are', 'be', 'best', 'top', 'good', 'new', 'any', 'all', 'need', 'want',
  'looking', 'search', 'find', 'get', 'from', 'by', 'ko', 'ma', 'ra', 'lagi',
]);

// Bounds the SQL: every extra term adds ILIKE/tsquery branches to each search
// query, and past a dozen the tail terms are weak matches anyway.
const MAX_TERMS = 16;

const MIN_TOKEN_LENGTH = 2;

// term → indexes of every group it belongs to.
const GROUP_INDEX = ((): Map<string, number[]> => {
  const index = new Map<string, number[]>();
  SYNONYM_GROUPS.forEach((group, i) => {
    for (const term of group) {
      const existing = index.get(term);
      if (existing) existing.push(i);
      else index.set(term, [i]);
    }
  });
  return index;
})();

// Multi-word group entries, matched against the whole query rather than tokens.
const PHRASE_TERMS = [...GROUP_INDEX.keys()].filter((t) => t.includes(' '));

export interface ExpandedQuery {
  /** The user's query, trimmed. Used for exact/substring ranking. */
  original: string;
  /** Meaningful tokens of the original query (stopwords and 1-char noise removed). */
  tokens: string[];
  /** Related terms pulled in by expansion — never includes the original tokens. */
  related: string[];
  /** tokens + related, deduped and capped. Always non-empty for a non-empty query. */
  all: string[];
  /** `to_tsquery('english', …)` input OR-ing every term in `all`; '' if nothing usable. */
  tsquery: string;
}

/**
 * Lowercase, strip '#'/punctuation, collapse whitespace. Combining marks
 * (\p{M}) are kept alongside letters — dropping them would tear the matras off
 * Devanagari words ("फोटो" → "फ ट").
 */
function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Crude de-pluralization so "photographers" hits the "photographer" group.
 * Full stemming is Postgres's job for matching — this only needs to be good
 * enough for the lexicon lookup.
 */
function singularize(token: string): string | null {
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && token.endsWith('es') && !token.endsWith('ses')) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return null;
}

function groupsFor(term: string): number[] {
  const direct = GROUP_INDEX.get(term);
  if (direct) return direct;
  const singular = singularize(term);
  return (singular && GROUP_INDEX.get(singular)) || [];
}

/**
 * Turn a raw search box value into the term set the repositories query with.
 * Original tokens always come first so callers can rank exact hits above
 * expanded ones.
 */
export function expandSearchQuery(raw: string): ExpandedQuery {
  const original = raw.trim();
  const normalized = normalize(original);

  const tokens = normalized
    .split(' ')
    .filter((t) => t.length >= MIN_TOKEN_LENGTH && !STOPWORDS.has(t));

  // The whole normalized query counts as a lookup key too, so a two-word entry
  // like "content creator" expands as the phrase it is rather than as two
  // unrelated tokens.
  const lookups = new Set<string>(tokens);
  if (normalized && normalized.includes(' ')) lookups.add(normalized);
  for (const phrase of PHRASE_TERMS) {
    if (normalized.includes(phrase)) lookups.add(phrase);
  }

  const groupIds = new Set<number>();
  for (const lookup of lookups) {
    for (const id of groupsFor(lookup)) groupIds.add(id);
  }

  // Round-robin across the matched groups rather than draining one at a time —
  // "wedding photographer" matches two groups, and the MAX_TERMS cap would
  // otherwise spend every slot on wedding words and expand nothing about
  // photography.
  const buckets = [...groupIds].map((id) => SYNONYM_GROUPS[id]);
  const seen = new Set(tokens);
  const related: string[] = [];
  for (let depth = 0; buckets.some((bucket) => depth < bucket.length); depth++) {
    for (const bucket of buckets) {
      const term = bucket[depth];
      if (term === undefined || seen.has(term)) continue;
      seen.add(term);
      related.push(term);
    }
  }

  // Falls back to the raw query when every token was a stopword or stripped
  // (e.g. a single short word, or punctuation only) — searching for nothing
  // would silently match everything.
  const base = tokens.length ? tokens : [normalized || original].filter(Boolean);
  const all = [...base, ...related].slice(0, MAX_TERMS);

  return { original, tokens, related, all, tsquery: buildTsQuery(all) };
}

/**
 * Build a `to_tsquery` expression OR-ing every term. Terms are stripped to
 * letters/digits and multi-word terms become phrase (`<->`) operands, so the
 * result can never carry tsquery syntax through to Postgres.
 */
function buildTsQuery(terms: string[]): string {
  const operands = terms
    .map((term) =>
      term
        .replace(/[^\p{L}\p{M}\p{N}\s]+/gu, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .join(' <-> '),
    )
    .filter(Boolean);
  return [...new Set(operands)].join(' | ');
}

/** Terms containing regex metacharacters can only come from the user's own
 * query (the lexicon is letters and spaces), but escape defensively anyway. */
function escapeRegex(term: string): string {
  return term.replace(/[.^$*+?()[\]{}|\\-]/g, '\\$&');
}

/**
 * `col ~* '\m(term|term|…)'` — one case-insensitive regex matching any term at
 * the start of a word.
 *
 * Deliberately not `ILIKE '%term%'`: the lexicon holds short terms like "it",
 * "ui", "pr" and "art", and a bare substring match on those hits nearly every
 * row ("digital", "with", "smart", "party"). Anchoring to a word boundary
 * keeps compound and inflected forms working — "coffee" still matches
 * "coffeeshop", "photographer" matches "photographers", "foodie" matches
 * "#FoodieKTM" — without the noise. It also collapses what used to be one
 * ILIKE per term into a single operator per column.
 */
export function matchesAny(column: Prisma.Sql, terms: string[]): Prisma.Sql {
  const pattern = `\\m(${terms.map(escapeRegex).join('|')})`;
  return Prisma.sql`${column} ~* ${pattern}`;
}

/**
 * Terms safe to use with a plain substring match, for callers that can't run a
 * regex (the Prisma query builder). Short terms are dropped for the reason
 * described on matchesAny — callers still match the user's literal query, so a
 * genuine short search like "gym" isn't lost.
 */
export function substringSafeTerms(q: ExpandedQuery): string[] {
  return q.all.filter((term) => term.length >= 4);
}

/**
 * `to_tsquery` fragment for the expanded terms, or null when the query yielded
 * nothing indexable (callers then fall back to the exact plainto_tsquery).
 */
export function expandedTsQuerySql(q: ExpandedQuery): Prisma.Sql | null {
  return q.tsquery ? Prisma.sql`to_tsquery('english', ${q.tsquery})` : null;
}

/**
 * JS twin of `matchesAny`, for callers holding candidate values in memory
 * rather than in a column. `(?<![\p{L}\p{N}_])` is the JS spelling of
 * Postgres's `\m` word-start anchor, so both paths agree on what a term
 * matches: "skin" hits "Skincare" and "Skincare & Personal Care" but not
 * "sealskin", and "event" hits "Events and Entertainment".
 */
export function filterByTerms(values: string[], terms: string[]): string[] {
  if (!terms.length || !values.length) return [];
  // Separate escape from escapeRegex: that one escapes '-', which is a syntax
  // error outside a character class in a /u/-flagged JS regex.
  const pattern = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${pattern})`, 'iu');
  return values.filter((value) => re.test(value));
}
