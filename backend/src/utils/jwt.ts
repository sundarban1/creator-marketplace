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
  // Which client kicked off the flow — the callback route reads this (via an
  // unverified jwt.decode, since it just picks a redirect target and isn't
  // security-sensitive) to know whether to 302 into the app's custom URL
  // scheme or back to the web app. Defaults to 'mobile' when omitted (every
  // state signed before this field existed came from the mobile app).
  clientPlatform?: 'web' | 'mobile';
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
      jwtPayload = { userId: payload.userId, role: payload.role, clientPlatform: payload.clientPlatform, nonce };
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : err }, 'oauth-state: Redis park failed — verifier stays in the JWT');
    }
  }

  return jwt.sign(jwtPayload, OAUTH_STATE_SECRET, { expiresIn: '30m' });
}

/**
 * Best-effort, UNVERIFIED peek at `clientPlatform` — used only to pick which
 * URL a public OAuth callback route 302s to (app scheme vs. web app) before
 * the real, signature-checked `verifyOAuthState` runs inside the service. A
 * forged/garbled state can only ever misroute that redirect, never affect
 * which account gets connected, so skipping verification here is safe and
 * lets the (single-use) real verify happen exactly once.
 */
export function peekOAuthStatePlatform(token: string): 'web' | 'mobile' {
  try {
    const decoded = jwt.decode(token) as OAuthStatePayload | null;
    return decoded?.clientPlatform === 'web' ? 'web' : 'mobile';
  } catch {
    return 'mobile';
  }
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

// Server-side half of biometric re-login's challenge/signature exchange (see
// AuthService.biometricChallenge/biometricVerify): the device signs this
// challenge with the Ed25519 private key backing its registered
// BiometricCredential, proving possession without ever sending the key or any
// reusable bearer token. `nonce` is parked in the queue Redis and GETDEL'd on
// verify so a captured (challenge, signature) pair can't be replayed.
export interface BiometricChallengePayload {
  credentialId: string;
  deviceId: string;
  nonce: string;
}

const BIOMETRIC_CHALLENGE_SECRET = env.JWT_ACCESS_SECRET + '_biometric_challenge';
const BIOMETRIC_CHALLENGE_TTL_SEC = 2 * 60;
const biometricChallengeKey = (nonce: string) => `biometric-challenge:${nonce}`;

// Unlike signOAuthState's soft Redis fallback, this is payments-adjacent
// login auth and the nonce MUST be single-use — so it fails closed (throws)
// if the queue Redis is unavailable rather than silently issuing a
// replayable challenge.
export async function signBiometricChallenge(payload: { credentialId: string; deviceId: string }): Promise<string> {
  const client = await getQueueRedis();
  if (!client) throw new Error('Redis unavailable — cannot issue a single-use biometric challenge');

  const nonce = crypto.randomUUID();
  await client.set(biometricChallengeKey(nonce), '1', { EX: BIOMETRIC_CHALLENGE_TTL_SEC });

  const jwtPayload: BiometricChallengePayload = { ...payload, nonce };
  return jwt.sign(jwtPayload, BIOMETRIC_CHALLENGE_SECRET, { expiresIn: BIOMETRIC_CHALLENGE_TTL_SEC });
}

// Verifies the challenge JWT's signature/expiry AND atomically consumes its
// nonce, so the same signed challenge can never be replayed. Throws on an
// invalid/expired/already-used challenge, or if Redis is unreachable.
export async function verifyAndConsumeBiometricChallenge(token: string): Promise<BiometricChallengePayload & JwtPayload> {
  const payload = jwt.verify(token, BIOMETRIC_CHALLENGE_SECRET) as BiometricChallengePayload & JwtPayload;

  const client = await getQueueRedis();
  if (!client) throw new Error('Redis unavailable — cannot verify single-use biometric challenge');

  const consumed = await client.getDel(biometricChallengeKey(payload.nonce));
  if (!consumed) throw new Error('Biometric challenge already used or expired');

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
