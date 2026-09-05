import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import pinoHttp from 'pino-http';
import { logger } from '../config/logger';
import { LogEvent } from '../config/observability';

// Slow-request thresholds (ms) — a request that's merely slow isn't an error,
// but it's worth surfacing above plain `info` noise so it's easy to alert/filter
// on in the log sink without waiting for it to actually fail.
const SLOW_REQUEST_WARN_MS = 1000;
const SLOW_REQUEST_ERROR_MS = 3000;

function durationMs(res: Response): number | undefined {
  const startAt = res.locals.startAt as bigint | undefined;
  if (startAt === undefined) return undefined;
  return Number(process.hrtime.bigint() - startAt) / 1e6;
}

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
  // pino-http computes its own responseTime internally (not exposed to this
  // hook), so slow-request detection reads the timestamp requestTiming
  // middleware stamps on res.locals just before this middleware runs.
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    const ms = durationMs(res);
    if (ms !== undefined && ms > SLOW_REQUEST_ERROR_MS) return 'error';
    if (ms !== undefined && ms > SLOW_REQUEST_WARN_MS) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} completed with ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} failed with ${res.statusCode}: ${err.message}`,
  customSuccessObject: (_req: Request, res: Response, val: object) => ({
    ...val,
    event: LogEvent.API_REQUEST_COMPLETED,
    durationMs: durationMs(res),
  }),
  customErrorObject: (_req: Request, res: Response, _err: Error, val: object) => ({
    ...val,
    event: LogEvent.API_REQUEST_FAILED,
    durationMs: durationMs(res),
  }),
  customProps: (req: Request) => ({ userId: req.user?.id }),
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
});
