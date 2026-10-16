import { randomUUID } from 'crypto';
import { getQueueRedis } from '../config/redis';
import { logger } from '../config/logger';

// Single-runner guard for cron jobs. node-cron fires on every API instance, and
// a slow run can still be going when the next tick arrives — this makes sure
// only one run of `name` executes at a time across all instances.
//
// Two layers: an in-process flag (always on, so a slow run never overlaps the
// next tick on the same instance) and a Redis SET-NX lease on the durable queue
// Redis (cross-instance). Best-effort like everything else Redis-backed: when
// REDIS_QUEUE_URL is unset or unreachable the job still runs, guarded only
// in-process — the jobs that move money are also row-locked and status-guarded,
// so this is defence-in-depth rather than the only protection.

const running = new Set<string>();

/** Run `fn` unless another run of `name` holds the lock. Returns whether it ran. */
export async function withJobLock(name: string, ttlSec: number, fn: () => Promise<void>): Promise<boolean> {
  if (running.has(name)) return false;
  running.add(name);
  try {
    const client = await getQueueRedis();
    const key = `job-lock:${name}`;
    const token = randomUUID();

    if (client) {
      let acquired = true;
      try {
        acquired = (await client.set(key, token, { NX: true, EX: ttlSec })) === 'OK';
      } catch (err) {
        // Redis blip — fall through to running unguarded, same as no Redis.
        logger.warn({ err: err instanceof Error ? err.message : err, name }, 'job lock unavailable — running without it');
      }
      if (!acquired) return false;
    }

    try {
      await fn();
    } finally {
      // Release only our own lease — if the TTL lapsed and another instance
      // took it over, leave theirs alone.
      if (client) {
        await client
          .eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end", { keys: [key], arguments: [token] })
          .catch(() => {});
      }
    }
    return true;
  } finally {
    running.delete(name);
  }
}
