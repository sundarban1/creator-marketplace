import { describe, it, expect, vi, beforeEach } from 'vitest';

const sentry = vi.hoisted(() => ({
  captureException: vi.fn(),
  withScope: vi.fn((cb: (scope: any) => void) => cb({ setTag: vi.fn(), setUser: vi.fn(), setContext: vi.fn() })),
}));
vi.mock('@sentry/node', () => sentry);

const log = vi.hoisted(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }));
vi.mock('./logger', () => ({ logger: log }));

import { reportError, reportToSentry, LogEvent } from './observability';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('reportError', () => {
  it('logs via pino and reports the exception to Sentry', () => {
    const err = new Error('boom');
    reportError(err, { event: LogEvent.JOB_FAILED, jobId: '1' });

    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ err, event: LogEvent.JOB_FAILED, jobId: '1' }),
      LogEvent.JOB_FAILED,
    );
    expect(sentry.captureException).toHaveBeenCalledWith(err);
  });

  it('dedupes repeated Sentry reports for the same event+message but still logs every time', () => {
    const err = new Error('same failure');
    reportError(err, { event: LogEvent.JOB_FAILED });
    reportError(err, { event: LogEvent.JOB_FAILED });
    reportError(err, { event: LogEvent.JOB_FAILED });

    expect(log.error).toHaveBeenCalledTimes(3);
    expect(sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('does not dedupe across different events for the same error message', () => {
    const err = new Error('shared message');
    reportError(err, { event: LogEvent.JOB_FAILED });
    reportError(err, { event: LogEvent.PAYMENT_AMOUNT_MISMATCH });

    expect(sentry.captureException).toHaveBeenCalledTimes(2);
  });

  it('never throws even when Sentry itself throws', () => {
    sentry.withScope.mockImplementationOnce(() => {
      throw new Error('sentry is down');
    });

    expect(() => reportError(new Error('boom'), { event: 'unique.event.1' })).not.toThrow();
  });

  it('never throws even when logging itself throws', () => {
    log.error.mockImplementationOnce(() => {
      throw new Error('logger is down');
    });

    expect(() => reportError(new Error('boom'), { event: 'unique.event.2' })).not.toThrow();
  });
});

describe('reportToSentry', () => {
  it('reports without emitting a duplicate log line', () => {
    reportToSentry(new Error('already logged elsewhere'), { event: 'unique.event.3' });

    expect(sentry.captureException).toHaveBeenCalledTimes(1);
    expect(log.error).not.toHaveBeenCalled();
  });

  it('never throws when Sentry throws', () => {
    sentry.withScope.mockImplementationOnce(() => {
      throw new Error('sentry is down');
    });

    expect(() => reportToSentry(new Error('boom'), { event: 'unique.event.4' })).not.toThrow();
  });
});
