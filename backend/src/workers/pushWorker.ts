import { Worker } from 'bullmq';
import { QUEUE_NAMES, createQueueConnection } from '../config/queue';
import { deliverExpoPush, checkPushReceipt } from '../modules/notifications/notification.service';
import { logger } from '../config/logger';
import type { PushJob } from '../queues/pushQueue';

let worker: Worker | null = null;

// Processes the push-notification queue in the API process (same model as the
// node-cron jobs). No-op when REDIS_QUEUE_URL is unset — sends then run inline
// at the call site and nothing is ever enqueued.
export function startPushWorker(): void {
  const connection = createQueueConnection();
  if (!connection) return;

  worker = new Worker<PushJob>(
    QUEUE_NAMES.push,
    async (job) => {
      const payload = job.data;
      if (payload.kind === 'deliver') {
        await deliverExpoPush(payload.userId, payload.title, payload.body, payload.chatBadgeCount, payload.data);
      } else {
        await checkPushReceipt(payload.userId, payload.pushTokenId, payload.ticketId);
      }
    },
    { connection, concurrency: 5 },
  );

  worker.on('failed', (job, err) => {
    logger.warn({ jobId: job?.id, name: job?.name, err: err.message }, 'push job failed');
  });
  worker.on('error', (err) => logger.warn({ err: err.message }, 'push worker error'));

  logger.info('Push notification worker started');
}

/** Stop the worker on shutdown. Safe to call when it never started. */
export async function stopPushWorker(): Promise<void> {
  if (worker) {
    await worker.close().catch(() => {});
    worker = null;
  }
}
