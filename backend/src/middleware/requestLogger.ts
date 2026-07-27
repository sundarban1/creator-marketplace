import { randomUUID } from 'crypto';
import type { Request } from 'express';
import pinoHttp from 'pino-http';
import { logger } from '../config/logger';

// Registered before body parsing (in app.ts) so req.log is always set, even if
// a request fails to parse (malformed JSON) — errorHandler relies on req.log existing.
export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'];
    const id = existing ? String(existing) : randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} completed with ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} failed with ${res.statusCode}: ${err.message}`,
  customProps: (req: Request) => ({ userId: req.user?.id }),
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
});
