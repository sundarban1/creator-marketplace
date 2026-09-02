import { getPushQueue } from '../config/queue';
import { logger } from '../config/logger';

// Job payloads for the push-notification queue. `deliver` does the actual
// token-fetch + Expo send; `receipt` is the delayed check that follows a
// successful send (replacing the old in-process setTimeout, which was lost on
// every deploy). Both are also runnable inline — see notification.service.ts.

export type PushDeliverJob = {
  kind: 'deliver';
  userId: string;
  title: string;
  body: string;
  chatBadgeCount: number;
  data?: Record<string, string>;
};

export type PushReceiptJob = {
  kind: 'receipt';
  userId: string;
  pushTokenId: string;
  ticketId: string;
};

export type PushJob = PushDeliverJob | PushReceiptJob;

const RECEIPT_CHECK_DELAY_MS = 20_000;

/** Queue a push send. Returns false if the queue is unavailable (send inline). */
export async function enqueuePushDeliver(job: Omit<PushDeliverJob, 'kind'>): Promise<boolean> {
  const queue = getPushQueue();
  if (!queue) return false;
  try {
    await queue.add('deliver', { kind: 'deliver', ...job } satisfies PushDeliverJob);
    return true;
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err, userId: job.userId }, 'push deliver enqueue failed — sending inline');
    return false;
  }
}

/** Queue a delayed receipt check. Returns false if unavailable (use setTimeout). */
export async function enqueuePushReceiptCheck(job: Omit<PushReceiptJob, 'kind'>): Promise<boolean> {
  const queue = getPushQueue();
  if (!queue) return false;
  try {
    await queue.add('receipt', { kind: 'receipt', ...job } satisfies PushReceiptJob, { delay: RECEIPT_CHECK_DELAY_MS });
    return true;
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'push receipt-check enqueue failed — using setTimeout');
    return false;
  }
}
