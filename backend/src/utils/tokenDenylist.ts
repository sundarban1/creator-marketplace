import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { getQueueRedis } from '../config/redis';
import { logger } from '../config/logger';

// A denylist for refresh tokens that have been explicitly invalidated (logout,
// logout-everywhere, password reset, deactivate, delete), backed by the durable
// queue Redis.
//
// This is defence-in-depth, NOT the authority: AuthService.refresh() still
// looks the token up in the `sessions` table and rejects anything without a
// row, exactly as before. The denylist just lets an invalidated token be
// rejected up front — including in the unlikely event a session row lingers —
// and takes load off that lookup. Best-effort: when the queue Redis is
// unavailable, denial writes are skipped and `isRefreshTokenDenied()` returns
// false, so behaviour falls back to the DB check with no change.

const key = (token: string) => `denied-rt:${createHash('sha256').update(token).digest('hex')}`;

// Cap the denylist entry lifetime to the token's own remaining validity — once
// the token would expire on its own there's nothing left to deny. Falls back to
// the default refresh-token lifetime when the token can't be decoded.
const FALLBACK_TTL_SECONDS = 7 * 24 * 60 * 60;

function remainingTtlSeconds(token: string): number {
  try {
    const decoded = jwt.decode(token);
    if (decoded && typeof decoded === 'object' && typeof decoded.exp === 'number') {
      return Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
    }
  } catch {
    // fall through
  }
  return FALLBACK_TTL_SECONDS;
}

/** Add a refresh token to the denylist. No-op when already expired or Redis is down. */
export async function denyRefreshToken(token: string): Promise<void> {
  const ttl = remainingTtlSeconds(token);
  if (ttl <= 0) return;
  const client = await getQueueRedis();
  if (!client) return;
  try {
    await client.set(key(token), '1', { EX: ttl });
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'refresh-token denylist write failed');
  }
}

/** Deny several tokens (logout-everywhere). */
export async function denyRefreshTokens(tokens: string[]): Promise<void> {
  await Promise.all(tokens.map((t) => denyRefreshToken(t)));
}

/** True only if this refresh token is positively on the denylist. */
export async function isRefreshTokenDenied(token: string): Promise<boolean> {
  const client = await getQueueRedis();
  if (!client) return false;
  try {
    return (await client.exists(key(token))) === 1;
  } catch {
    return false;
  }
}
