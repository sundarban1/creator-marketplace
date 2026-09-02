import { PrismaClient } from '@prisma/client';
import { env } from './config/env';
import { logger } from './config/logger';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// The backend runs on more than one instance (see render.yaml), and Prisma's
// default pool size is (2 × CPU) + 1 *per instance* — plus the 2 dedicated
// Redis connections each instance opens for the Socket.IO adapter. On Render's
// smaller Postgres plans that ceiling is low enough that a rolling deploy
// (old + new instances briefly overlapping) can trip `too many connections`.
// Pin a conservative per-instance pool unless the DATABASE_URL already sets
// one (e.g. when pointed at a transaction-mode pooler). Tune together with the
// instance count so instances × POOL stays comfortably under the DB ceiling.
const DEFAULT_CONNECTION_LIMIT = env.DB_CONNECTION_LIMIT ?? '5';
const DEFAULT_POOL_TIMEOUT = '20';

function withConnectionPoolParams(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', DEFAULT_CONNECTION_LIMIT);
    }
    if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', DEFAULT_POOL_TIMEOUT);
    }
    return parsed.toString();
  } catch {
    // Non-standard connection string (e.g. a socket path) — leave it untouched.
    return url;
  }
}

const datasourceUrl = withConnectionPoolParams(env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl,
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
          ],
  });

// Production slow-query visibility — dev already streams every query above, so
// only wire this up outside dev. Anything past the threshold is logged at warn
// with its duration so a regression shows up in Render logs / Sentry breadcrumbs
// instead of only surfacing as a user complaint.
const SLOW_QUERY_MS = Number(env.SLOW_QUERY_LOG_MS ?? '300');
if (env.NODE_ENV !== 'development') {
  // @ts-expect-error — the 'query' event is only typed when declared in the
  // client's log config above, which it is for non-dev.
  prisma.$on('query', (e: { duration: number; query: string }) => {
    if (e.duration >= SLOW_QUERY_MS) {
      logger.warn({ durationMs: e.duration, query: e.query }, 'Slow database query');
    }
  });
}

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
