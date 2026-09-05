import { Worker } from 'bullmq';
import { QUEUE_NAMES, createQueueConnection } from '../config/queue';
import { deliverExpoPush, checkPushReceipt } from '../modules/notifications/notification.service';
import { logger } from '../config/logger';
import { reportError, LogEvent } from '../config/observability';
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

  worker.on('completed', (job) => {
    const durationMs = job.finishedOn && job.processedOn ? job.finishedOn - job.processedOn : undefined;
    logger.info({ event: LogEvent.JOB_COMPLETED, queue: QUEUE_NAMES.push, jobId: job.id, name: job.name, attempt: job.attemptsMade, durationMs }, 'push job completed');
  });
  worker.on('failed', (job, err) => {
    const durationMs = job?.finishedOn && job?.processedOn ? job.finishedOn - job.processedOn : undefined;
    // Deduped by queue+job+message — a job's own retries (attempts: 3, see
    // config/queue.ts) would otherwise open a fresh Sentry issue per attempt.
    reportError(err, { event: LogEvent.JOB_FAILED, queue: QUEUE_NAMES.push, jobId: job?.id, name: job?.name, attempt: job?.attemptsMade, durationMs });
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
