import { AsyncLocalStorage } from 'async_hooks';
import type { NextFunction, Request, Response } from 'express';

export interface RequestContext {
  ip?: string;
  userAgent?: string;
  deviceId?: string;
  requestId?: string;
  // Set by middleware/language.ts once it runs (this middleware is registered
  // before it, ahead of body parsing — see below) — lets utils/i18n's getDict()
  // read the current request's language from deep inside services/utils that
  // only receive (userId, input), never `req`, without threading a `lang` param
  // through every function signature down to them.
  language?: string;
}

const als = new AsyncLocalStorage<RequestContext>();

// Lets activity/audit logging (called from deep inside service methods that only
// receive (userId, input), never `req`) read IP/UA/device without threading new
// params through every call site. Registered right after requestLogger so req.id
// (set by pino-http's genReqId) is already available.
export function requestContext(req: Request, _res: Response, next: NextFunction) {
  const store: RequestContext = {
    ip:        req.ip,
    userAgent: req.headers['user-agent'],
    deviceId:  (req.headers['x-device-id'] as string | undefined) ?? undefined,
    requestId: req.id !== undefined ? String(req.id) : undefined,
  };
  als.run(store, next);
}

export function getRequestContext(): RequestContext | undefined {
  return als.getStore();
}

export function getRequestLanguage(): string {
  return getRequestContext()?.language ?? 'en';
}
