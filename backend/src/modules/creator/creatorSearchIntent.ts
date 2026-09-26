/**
 * Natural-language → structured filters for the public creator search (the
 * landing-page hero: "I need 3 creators to promote my cafe in Kathmandu").
 *
 * Deterministic on purpose, for the same reasons searchTerms.ts gives: this
 * runs for anonymous visitors on a public, rate-limited endpoint, so it has to
 * be instant, free and give the same answer every time. It only EXTRACTS
 * intent — count, platform, place, topic. Matching the topic against real
 * creators (with synonym expansion and relevance ranking) stays in
 * CreatorRepository.findMany; nothing here invents results.
 */

export interface CreatorSearchIntent {
  /** The visitor's query, trimmed. */
  query: string;
  /** What the creators should be about ("food", "beauty clothing") — null when the query named none. */
  topic: string | null;
  /** Canonical place name ("Kathmandu") — null when none, or when it was just "Nepal". */
  location: string | null;
  /** Lowercase platform keys, matching SocialAccount.platform. */
  platforms: string[];
  /** "I need 3 creators" → 3. Informational only — results are never padded or cut to it. */
  creatorCount: number | null;
  /** "10k+ followers", "over 1 lakh" → 10000 / 100000. On the named platform(s), else total across accounts. */
  minFollowers: number | null;
  /** "under 5k followers" → 5000. */
  maxFollowers: number | null;
  /** "most followers", "top", "biggest", "more TikTok followers" → rank by audience size. */
  sortByFollowers: boolean;
}

// ── Audience size ────────────────────────────────────────────────────────────

const FOLLOWER_WORD = String.raw`(?:followers?|follower\s*count|subscribers?|subs|fans|audience|following|reach)`;
// 10k · 10.5k · 1,00,000 · 2 lakh · 1L · 1m · 1cr · 50 thousand, optionally followed by '+'.
const AMOUNT = String.raw`(\d+(?:[.,]\d+)*)\s*(k|m|mn|million|thousand|lakhs?|lacs?|l|cr|crores?)?(?![\p{L}\d])\s*(\+)?`;
const MIN_WORDS = String.raw`(?:more\s+than|over|above|at\s*least|min(?:imum)?(?:\s+of)?|greater\s+than|>=?|beyond)`;
const MAX_WORDS = String.raw`(?:less\s+than|fewer\s+than|under|below|at\s*most|max(?:imum)?(?:\s+of)?|up\s*to|<=?)`;

// Standard influencer tiers.
const TIERS: Record<string, [number, number | null]> = {
  nano: [1_000, 10_000],
  micro: [10_000, 100_000],
  macro: [100_000, 1_000_000],
  mega: [1_000_000, null],
  celebrity: [1_000_000, null],
};

function toAmount(digits: string, unit: string | undefined): number {
  const n = Number(digits.replace(/,/g, ''));
  if (!Number.isFinite(n)) return NaN;
  const u = (unit ?? '').toLowerCase();
  if (u === 'k' || u === 'thousand') return Math.round(n * 1_000);
  if (u === 'l' || u.startsWith('lakh') || u.startsWith('lac')) return Math.round(n * 100_000);
  if (u === 'cr' || u.startsWith('crore')) return Math.round(n * 10_000_000);
  if (u === 'm' || u === 'mn' || u === 'million') return Math.round(n * 1_000_000);
  return Math.round(n);
}

/**
 * Pulls audience-size intent out of the (lowercased) query and returns the
 * text with those phrases removed, so "10k" can't later be read as a creator
 * count or "followers" as a topic. A bare number only counts as a follower
 * threshold when it's attached to a follower word, carries a k/m/lakh unit or
 * a '+', or is too big to be a head-count — "3 creators" stays a count.
 */
function extractAudience(input: string): { text: string; min: number | null; max: number | null; sort: boolean } {
  let text = ` ${input} `;
  let min: number | null = null;
  let max: number | null = null;
  let sort = false;
  const followerContext = new RegExp(FOLLOWER_WORD, 'iu').test(text);
  const isAudience = (digits: string, unit?: string, plus?: string, trailing = '') =>
    Boolean(unit || plus || new RegExp(`^\\s*${FOLLOWER_WORD}`, 'iu').test(trailing) || toAmount(digits, unit) > 50 || followerContext);
  const strip = (re: RegExp, fn: (m: RegExpExecArray, after: string) => boolean) => {
    let m: RegExpExecArray | null;
    const g = new RegExp(re.source, 'giu');
    while ((m = g.exec(text))) {
      if (fn(m, text.slice(m.index + m[0].length))) {
        text = text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length).replace(new RegExp(`^\\s*${FOLLOWER_WORD}`, 'iu'), ' ');
        g.lastIndex = m.index;
      }
    }
  };

  // between 10k and 50k · 10k-50k followers
  strip(new RegExp(`(?:between\\s+)?${AMOUNT}\\s*(?:-|–|to|and)\\s*${AMOUNT}`, 'iu'), (m, after) => {
    const hasBetween = /^\s*between/i.test(m[0]);
    if (!hasBetween && !new RegExp(`^\\s*${FOLLOWER_WORD}`, 'iu').test(after) && !m[2] && !m[5]) return false;
    const lo = toAmount(m[1]!, m[2] ?? m[5]);
    const hi = toAmount(m[4]!, m[5]);
    if (!(lo >= 0 && hi > lo)) return false;
    min = lo;
    max = hi;
    return true;
  });
  // more than / over / at least 10k
  strip(new RegExp(`${MIN_WORDS}\\s+${AMOUNT}`, 'iu'), (m, after) => {
    if (!isAudience(m[1]!, m[2], m[3], after)) return false;
    min = toAmount(m[1]!, m[2]);
    return true;
  });
  // under / less than / up to 5k
  strip(new RegExp(`${MAX_WORDS}\\s+${AMOUNT}`, 'iu'), (m, after) => {
    if (!isAudience(m[1]!, m[2], m[3], after)) return false;
    max = toAmount(m[1]!, m[2]);
    return true;
  });
  // 10k+ · 5000 followers · 1 lakh subscribers
  strip(new RegExp(`(?<![\\p{L}\\d])${AMOUNT}`, 'iu'), (m, after) => {
    const attached = new RegExp(`^\\s*${FOLLOWER_WORD}`, 'iu').test(after);
    if (!(attached || m[2] || m[3])) return false;
    min = toAmount(m[1]!, m[2]);
    return true;
  });

  // Influencer tiers: "micro influencers"
  text = text.replace(/\b(nano|micro|macro|mega|celebrity)[\s-]*(?=influencers?|creators?|\b)/giu, (_, tier: string) => {
    const [lo, hi] = TIERS[tier.toLowerCase()]!;
    min ??= lo;
    max ??= hi;
    return ' ';
  });

  // Ranking: "most followers", "more tiktok followers", "top", "biggest"
  const before = text;
  text = text
    .replace(new RegExp(`\\b(?:most|more|highest|largest|biggest|max(?:imum)?)\\s+((?:\\p{L}+\\s+)?)${FOLLOWER_WORD}`, 'giu'), ' $1 ')
    .replace(/\bmost\s+(?:followed|popular|famous|subscribed)\b/giu, ' ')
    .replace(/\b(?:top|biggest|largest|leading|famous|popular|trending|big)\b/giu, ' ');
  if (text !== before) sort = true;

  // Any follower words left over are context, not topic.
  text = text.replace(new RegExp(`\\b(?:with|having|has|have|who\\s+has|that\\s+has)?\\s*${FOLLOWER_WORD}\\b`, 'giu'), ' ');

  if (min !== null && max !== null && max < min) max = null;
  return { text, min, max, sort };
}

const PLATFORM_ALIASES: Record<string, string> = {
  instagram: 'instagram', insta: 'instagram', ig: 'instagram', instagrammer: 'instagram', instagrammers: 'instagram', 'इन्स्टाग्राम': 'instagram',
  tiktok: 'tiktok', 'tik tok': 'tiktok', tiktoker: 'tiktok', tiktokers: 'tiktok', 'टिकटक': 'tiktok',
  youtube: 'youtube', yt: 'youtube', youtuber: 'youtube', youtubers: 'youtube', 'युट्युब': 'youtube', 'युट्युबर': 'youtube',
  facebook: 'facebook', fb: 'facebook', 'फेसबुक': 'facebook',
};

// Major Nepali cities, so a place is recognised as a place even before any
// creator there exists (the page can then say "no creators in Pokhara yet"
// instead of keyword-searching bios for "pokhara"). Places creators actually
// list are added on top at runtime (see CreatorService.placeVocabulary).
export const NEPAL_PLACES = [
  'Kathmandu', 'Lalitpur', 'Patan', 'Bhaktapur', 'Kirtipur', 'Pokhara', 'Biratnagar', 'Birgunj', 'Bharatpur',
  'Chitwan', 'Butwal', 'Dharan', 'Itahari', 'Hetauda', 'Janakpur', 'Nepalgunj', 'Dhangadhi', 'Damak', 'Birtamod',
  'Bhairahawa', 'Siddharthanagar', 'Tulsipur', 'Ghorahi', 'Dang', 'Mahendranagar', 'Birendranagar', 'Surkhet',
  'Gorkha', 'Lumbini', 'Palpa', 'Tansen', 'Banepa', 'Dhulikhel', 'Ilam', 'Jhapa', 'Kakarbhitta', 'Rajbiraj',
  'Lahan', 'Gaur', 'Kalaiya', 'Tikapur', 'Nuwakot', 'Bandipur', 'Baglung', 'Syangja', 'Waling', 'Mustang', 'Jomsom',
];

// Devanagari spellings → canonical place. Matched as a word prefix, so the
// possessive/locative suffixes (काठमाडौंका, पोखरामा) still resolve.
const DEVANAGARI_PLACES: Record<string, string> = {
  'काठमाडौं': 'Kathmandu', 'काठमाण्डौ': 'Kathmandu', 'काठमाडौँ': 'Kathmandu', 'ललितपुर': 'Lalitpur',
  'भक्तपुर': 'Bhaktapur', 'पोखरा': 'Pokhara', 'विराटनगर': 'Biratnagar', 'बिराटनगर': 'Biratnagar',
  'वीरगन्ज': 'Birgunj', 'बिरगन्ज': 'Birgunj', 'धरान': 'Dharan', 'इटहरी': 'Itahari', 'हेटौंडा': 'Hetauda',
  'जनकपुर': 'Janakpur', 'बुटवल': 'Butwal', 'चितवन': 'Chitwan', 'नेपालगन्ज': 'Nepalgunj', 'धनगढी': 'Dhangadhi',
};

// Country-wide — recognised so it isn't treated as a topic, but not a filter.
const NATIONWIDE = new Set(['nepal', 'nationwide', 'anywhere', 'नेपाल', 'नेपालका', 'नेपालभर', 'नेपालमा']);

// Devanagari topic words → the English term the lexicon/categories know.
const DEVANAGARI_TOPICS: Record<string, string> = {
  'फूड': 'food', 'फुड': 'food', 'खाना': 'food', 'ट्राभल': 'travel', 'यात्रा': 'travel', 'ब्युटी': 'beauty',
  'सौन्दर्य': 'beauty', 'फेसन': 'fashion', 'फिटनेस': 'fitness', 'लाइफस्टाइल': 'lifestyle', 'रेस्टुरेन्ट': 'restaurant',
  'क्याफे': 'cafe', 'टेक': 'tech', 'गेमिङ': 'gaming', 'संगीत': 'music',
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

// Words that describe the ASK rather than the creators: who's asking, the
// verb, the generic noun "creators", and the business being promoted
// ("my new clothing brand" → only "clothing" is a topic).
const FILLER = new Set([
  'i', 'me', 'my', 'we', 'us', 'our', 'you', 'your', 'a', 'an', 'the', 'some', 'few', 'several', 'any', 'all',
  'need', 'needs', 'want', 'wants', 'looking', 'look', 'find', 'search', 'searching', 'show', 'get', 'hire', 'hiring',
  'book', 'please', 'can', 'could', 'would', 'who', 'that', 'which', 'will', 'help', 'is', 'are', 'be',
  'to', 'for', 'in', 'on', 'at', 'of', 'with', 'and', 'or', 'from', 'by', 'around', 'near', 'nearby', 'within',
  'based', 'local', 'area', 'city', 'best', 'top', 'good', 'great', 'popular', 'new', 'upcoming', 'nepali',
  'creator', 'creators', 'influencer', 'influencers', 'content', 'people', 'person', 'persons', 'someone',
  'promote', 'promoting', 'promotion', 'promo', 'advertise', 'advertising', 'market', 'marketing', 'grow', 'launch',
  'brand', 'brands', 'business', 'businesses', 'company', 'shop', 'store', 'page', 'account', 'collab', 'collaborate',
  // audience-size connectives left behind once extractAudience() takes the numbers
  'has', 'have', 'having', 'than', 'more', 'most', 'less', 'over', 'under', 'above', 'below', 'least', 'many',
  'lots', 'large', 'huge', 'high', 'highest',
  // Devanagari fillers
  'मलाई', 'मेरो', 'हाम्रो', 'लागि', 'चाहियो', 'चाहिन्छ', 'जना', 'क्रिएटर', 'क्रिएटरहरू', 'क्रिएटरहरु', 'का', 'को', 'मा',
  'खोज्नुहोस्', 'व्यवसाय',
]);

// Words right after these are read as a place even when they're not in any
// list ("creators around Tokha") — only when they aren't a known topic word.
const PLACE_PREPOSITIONS = new Set(['in', 'around', 'near', 'from', 'at', 'within']);

const MAX_QUERY_LENGTH = 200;

function normalize(raw: string): string {
  return raw
    .slice(0, MAX_QUERY_LENGTH)
    .toLowerCase()
    // Devanagari digits → ASCII so "३ जना" counts.
    .replace(/[०-९]/g, (d) => String('०१२३४५६७८९'.indexOf(d)))
    .replace(/[^\p{L}\p{M}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(s: string): string {
  return s.replace(/(^|\s)(\p{L})/gu, (_, sp: string, ch: string) => sp + ch.toUpperCase());
}

/**
 * @param knownPlaces extra place names (creators' own listed cities) on top of
 *   NEPAL_PLACES. Matched case-insensitively as whole words, longest first.
 * @param isTopicWord whether the topic vocabulary knows a word (lexicon terms,
 *   category words) — such words are never mistaken for a place after
 *   "in/around" ("creators in fashion").
 */
export function parseCreatorSearchIntent(
  raw: string,
  knownPlaces: string[] = [],
  isTopicWord: (word: string) => boolean = () => false,
): CreatorSearchIntent {
  const query = raw.trim().slice(0, MAX_QUERY_LENGTH);
  // Audience size first, on the un-normalized text — normalize() strips the
  // '+', ',' and '.' that "10k+", "1,00,000" and "1.5m" depend on.
  const audience = extractAudience(query.toLowerCase().replace(/[०-९]/g, (d) => String('०१२३४५६७८९'.indexOf(d))));
  let text = ` ${normalize(audience.text)} `;

  // ── Platforms — phrases first ("tik tok"), then single tokens ──
  const platforms = new Set<string>();
  for (const alias of Object.keys(PLATFORM_ALIASES).sort((a, b) => b.length - a.length)) {
    const needle = ` ${alias} `;
    while (text.includes(needle)) {
      platforms.add(PLATFORM_ALIASES[alias]!);
      text = text.replace(needle, ' ');
    }
  }

  // ── Place — longest known name first, whole words ──
  let location: string | null = null;
  const places = [...new Set([...NEPAL_PLACES, ...knownPlaces].map((p) => p.trim()).filter((p) => p.length >= 3))]
    .sort((a, b) => b.length - a.length);
  for (const place of places) {
    const needle = ` ${place.toLowerCase()} `;
    if (text.includes(needle)) {
      location = place;
      text = text.replace(needle, ' ');
      break;
    }
  }

  let tokens = text.split(' ').filter(Boolean);

  if (!location) {
    const idx = tokens.findIndex((t) => Object.keys(DEVANAGARI_PLACES).some((p) => t.startsWith(p)));
    if (idx >= 0) {
      const token = tokens[idx]!;
      const key = Object.keys(DEVANAGARI_PLACES).find((p) => token.startsWith(p))!;
      location = DEVANAGARI_PLACES[key]!;
      tokens.splice(idx, 1);
    }
  }
  tokens = tokens.filter((t) => !NATIONWIDE.has(t));

  // ── Count — first standalone number (or number word) in 1..50 ──
  let creatorCount: number | null = null;
  tokens = tokens.filter((t) => {
    if (creatorCount !== null) return true;
    const n = /^\d{1,3}$/.test(t) ? Number(t) : NUMBER_WORDS[t];
    if (n && n >= 1 && n <= 50) {
      creatorCount = n;
      return false;
    }
    return true;
  });

  // ── Unlisted place after a preposition ("creators around Tokha") ──
  if (!location) {
    const words = normalize(audience.text).split(' ');
    for (let i = 0; i < words.length - 1; i++) {
      const candidate = words[i + 1]!;
      if (
        PLACE_PREPOSITIONS.has(words[i]!) &&
        /^\p{Script=Latin}{3,}$/u.test(candidate) &&
        !FILLER.has(candidate) &&
        !isTopicWord(candidate) &&
        !PLATFORM_ALIASES[candidate] &&
        !NATIONWIDE.has(candidate) &&
        tokens.includes(candidate)
      ) {
        location = titleCase(candidate);
        tokens = tokens.filter((t) => t !== candidate);
        break;
      }
    }
  }

  // ── Topic — whatever meaningful words remain ──
  const topicTokens = tokens
    .map((t) => DEVANAGARI_TOPICS[t] ?? t)
    .filter((t) => t.length >= 2 && !FILLER.has(t) && !/^\d+$/.test(t));
  const topic = topicTokens.length ? [...new Set(topicTokens)].join(' ') : null;

  return {
    query,
    topic,
    location,
    platforms: [...platforms],
    creatorCount,
    minFollowers: audience.min,
    maxFollowers: audience.max,
    sortByFollowers: audience.sort,
  };
}
