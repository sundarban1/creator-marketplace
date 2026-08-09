import { translate } from '@vitalets/google-translate-api';

const SUPPORTED_LANGS = new Set(['ne', 'en']);

// Nepali text is always Devanagari — detecting it directly (rather than
// calling the translate API to ask) means content already in the viewer's
// language costs nothing, in either direction. Business/creator-authored
// text is never a fixed source language (some users write profiles/campaigns
// in Nepali, most in English), so both directions need this same check.
const DEVANAGARI_RE = /[ऀ-ॿ]/;

// Simple in-memory cache keyed by `${lang}:${text}`
const cache = new Map<string, string>();

async function translateText(text: string, lang: string): Promise<string> {
  if (!text?.trim() || !SUPPORTED_LANGS.has(lang)) return text;
  const isDevanagari = DEVANAGARI_RE.test(text);
  // Already in the target script — skip the API call entirely.
  if ((lang === 'ne') === isDevanagari) return text;
  const key = `${lang}:${text}`;
  if (cache.has(key)) return cache.get(key)!;
  try {
    const result = await translate(text, { to: lang });
    cache.set(key, result.text);
    return result.text;
  } catch {
    return text; // fall back to original on network/rate error
  }
}

/**
 * Translate specified fields of an object in-place (returns a shallow copy).
 * String fields are translated directly; string-array fields are translated element-wise.
 */
export async function translateFields<T extends object>(obj: T, fields: string[], lang: string): Promise<T> {
  if (!SUPPORTED_LANGS.has(lang)) return obj;

  const result = { ...obj } as Record<string, unknown>;
  await Promise.all(
    fields.map(async (field) => {
      const val = (obj as Record<string, unknown>)[field];
      if (typeof val === 'string' && val) {
        result[field] = await translateText(val, lang);
      } else if (Array.isArray(val)) {
        result[field] = await Promise.all(
          val.map((item) => (typeof item === 'string' && item ? translateText(item, lang) : item)),
        );
      }
    }),
  );
  return result as T;
}

/**
 * Translate fields across an array of objects.
 */
export async function translateMany<T extends object>(items: T[], fields: string[], lang: string): Promise<T[]> {
  if (!SUPPORTED_LANGS.has(lang)) return items;
  return Promise.all(items.map((item) => translateFields(item, fields, lang)));
}

export type StoredTranslations = { en?: Record<string, unknown>; ne?: Record<string, unknown> };

/**
 * Computes both-language copies of `fields` from `data` — the payload meant
 * to be persisted into a record's `translations` JSON column so future reads
 * never wait on a live translate call (see scheduleTranslation/pickTranslated
 * below). Unlike translateFields (which translates FROM the object's current
 * language TO one target), this always produces both `en` and `ne`, since a
 * record's own language is whatever its author typed and isn't tracked
 * separately.
 */
export async function computeTranslations<T extends object>(data: T, fields: readonly string[]): Promise<StoredTranslations> {
  const en: Record<string, unknown> = {};
  const ne: Record<string, unknown> = {};
  await Promise.all(
    fields.map(async (field) => {
      const val = (data as Record<string, unknown>)[field];
      if (typeof val === 'string' && val) {
        const [enText, neText] = await Promise.all([translateText(val, 'en'), translateText(val, 'ne')]);
        en[field] = enText;
        ne[field] = neText;
      } else if (Array.isArray(val)) {
        const [enArr, neArr] = await Promise.all([
          Promise.all(val.map((v) => (typeof v === 'string' && v ? translateText(v, 'en') : v))),
          Promise.all(val.map((v) => (typeof v === 'string' && v ? translateText(v, 'ne') : v))),
        ]);
        en[field] = enArr;
        ne[field] = neArr;
      }
    }),
  );
  return { en, ne };
}

/**
 * Fire-and-forget: computes both-language copies of `fields` from `data` and
 * hands them to `persist` once ready, without making the caller (a
 * create/update request) wait on any translate-API round trip. Errors are
 * swallowed — `persist` never runs on failure, leaving a record's
 * `translations` column untouched so reads keep falling back to the raw
 * field until a future successful edit fills it in.
 */
export function scheduleTranslation<T extends object>(
  data: T,
  fields: readonly string[],
  persist: (translations: StoredTranslations) => Promise<unknown>,
): void {
  computeTranslations(data, fields)
    .then((translations) => persist(translations))
    .catch(() => {});
}

/**
 * Read-side counterpart of scheduleTranslation — swaps in the precomputed
 * copy for `lang` from a record's stored `translations` column, field by
 * field, falling back to the original (raw) value for any field that isn't
 * there yet (background job still in flight, or the record predates this
 * column and hasn't been backfilled).
 */
export function pickTranslated<T extends object>(obj: T, translations: unknown, fields: readonly string[], lang: string): T {
  if (lang !== 'en' && lang !== 'ne') return obj;
  const langCopy = (translations as StoredTranslations | null | undefined)?.[lang];
  if (!langCopy) return obj;
  const result = { ...obj } as Record<string, unknown>;
  for (const field of fields) {
    if (langCopy[field] !== undefined) result[field] = langCopy[field];
  }
  return result as T;
}
