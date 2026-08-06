// Must be the very first thing app.ts imports — Sentry's Node SDK instruments
// other modules (express, http, ...) as they're required, so it has to run
// before anything else pulls those in. Importing ./config/env here (rather
// than app.ts doing it separately) keeps dotenv/env validation happening
// first too, in the same original order.
import { env } from './config/env';
import * as Sentry from '@sentry/node';

// Same fields config/logger.ts already redacts from Pino logs — kept in one
// place there conceptually, mirrored here since Sentry's scrubbing hook has a
// different shape (an Event object, not a log line) and can't share the exact
// same redact() call.
const SENSITIVE_KEY_PATTERN = /password|token|otp|secret|authorization|cookie/i;

function scrubObject<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value as object)) return value;
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((v) => scrubObject(v, seen)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : scrubObject(val, seen);
  }
  return result as T;
}

Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    if (event.extra) event.extra = scrubObject(event.extra);
    if (event.contexts) event.contexts = scrubObject(event.contexts);
    return event;
  },
});
