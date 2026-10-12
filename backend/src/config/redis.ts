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

    let downSince: number | null = null;
    let alerted = false;
    let everReady = false;

    const c: RedisClientType = createClient({
      url,
      // Fail commands immediately while reconnecting instead of parking them in
      // the offline queue — callers already treat a throw as "no Redis" and fall
      // back, whereas a queued command would hang the request until reconnect.
      disableOfflineQueue: true,
      // Managed Redis (Render Key Value) and the network in between silently
      // drop idle TCP connections; the next command then hits a dead socket and
      // the reconnect surfaces as "Connection timeout". A periodic PING keeps
      // the connection warm so it isn't reaped in the first place.
      pingInterval: 60_000,
      socket: {
        connectTimeout: 10_000,
        // Before the first successful connect, give up after a few tries so
        // boot (and the first get()) never waits on a Redis that isn't there.
        // Once it has been up, keep retrying with capped backoff — a short
        // network blip used to disable this Redis until the next deploy.
        // While reconnecting, get() returns null and callers fall back.
        reconnectStrategy: (retries) => {
          if (!everReady) return retries > 5 ? false : Math.min(retries * 200, 2000);
          return Math.min(250 * 2 ** Math.min(retries, 7), 30_000);
        },
      },
    });

    c.on('error', (err) => {
      // redis emits 'error' on every failed reconnect attempt; log at warn,
      // don't crash.
      logger.warn({ err: err instanceof Error ? err.message : err, redis: label }, 'Redis client error');
      downSince ??= Date.now();
      // One Sentry alert per outage, and only once it's clearly not a blip.
      if (!alerted && Date.now() - downSince > 5 * 60_000) {
        alerted = true;
        reportError(new Error(`Redis "${label}" unreachable for over 5 minutes`), { event: LogEvent.REDIS_CONNECTION_DISABLED, redis: label });
      }
    });
    c.on('ready', () => {
      everReady = true;
      if (downSince !== null) logger.info({ redis: label, downMs: Date.now() - downSince }, 'Redis reconnected');
      downSince = null;
      alerted = false;
    });
    c.on('end', () => {
      // Reached on an explicit quit()/destroy(), or when the initial connect
      // gives up — once connected, reconnects never give up.
      logger.warn({ redis: label }, 'Redis connection closed — this Redis is disabled until restart');
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
      // Connected but mid-reconnect → behave as "no Redis" so callers fall back.
      if (client) return Promise.resolve(client.isReady ? client : null);
      if (disabled) return Promise.resolve(null);
      if (!connecting) connecting = connect().finally(() => { connecting = null; });
      return connecting;
    },
    getSync() {
      return client?.isReady ? client : null;
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
