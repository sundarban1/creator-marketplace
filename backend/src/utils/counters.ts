import { getQueueRedis } from '../config/redis';
import { logger } from '../config/logger';

// Write-behind counters. High-frequency "+1" statistics (profile views today,
// more later) are buffered in the durable queue Redis and flushed to Postgres
// in one batched write per id by a cron job, instead of one UPDATE per event on
// the request path.
//
// Best-effort, like everything else Redis-backed here: when REDIS_QUEUE_URL is
// unset or the server is unreachable, bufferIncrement() returns false and the
// caller persists the increment itself exactly as before. Nothing is lost on a
// deploy either — the queue Redis is `noeviction` and survives restarts, so
// buffered counts are picked up by whichever instance next runs the flush.

const KEY_PREFIX = 'counters:';

/**
 * Buffer a `+by` increment for `namespace`/`id`. Returns true if it was buffered
 * (the flush job will apply it to Postgres later), false if the queue Redis is
 * unavailable and the caller should persist the increment itself. Never throws.
 */
export async function bufferIncrement(namespace: string, id: string, by = 1): Promise<boolean> {
  const client = await getQueueRedis();
  if (!client) return false;
  try {
    await client.hIncrBy(KEY_PREFIX + namespace, id, by);
    return true;
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err, namespace, id }, 'counter buffer failed — caller persists directly');
    return false;
  }
}

/**
 * The count currently buffered (not yet flushed to Postgres) for `namespace`/
 * `id`. Add this to the persisted total when a read needs to be exact. Returns 0
 * on a miss, or when the queue Redis is unavailable. Never throws.
 */
export async function peekBufferedCount(namespace: string, id: string): Promise<number> {
  const client = await getQueueRedis();
  if (!client) return 0;
  try {
    const raw = await client.hGet(KEY_PREFIX + namespace, id);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * Drain the buffered counts for `namespace`, calling `persist(id, count)` once
 * per id with a positive pending count, then subtracting exactly what was
 * persisted. Increments that arrive mid-flush are kept for the next cycle, and a
 * failed `persist()` leaves that id's count intact to retry.
 *
 * Takes a short Redis lock so that with multiple kolab-api instances only one
 * flushes per cycle (otherwise two instances could both persist the same count).
 * Never throws.
 */
export async function flushCounters(
  namespace: string,
  persist: (id: string, count: number) => Promise<void>,
  lockTtlSec = 55,
): Promise<void> {
  const client = await getQueueRedis();
  if (!client) return;

  const key = KEY_PREFIX + namespace;
  const lockKey = `${key}:flush-lock`;

  let locked = false;
  try {
    locked = (await client.set(lockKey, '1', { NX: true, EX: lockTtlSec })) === 'OK';
  } catch {
    return;
  }
  if (!locked) return; // another instance is flushing this cycle

  try {
    const pending = await client.hGetAll(key);
    for (const [id, countStr] of Object.entries(pending)) {
      const count = parseInt(countStr, 10);
      if (!Number.isFinite(count) || count <= 0) {
        if (countStr === '0') await client.hDel(key, id).catch(() => {});
        continue;
      }
      try {
        await persist(id, count);
        await client.hIncrBy(key, id, -count).catch(() => {});
      } catch (err) {
        logger.warn({ err: err instanceof Error ? err.message : err, namespace, id, count }, 'counter flush persist failed — retrying next cycle');
      }
    }
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err, namespace }, 'counter flush failed');
  } finally {
    await client.del(lockKey).catch(() => {});
  }
}
