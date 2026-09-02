import crypto from 'crypto';
import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from '@prisma/client';
import { getQueueRedis } from '../config/redis';
import { logger } from '../config/logger';

export interface TokenPayload {
  id: string;
  email: string;
  role: Role;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    // Two devices logging in within the same second would otherwise sign the
    // exact same token (same payload + same `iat`), colliding on the
    // sessions table's unique refreshToken constraint — jti makes every
    // issued token unique regardless of timing.
    jwtid: crypto.randomUUID(),
  } as SignOptions);
}

export function verifyAccessToken(token: string): TokenPayload & JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload & JwtPayload;
}

export function verifyRefreshToken(token: string): TokenPayload & JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload & JwtPayload;
}

export function signPasswordResetToken(payload: { id: string; email: string }): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET + '_reset', {
    expiresIn: '1h',
  });
}

export function verifyPasswordResetToken(token: string): { id: string; email: string } & JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET + '_reset') as { id: string; email: string } & JwtPayload;
}

// Bridges the "Sign in with Apple returned a brand-new Apple identity, but its
// email already belongs to an existing Kolab account" case: the backend has
// verified the Apple token but must NOT auto-link on email alone. It hands the
// client this short-lived token carrying the verified Apple claims; the client
// makes the user sign in with their existing method, then calls
// POST /api/auth/apple/link with this token to attach the Apple identity to the
// now-authenticated account. 10m is plenty for a single sign-in step and keeps
// the window for replay small.
export interface AppleLinkPayload {
  sub: string;
  email?: string;
  name?: string;
}

export function signAppleLinkToken(payload: AppleLinkPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET + '_apple_link', { expiresIn: '10m' });
}

export function verifyAppleLinkToken(token: string): AppleLinkPayload & JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET + '_apple_link') as AppleLinkPayload & JwtPayload;
}

// Carries the requesting user (+ PKCE code_verifier, for providers that need it, e.g.
// TikTok) across the redirect to a third-party OAuth provider and back to our
// callback, since that round trip happens in a browser with no Authorization header
// we control. Instagram Login's token exchange uses a client secret instead of PKCE,
// so codeVerifier is omitted there.
export interface OAuthStatePayload {
  userId: string;
  codeVerifier?: string;
  // Which profile this connect belongs to — defaults to CREATOR when omitted
  // (every state signed before this field existed was creator-only).
  role?: Role;
  // Set when the PKCE verifier was parked in Redis instead of the JWT — the
  // callback swaps it back in and deletes the key, making the state single-use.
  nonce?: string;
}

const OAUTH_STATE_SECRET = env.JWT_ACCESS_SECRET + '_oauth_state';
const OAUTH_STATE_TTL_SEC = 30 * 60;
const oauthStateKey = (nonce: string) => `oauth-state:${nonce}`;

// 30m rather than a tighter window — TikTok/Instagram's login step frequently forces
// a fresh sign-in (no saved session; see preferEphemeralSession on the client) and can
// require an OTP or CAPTCHA, which routinely pushed real users past a 10m expiry and
// surfaced as "authorization expired" right after they finished logging in.
//
// When the queue Redis is available the PKCE `codeVerifier` is parked there
// under a one-time nonce and kept OUT of the JWT (which transits the user's
// browser and the OAuth provider); the callback consumes it. If Redis is
// unavailable at sign time the verifier rides in the JWT exactly as before, so
// the flow never hard-depends on Redis.
export async function signOAuthState(payload: OAuthStatePayload): Promise<string> {
  const nonce = crypto.randomUUID();
  let jwtPayload: OAuthStatePayload = { ...payload, nonce };

  const client = await getQueueRedis();
  if (client) {
    try {
      // Store the secret bit (verifier) server-side; a bare marker is enough for
      // flows without one (Instagram) so the nonce is still single-use.
      const stored = JSON.stringify(payload.codeVerifier ? { codeVerifier: payload.codeVerifier } : { ok: true });
      await client.set(oauthStateKey(nonce), stored, { EX: OAUTH_STATE_TTL_SEC });
      jwtPayload = { userId: payload.userId, role: payload.role, nonce };
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : err }, 'oauth-state: Redis park failed — verifier stays in the JWT');
    }
  }

  return jwt.sign(jwtPayload, OAUTH_STATE_SECRET, { expiresIn: '30m' });
}

export async function verifyOAuthState(token: string): Promise<OAuthStatePayload & JwtPayload> {
  const payload = jwt.verify(token, OAUTH_STATE_SECRET) as OAuthStatePayload & JwtPayload;
  if (!payload.nonce || payload.codeVerifier) return payload; // old-style / verifier already inline

  const client = await getQueueRedis();
  if (!client) return payload; // Redis gone since sign time — caller's own "missing verifier" guard applies

  try {
    const raw = await client.getDel(oauthStateKey(payload.nonce));
    if (raw) {
      const parsed = JSON.parse(raw) as { codeVerifier?: string };
      if (parsed.codeVerifier) payload.codeVerifier = parsed.codeVerifier;
    } else {
      // Already consumed (replay) or expired. Don't hard-fail here — the state
      // JWT itself verified; the per-provider callback rejects if it needed a
      // verifier it now doesn't have, same error path as a malformed state.
      logger.warn({ nonce: payload.nonce }, 'oauth-state: nonce not found on callback (replay or expiry)');
    }
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'oauth-state: Redis consume failed');
  }
  return payload;
}

// Identifies an anonymous website visitor's chat session (landing-page floating
// widget) — no user account exists, so this token (not a real access token) is
// what proves "this browser owns this chat" for both REST calls and the socket
// handshake. Long-lived so a returning visitor keeps their conversation.
export interface VisitorChatPayload {
  chatId: string;
}

export function signVisitorChatToken(payload: VisitorChatPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET + '_visitor_chat', { expiresIn: '30d' });
}

export function verifyVisitorChatToken(token: string): VisitorChatPayload & JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET + '_visitor_chat') as VisitorChatPayload & JwtPayload;
}
