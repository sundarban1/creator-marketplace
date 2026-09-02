import { createClient, type RedisClientType } from 'redis';
import { env } from './env';
import { logger } from './logger';

// A single shared Redis connection for app-level use — rate-limit store today,
// response/query caching next (see utils/cache.ts). Deliberately separate from
// the two clients src/socket.ts creates: the Socket.IO adapter needs its own
// dedicated pub/sub pair and must not share a connection with regular commands.
//
// Everything here is best-effort. When REDIS_URL is unset, or the server is
// unreachable, `getRedis()` returns null and every caller is written to carry
// on without it (in-memory rate-limit store, cache miss → DB). Redis is an
// optimisation layer, never a hard dependency.

let client: RedisClientType | null = null;
let connecting: Promise<RedisClientType | null> | null = null;
let disabled = !env.REDIS_URL;

async function connect(): Promise<RedisClientType | null> {
  if (disabled || !env.REDIS_URL) return null;

  const c: RedisClientType = createClient({
    url: env.REDIS_URL,
    socket: {
      // Give up reconnecting after a handful of tries rather than looping
      // forever — once disabled, callers fall back cleanly.
      reconnectStrategy: (retries) => (retries > 5 ? false : Math.min(retries * 200, 2000)),
    },
  });

  c.on('error', (err) => {
    // redis@4 emits 'error' on every failed reconnect attempt; log once at
    // warn, don't crash.
    logger.warn({ err: err instanceof Error ? err.message : err }, 'Redis client error');
  });
  c.on('end', () => {
    logger.warn('Redis connection closed — app-level Redis features are now disabled until restart');
    client = null;
    disabled = true;
  });

  try {
    await c.connect();
    logger.info('Redis connected — app-level caching / rate-limit store enabled');
    client = c;
    return c;
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'Redis connect failed — continuing without it');
    disabled = true;
    return null;
  }
}

/** Returns a connected client, or null if Redis is unconfigured/unavailable. */
export async function getRedis(): Promise<RedisClientType | null> {
  if (client) return client;
  if (disabled) return null;
  if (!connecting) connecting = connect().finally(() => { connecting = null; });
  return connecting;
}

/** Synchronous accessor — the already-connected client, or null. Never triggers a connect. */
export function getRedisSync(): RedisClientType | null {
  return client;
}

export function redisEnabled(): boolean {
  return !disabled;
}
