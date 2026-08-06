import * as Sentry from '@sentry/react-native';

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(typeof value === 'string' ? value : JSON.stringify(value));
}

/**
 * Minimal logging wrapper — console in dev for immediate feedback, Sentry in
 * every environment so a caught-and-otherwise-swallowed error is still
 * visible in production instead of vanishing into a bare `.catch(() => {})`.
 * `context` should describe what operation failed (e.g. '[chat] send
 * message'), not restate the error message itself.
 */
export const logger = {
  info(context: string, extra?: Record<string, unknown>) {
    if (__DEV__) console.log(`[info] ${context}`, extra ?? '');
  },
  warn(context: string, extra?: Record<string, unknown>) {
    if (__DEV__) console.warn(`[warn] ${context}`, extra ?? '');
    Sentry.captureMessage(context, { level: 'warning', extra });
  },
  error(context: string, error?: unknown, extra?: Record<string, unknown>) {
    if (__DEV__) console.error(`[error] ${context}`, error ?? '', extra ?? '');
    Sentry.captureException(toError(error ?? context), { extra: { context, ...extra } });
  },
};
