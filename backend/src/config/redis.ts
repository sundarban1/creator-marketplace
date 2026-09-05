import { createClient, type RedisClientType } from 'redis';
import { env } from './env';
import { logger } from './logger';
import { reportError, LogEvent } from './observability';

// App-level Redis connections. There are two, deliberately separate:
//
//   getRedis()      → REDIS_URL (kolab-cache): rate-limit store, response cache
//                     (utils/cache.ts), profile-read cache. Evictable.
//   getQueueRedis() → REDIS_QUEUE_URL (kolab-queue): BullMQ, the notification
//                     queue, the OTP fast path, counters. noeviction.
//
// Both are also separate from the two clients src/socket.ts creates: the
// Socket.IO adapter needs its own dedicated pub/sub pair and must not share a
// connection with regular commands.
//
// Everything here is best-effort. When a URL is unset, or the server is
// unreachable, the accessor returns null and every caller is written to carry
// on without it (in-memory rate-limit store, cache miss → DB, queue → inline
// work, OTP → Postgres). Redis is an optimisation layer, never a hard
// dependency.

interface ManagedClient {
  /** Returns a connected client, or null if this Redis is unconfigured/unavailable. */
  get(): Promise<RedisClientType | null>;
  /** The already-connected client, or null. Never triggers a connect. */
  getSync(): RedisClientType | null;
  /** False once the URL is unset or the connection has been given up on. */
  enabled(): boolean;
}

function managedClient(url: string | undefined, label: string): ManagedClient {
  let client: RedisClientType | null = null;
  let connecting: Promise<RedisClientType | null> | null = null;
  let disabled = !url;

  async function connect(): Promise<RedisClientType | null> {
    if (disabled || !url) return null;

    const c: RedisClientType = createClient({
      url,
      socket: {
        // Give up reconnecting after a handful of tries rather than looping
        // forever — once disabled, callers fall back cleanly.
        reconnectStrategy: (retries) => (retries > 5 ? false : Math.min(retries * 200, 2000)),
      },
    });

    c.on('error', (err) => {
      // redis@4 emits 'error' on every failed reconnect attempt; log once at
      // warn, don't crash.
      logger.warn({ err: err instanceof Error ? err.message : err, redis: label }, 'Redis client error');
    });
    c.on('end', () => {
      logger.warn({ redis: label }, 'Redis connection closed — this Redis is disabled until restart');
      // A warn alone is easy to miss in a log stream — this Redis is now down
      // until the process restarts, which is worth a Sentry alert (deduped so
      // it fires once per instance-lifetime, not on every stray 'end' event).
      reportError(new Error(`Redis "${label}" disabled — reconnect attempts exhausted`), { event: LogEvent.REDIS_CONNECTION_DISABLED, redis: label });
      client = null;
      disabled = true;
    });

    try {
      await c.connect();
      logger.info({ redis: label }, 'Redis connected');
      client = c;
      return c;
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : err, redis: label }, 'Redis connect failed — continuing without it');
      disabled = true;
      return null;
    }
  }

  return {
    get() {
      if (client) return Promise.resolve(client);
      if (disabled) return Promise.resolve(null);
      if (!connecting) connecting = connect().finally(() => { connecting = null; });
      return connecting;
    },
    getSync() {
      return client;
    },
    enabled() {
      return !disabled;
    },
  };
}

const cache = managedClient(env.REDIS_URL, 'cache');
const queue = managedClient(env.REDIS_QUEUE_URL, 'queue');

/** Cache/rate-limit Redis (REDIS_URL / kolab-cache). Null when unconfigured or down. */
export const getRedis = cache.get;
export const getRedisSync = cache.getSync;
export const redisEnabled = cache.enabled;

/** Queue/durable Redis (REDIS_QUEUE_URL / kolab-queue). Null when unconfigured or down. */
export const getQueueRedis = queue.get;
export const getQueueRedisSync = queue.getSync;
export const queueRedisEnabled = queue.enabled;
