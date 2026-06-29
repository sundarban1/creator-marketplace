import { translate } from '@vitalets/google-translate-api';

const SUPPORTED_LANGS = new Set(['ne']);

// Simple in-memory cache keyed by `${lang}:${text}`
const cache = new Map<string, string>();

async function translateText(text: string, lang: string): Promise<string> {
  if (!text?.trim() || !SUPPORTED_LANGS.has(lang)) return text;
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
  if (lang === 'en' || !SUPPORTED_LANGS.has(lang)) return obj;

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
  if (lang === 'en' || !SUPPORTED_LANGS.has(lang)) return items;
  return Promise.all(items.map((item) => translateFields(item, fields, lang)));
}
