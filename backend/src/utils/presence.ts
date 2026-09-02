import { getRedis } from '../config/redis';

// A short read-through cache for "is this user online", over the cache Redis.
//
// The source of truth is still Socket.IO's adapter (io.in(`user:<id>`)
// .fetchSockets()), which with the Redis adapter fans a request out to every
// instance and waits for replies — comparatively expensive, and hit on every
// presence:subscribe, every disconnect and some notification gates. This caches
// the boolean for a few seconds and is invalidated the moment a socket for that
// user connects or disconnects, so transitions still show immediately.
//
// Best-effort: when the cache Redis is unavailable every call recomputes via
// `compute()` exactly as before.

const KEY = (userId: string) => `presence:online:${userId}`;
const TTL_SECONDS = 10;

export async function isUserOnlineCached(userId: string, compute: () => Promise<boolean>): Promise<boolean> {
  const client = await getRedis();
  if (client) {
    try {
      const hit = await client.get(KEY(userId));
      if (hit === '1') return true;
      if (hit === '0') return false;
    } catch {
      // fall through to compute
    }
  }
  const online = await compute();
  if (client) {
    try {
      await client.set(KEY(userId), online ? '1' : '0', { EX: TTL_SECONDS });
    } catch {
      // ignore — value already computed
    }
  }
  return online;
}

/** Drop the cached presence for a user — call whenever one of their sockets connects or disconnects. */
export async function invalidatePresence(userId: string): Promise<void> {
  const client = await getRedis();
  if (!client) return;
  try {
    await client.del(KEY(userId));
  } catch {
    // best-effort
  }
}
