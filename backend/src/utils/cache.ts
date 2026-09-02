import { getRedis } from '../config/redis';
import { logger } from '../config/logger';

// A tiny read-through cache over the shared Redis connection. Everything here
// is best-effort: if Redis is unconfigured, unreachable, or a command throws,
// every function falls straight through to the source of truth. Redis is only
// ever an optimisation layer — never where correct data lives.
//
// Only cache PUBLIC, non-personalised reads with this. Never authed/private
// responses. Keep TTLs short for anything that changes, and call `invalidate`
// (or `invalidatePrefix`) from the write path so a change shows up immediately
// instead of waiting out the TTL.

const KEY_PREFIX = 'cache:';

// Don't cache oversized payloads. Redis on the smallest plans is ~25 MB total;
// a single careless call site caching a large list forever could crowd out the
// rate-limit counters and the Socket.IO adapter. Anything bigger than this is
// served straight from the loader and never written. Pair this with a
// `volatile-lru` maxmemory-policy on the Redis instance so that even if it does
// fill, it evicts old (TTL'd) keys rather than rejecting writes.
const MAX_CACHED_BYTES = 256 * 1024;

/** Read `key` from cache; on miss, run `loader()`, store its result for `ttlSeconds`, and return it. */
export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const client = await getRedis();
  const fullKey = KEY_PREFIX + key;

  if (client) {
    try {
      const hit = await client.get(fullKey);
      if (hit !== null) return JSON.parse(hit) as T;
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : err, key }, 'cache read failed — falling through to loader');
    }
  }

  const value = await loader();

  if (client && value !== undefined) {
    try {
      const serialized = JSON.stringify(value);
      if (Buffer.byteLength(serialized) <= MAX_CACHED_BYTES) {
        // `EX` sets a TTL so the key is evictable under a volatile-lru policy
        // and self-cleans even if the write path never calls invalidate().
        await client.set(fullKey, serialized, { EX: ttlSeconds });
      } else {
        logger.warn({ key, bytes: Buffer.byteLength(serialized) }, 'cache skip — payload over size cap');
      }
    } catch (err) {
      // Includes Redis OOM ("OOM command not allowed…") when the instance is
      // full under a noeviction policy — degrade to no-cache, never throw.
      logger.warn({ err: err instanceof Error ? err.message : err, key }, 'cache write failed — value still returned');
    }
  }

  return value;
}

/** Drop one or more exact cache keys. Safe to call when Redis is down (no-op). */
export async function invalidate(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const client = await getRedis();
  if (!client) return;
  try {
    await client.del(keys.map((k) => KEY_PREFIX + k));
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err, keys }, 'cache invalidate failed');
  }
}

/**
 * Drop every cache key beginning with `prefix` (e.g. all pages of a listing).
 * Uses SCAN, not KEYS, so it never blocks Redis. Best-effort.
 */
export async function invalidatePrefix(prefix: string): Promise<void> {
  const client = await getRedis();
  if (!client) return;
  const match = `${KEY_PREFIX}${prefix}*`;
  try {
    for await (const key of client.scanIterator({ MATCH: match, COUNT: 100 })) {
      const keys = Array.isArray(key) ? key : [key];
      if (keys.length) await client.del(keys);
    }
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err, prefix }, 'cache invalidatePrefix failed');
  }
}
