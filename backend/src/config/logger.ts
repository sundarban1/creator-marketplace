import pino from 'pino';
import { env } from './env';
import { getRequestContext } from '../middleware/requestContext';

const isProduction = env.NODE_ENV === 'production';

export const logger = pino({
  level: env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
  // Every log line carries these without touching any of the ~180 existing
  // call sites — service/environment identify the source in a shared sink
  // (Render Log Stream → Better Stack etc.), requestId is pulled from the
  // AsyncLocalStorage context requestContext.ts already populates per-request
  // so it rides along even in deeply-nested service/job code that never sees
  // `req` directly. Kept as a `mixin` (evaluated per log call) rather than
  // `base` (fixed at construction) specifically because requestId changes
  // per-request while service/environment don't.
  base: { service: 'kolab-api', environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV },
  mixin() {
    const requestId = getRequestContext()?.requestId;
    return requestId ? { requestId } : {};
  },
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
      '*.identityToken',
      '*.authorizationCode',
      '*.appleLinkToken',
      '*.secretKey',
      '*.apiKey',
      '*.privateKey',
      '*.mpin',
      '*.pin',
    ],
    censor: '[REDACTED]',
  },
});
