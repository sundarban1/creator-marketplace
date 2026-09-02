import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

// BullMQ job queues, running on the durable non-evicting queue Redis
// (REDIS_QUEUE_URL / kolab-queue). Entirely optional: when the URL is unset,
// getPushQueue() returns null, every enqueue helper returns false, and the
// caller does the work inline exactly as it does today.
//
// BullMQ requires its own ioredis connection (not the shared node-redis client
// in config/redis.ts) with `maxRetriesPerRequest: null` — a hard requirement
// for the blocking commands workers issue. Queue and Worker each get their own.

/** A fresh ioredis connection for BullMQ, or null when REDIS_QUEUE_URL is unset. */
export function createQueueConnection(): IORedis | null {
  if (!env.REDIS_QUEUE_URL) return null;
  const conn = new IORedis(env.REDIS_QUEUE_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  conn.on('error', (err) => logger.warn({ err: err.message }, 'BullMQ Redis connection error'));
  return conn;
}

export const QUEUE_NAMES = {
  push: 'push-notifications',
} as const;

let pushQueue: Queue | null = null;

/** Lazily-created push-notification queue. Null when REDIS_QUEUE_URL is unset. */
export function getPushQueue(): Queue | null {
  if (!env.REDIS_QUEUE_URL) return null;
  if (pushQueue) return pushQueue;
  const connection = createQueueConnection();
  if (!connection) return null;
  pushQueue = new Queue(QUEUE_NAMES.push, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  });
  return pushQueue;
}

/** Close queue resources on shutdown. Safe to call when nothing was created. */
export async function closeQueues(): Promise<void> {
  if (pushQueue) {
    await pushQueue.close().catch(() => {});
    pushQueue = null;
  }
}
