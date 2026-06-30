"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.languageMiddleware = languageMiddleware;
const SUPPORTED = new Set(['en', 'ne']);
/**
 * Reads the X-Language header sent by the client and attaches req.language.
 * Falls back to 'en' if the header is absent or not a supported language code.
 */
function languageMiddleware(req, _res, next) {
    const raw = req.headers['x-language'];
    const lang = Array.isArray(raw) ? raw[0] : raw;
    req.language = lang && SUPPORTED.has(lang) ? lang : 'en';
    next();
}
//# sourceMappingURL=language.js.map