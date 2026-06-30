"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateFields = translateFields;
exports.translateMany = translateMany;
const google_translate_api_1 = require("@vitalets/google-translate-api");
const SUPPORTED_LANGS = new Set(['ne']);
// Simple in-memory cache keyed by `${lang}:${text}`
const cache = new Map();
async function translateText(text, lang) {
    if (!text?.trim() || !SUPPORTED_LANGS.has(lang))
        return text;
    const key = `${lang}:${text}`;
    if (cache.has(key))
        return cache.get(key);
    try {
        const result = await (0, google_translate_api_1.translate)(text, { to: lang });
        cache.set(key, result.text);
        return result.text;
    }
    catch {
        return text; // fall back to original on network/rate error
    }
}
/**
 * Translate specified fields of an object in-place (returns a shallow copy).
 * String fields are translated directly; string-array fields are translated element-wise.
 */
async function translateFields(obj, fields, lang) {
    if (lang === 'en' || !SUPPORTED_LANGS.has(lang))
        return obj;
    const result = { ...obj };
    await Promise.all(fields.map(async (field) => {
        const val = obj[field];
        if (typeof val === 'string' && val) {
            result[field] = await translateText(val, lang);
        }
        else if (Array.isArray(val)) {
            result[field] = await Promise.all(val.map((item) => (typeof item === 'string' && item ? translateText(item, lang) : item)));
        }
    }));
    return result;
}
/**
 * Translate fields across an array of objects.
 */
async function translateMany(items, fields, lang) {
    if (lang === 'en' || !SUPPORTED_LANGS.has(lang))
        return items;
    return Promise.all(items.map((item) => translateFields(item, fields, lang)));
}
//# sourceMappingURL=translation.js.map