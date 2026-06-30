import { Request, Response, NextFunction } from 'express';
/**
 * Reads the X-Language header sent by the client and attaches req.language.
 * Falls back to 'en' if the header is absent or not a supported language code.
 */
export declare function languageMiddleware(req: Request, _res: Response, next: NextFunction): void;
//# sourceMappingURL=language.d.ts.map