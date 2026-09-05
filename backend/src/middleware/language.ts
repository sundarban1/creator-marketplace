import { Request, Response, NextFunction } from 'express';
import { getRequestContext } from './requestContext';

const SUPPORTED = new Set(['en', 'ne']);

/**
 * Reads the X-Language header sent by the client and attaches req.language.
 * Falls back to 'en' if the header is absent or not a supported language code.
 * Also mirrors it into the request's AsyncLocalStorage context (see
 * requestContext.ts) so code with no access to `req` — utils/i18n's getDict()
 * in particular — can still read the current language.
 */
export function languageMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const raw = req.headers['x-language'];
  const lang = Array.isArray(raw) ? raw[0] : raw;
  req.language = lang && SUPPORTED.has(lang) ? lang : 'en';

  const ctx = getRequestContext();
  if (ctx) ctx.language = req.language;

  next();
}
