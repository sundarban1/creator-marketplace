import { getQueueRedis } from '../config/redis';
import { logger } from '../config/logger';

// A fast-fail negative cache for OTP codes, backed by the durable queue Redis.
//
// Postgres (`otp_verifications`) stays the SOLE authority for accepting a code.
// This layer only ever lets a code that Redis positively knows is wrong be
// rejected without a database hit — which is exactly the brute-force / typo
// traffic you don't want touching Postgres. Every function is best-effort: when
// REDIS_QUEUE_URL is unset or Redis is unreachable it behaves as "Redis knows
// nothing" and the caller falls through to the Postgres query exactly as before.

const key = (userId: string) => `otp:${userId}`;

/** Mirror a freshly-issued OTP into Redis with the same expiry as its DB row. */
export async function cacheOtp(userId: string, code: string, expiresAt: Date): Promise<void> {
  const client = await getQueueRedis();
  if (!client) return;
  try {
    const ttlMs = expiresAt.getTime() - Date.now();
    if (ttlMs > 0) await client.set(key(userId), code, { PX: ttlMs });
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err, userId }, 'otp cache write failed');
  }
}

/**
 * True only when Redis positively holds a *different* code for `userId` — i.e.
 * the supplied code is definitely not the pending one and can be rejected
 * without a DB round-trip. A cache miss, a match, or any error returns false so
 * the caller still runs the authoritative Postgres check.
 */
export async function otpKnownWrong(userId: string, code: string): Promise<boolean> {
  const client = await getQueueRedis();
  if (!client) return false;
  try {
    const cached = await client.get(key(userId));
    return cached !== null && cached !== code;
  } catch {
    return false;
  }
}

/** Clear the cached OTP — called wherever the DB rows are cleared. */
export async function clearCachedOtp(userId: string): Promise<void> {
  const client = await getQueueRedis();
  if (!client) return;
  try {
    await client.del(key(userId));
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err, userId }, 'otp cache clear failed');
  }
}
