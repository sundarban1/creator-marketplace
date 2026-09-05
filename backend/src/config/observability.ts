import * as Sentry from '@sentry/node';
import { logger } from './logger';
import { getRequestContext } from '../middleware/requestContext';

// Technical/infra event names only — business events that already have a DB
// audit trail (payments, escrow, disputes, ...) reuse ActivityAction/AuditAction
// from modules/logging/logging.constants.ts instead of a parallel vocabulary.
export const LogEvent = {
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGIN_FAILED: 'auth.login_failed',
  API_REQUEST_COMPLETED: 'api.request.completed',
  API_REQUEST_FAILED: 'api.request.failed',
  PAYMENT_ESEWA_STATUS_CHECK: 'payment.esewa.status_check',
  PAYMENT_ESEWA_STATUS_CHECK_FAILED: 'payment.esewa.status_check_failed',
  PAYMENT_KHALTI_INITIATED: 'payment.khalti.initiated',
  PAYMENT_KHALTI_INITIATE_FAILED: 'payment.khalti.initiate_failed',
  PAYMENT_KHALTI_LOOKUP: 'payment.khalti.lookup',
  PAYMENT_KHALTI_LOOKUP_FAILED: 'payment.khalti.lookup_failed',
  PAYMENT_KHALTI_CALLBACK_RECEIVED: 'payment.khalti.callback_received',
  PAYMENT_CALLBACK_ALREADY_PROCESSED: 'payment.callback_already_processed',
  PAYMENT_AMOUNT_MISMATCH: 'payment.amount_mismatch',
  JOB_COMPLETED: 'job.completed',
  JOB_FAILED: 'job.failed',
  ESCROW_SWEEP_STEP_FAILED: 'escrow.sweep_step_failed',
  REDIS_CONNECTION_DISABLED: 'redis.connection_disabled',
  SOCKET_AUTHENTICATION_FAILED: 'socket.authentication_failed',
  SOCKET_MESSAGE_SEND_FAILED: 'socket.message_send_failed',
  HTTP_SERVER_ERROR: 'http.server_error',
  HTTP_UNHANDLED_ERROR: 'http.unhandled_error',
} as const;

export type LogEventValue = typeof LogEvent[keyof typeof LogEvent];

// Sentry issues are cheap to create and expensive to triage — a retried BullMQ
// job, a flapping Redis reconnect, or a hot 500 loop would otherwise open one
// issue per occurrence. This suppresses repeat reports of the "same" failure
// (same event + same error message) for a short window; every occurrence is
// still logged via Pino regardless; only the Sentry call is throttled.
const DEDUPE_WINDOW_MS = 5 * 60 * 1000;
const recentlyReported = new Map<string, number>();

function shouldReportToSentry(fingerprint: string): boolean {
  const now = Date.now();
  const expiresAt = recentlyReported.get(fingerprint);
  if (expiresAt && expiresAt > now) return false;
  recentlyReported.set(fingerprint, now + DEDUPE_WINDOW_MS);
  // Bound the map — an unbounded set of distinct fingerprints (e.g. messages
  // that embed an id) would otherwise leak memory over a long-running process.
  if (recentlyReported.size > 500) {
    const oldestKey = recentlyReported.keys().next().value;
    if (oldestKey !== undefined) recentlyReported.delete(oldestKey);
  }
  return true;
}

export interface ReportErrorContext {
  /** Machine-readable event name — from LogEvent, or an ActivityAction/AuditAction for a business event. */
  event: string;
  /** Actor performing the action, if known — attached to Sentry as the user. */
  actorId?: string;
  [key: string]: unknown;
}

// The single place the app talks to Sentry from — deduped, request-id/context
// tagged, and isolated so a Sentry outage/misconfiguration never throws. Does
// NOT log; call sites that already have their own logger.error/logError call
// (middleware/error.ts, socket.ts) use this directly to avoid a duplicate log
// line. New call sites with no existing log statement should use reportError()
// below instead.
export function reportToSentry(error: unknown, context: ReportErrorContext): void {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const fingerprint = `${context.event}:${message}`;
    if (!shouldReportToSentry(fingerprint)) return;

    const requestId = getRequestContext()?.requestId;
    Sentry.withScope((scope) => {
      scope.setTag('event', context.event);
      if (requestId) scope.setTag('requestId', requestId);
      if (context.actorId) scope.setUser({ id: context.actorId });
      scope.setContext('details', context as Record<string, unknown>);
      Sentry.captureException(error);
    });
  } catch (reportingErr) {
    try {
      logger.error({ err: reportingErr }, 'reportToSentry itself failed');
    } catch {
      /* genuinely nothing left to do */
    }
  }
}

// Logs via Pino, then reports to Sentry (deduped) — for call sites that don't
// already have their own logger.error call. Never throws: a logging/Sentry
// failure must never break the request or job that triggered it.
export function reportError(error: unknown, context: ReportErrorContext): void {
  try {
    logger.error({ err: error, ...context }, context.event);
  } catch (loggingErr) {
    try {
      logger.error({ err: loggingErr }, 'reportError logging failed');
    } catch {
      /* genuinely nothing left to do */
    }
  }
  reportToSentry(error, context);
}
