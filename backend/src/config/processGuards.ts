import * as Sentry from '@sentry/node';
import { logger } from './logger';

// Last-resort visibility for errors that escape every request/job handler.
// Without these, an unhandled rejection silently terminates the Node process
// on Render (Node's default since v15) with nothing in the log stream but the
// container restarting — impossible to diagnose after the fact. Registered
// once, from app.ts, right after ./instrument (so Sentry is already wired).
//
// Sentry installs its own uncaughtException/unhandledRejection integrations in
// instrument.ts; these run alongside them (Node fans an event out to every
// listener). We add a guaranteed Pino line — which lands in the Render log
// stream with the full stack — before anything else decides to exit.
let installed = false;

export function installProcessGuards(): void {
  if (installed) return;
  installed = true;

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error(
      { err: reason instanceof Error ? reason : new Error(String(reason)) },
      'Unhandled promise rejection — investigate; process kept alive',
    );
    Sentry.captureException(reason);
    // Deliberately NOT re-thrown / not exiting: a stray rejection in a
    // fire-and-forget path (push, socket emit, analytics) should be loud, not
    // fatal. A genuinely unrecoverable one will surface again as a failed
    // request with its own handling.
  });

  process.on('uncaughtException', (err: Error) => {
    logger.fatal({ err }, 'Uncaught exception — flushing telemetry and exiting');
    Sentry.captureException(err);
    // The process is in an undefined state — flush, then let it die so Render
    // restarts a clean instance.
    void Sentry.flush(2000).finally(() => process.exit(1));
  });
}
