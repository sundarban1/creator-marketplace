import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../middleware/error';

import { HttpStatus } from '../constants/httpStatus';

// Apple publishes the rotating set of RSA public keys its identity tokens are
// signed with here. jwks-rsa caches keys by `kid` and rate-limits fetches, so
// this is cheap to call on every sign-in.
const APPLE_ISSUER = 'https://appleid.apple.com';
const jwks = new JwksClient({
  jwksUri: `${APPLE_ISSUER}/auth/keys`,
  cache: true,
  cacheMaxAge: 10 * 60 * 1000,
  rateLimit: true,
});

function getSigningKey(header: JwtHeader, callback: SigningKeyCallback): void {
  if (!header.kid) {
    callback(new Error('Apple identity token has no key id'));
    return;
  }
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err || !key) {
      callback(err ?? new Error('Apple signing key not found'));
      return;
    }
    callback(null, key.getPublicKey());
  });
}

export interface AppleIdentity {
  /** Apple's stable per-user identifier — the canonical identity, stored as AuthAccount.providerUserId. */
  sub: string;
  /** Present only when the user granted the email scope AND this is the first authorization. May be a private-relay alias. */
  email?: string;
  /** True when `email` is an `@privaterelay.appleid.com` alias rather than the user's real address. */
  isPrivateEmail?: boolean;
}

/**
 * Fully verifies an Apple `identityToken` (a JWT) the mobile app obtained from
 * Sign in with Apple, and returns the trusted claims. Verifies, in one pass:
 *   - the RS256 signature against Apple's published JWKS
 *   - `iss` === https://appleid.apple.com
 *   - `aud` === our configured APPLE_CLIENT_ID (the iOS bundle id)
 *   - `exp` (not expired) and `iat` (issued in the past, small clock tolerance)
 * then requires a non-empty `sub`.
 *
 * Any failure throws a generic `AppError` — the caller must not leak which check
 * failed to the client (account-enumeration / probing). The real reason is
 * logged server-side here.
 */
export async function verifyAppleIdentityToken(identityToken: string): Promise<AppleIdentity> {
  if (!env.APPLE_CLIENT_ID) {
    logger.error('Sign in with Apple attempted but APPLE_CLIENT_ID is not configured');
    throw new AppError('Unable to authenticate with Apple.', HttpStatus.SERVICE_UNAVAILABLE);
  }

  let payload: jwt.JwtPayload;
  try {
    payload = await new Promise<jwt.JwtPayload>((resolve, reject) => {
      jwt.verify(
        identityToken,
        getSigningKey,
        {
          algorithms: ['RS256'],
          issuer: APPLE_ISSUER,
          audience: env.APPLE_CLIENT_ID,
          clockTolerance: 30,
        },
        (err, decoded) => {
          if (err || !decoded || typeof decoded === 'string') {
            reject(err ?? new Error('Apple identity token decoded to an unexpected shape'));
            return;
          }
          resolve(decoded);
        },
      );
    });
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'Apple identity token verification failed');
    throw new AppError('Unable to authenticate with Apple.', HttpStatus.UNAUTHORIZED);
  }

  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  if (!sub) {
    logger.warn('Apple identity token passed verification but carried no sub claim');
    throw new AppError('Unable to authenticate with Apple.', HttpStatus.UNAUTHORIZED);
  }

  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : undefined;
  // Apple sends these booleans as either real booleans or the strings "true"/"false".
  const isPrivateEmail = payload.is_private_email === true || payload.is_private_email === 'true';

  return { sub, email, isPrivateEmail };
}

// ── Server-to-server notifications ──────────────────────────────────────────
// Apple POSTs `{ payload: "<signed JWT>" }` to our webhook when a user changes
// their mind: disables/enables Hide My Email forwarding, revokes consent for the
// app, or deletes their Apple ID. The JWT's `events` claim is itself a
// JSON-encoded string.

export type AppleNotificationType =
  | 'email-disabled'
  | 'email-enabled'
  | 'consent-revoked'
  | 'account-delete';

export interface AppleNotificationEvent {
  type: AppleNotificationType;
  sub: string;
  email?: string;
  eventTime?: number;
}

export async function verifyAppleNotification(signedPayload: string): Promise<AppleNotificationEvent> {
  if (!env.APPLE_CLIENT_ID) {
    logger.error('Apple S2S notification received but APPLE_CLIENT_ID is not configured');
    throw new AppError('Apple notifications are not configured.', HttpStatus.SERVICE_UNAVAILABLE);
  }

  let claims: jwt.JwtPayload;
  try {
    claims = await new Promise<jwt.JwtPayload>((resolve, reject) => {
      jwt.verify(
        signedPayload,
        getSigningKey,
        { algorithms: ['RS256'], issuer: APPLE_ISSUER, audience: env.APPLE_CLIENT_ID, clockTolerance: 30 },
        (err, decoded) => {
          if (err || !decoded || typeof decoded === 'string') {
            reject(err ?? new Error('Apple notification decoded to an unexpected shape'));
            return;
          }
          resolve(decoded);
        },
      );
    });
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'Apple S2S notification verification failed');
    throw new AppError('Invalid Apple notification.', HttpStatus.BAD_REQUEST);
  }

  // `events` is a stringified JSON object, not a nested claim.
  let events: Record<string, unknown>;
  try {
    events = typeof claims.events === 'string' ? JSON.parse(claims.events) : (claims.events as Record<string, unknown>);
  } catch {
    throw new AppError('Invalid Apple notification.', HttpStatus.BAD_REQUEST);
  }

  const type = events?.type as AppleNotificationType | undefined;
  const sub = typeof events?.sub === 'string' ? events.sub : '';
  if (!type || !sub) throw new AppError('Invalid Apple notification.', HttpStatus.BAD_REQUEST);

  return {
    type,
    sub,
    email: typeof events.email === 'string' ? events.email.toLowerCase() : undefined,
    eventTime: typeof events.event_time === 'number' ? events.event_time : undefined,
  };
}

// ── Server-side Apple OAuth (client secret / token exchange / revoke) ─────────
//
// These need the Sign in with Apple key (.p8) — APPLE_TEAM_ID / APPLE_KEY_ID /
// APPLE_PRIVATE_KEY. Until those are set every function here is a safe no-op so
// sign-in and account deletion still work; only the Apple-side token revocation
// is skipped.

export function appleClientSecretConfigured(): boolean {
  return Boolean(env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY);
}

// The .p8 contents are stored in the env with literal `\n`; turn them back into
// real newlines for the PEM parser.
function applePrivateKeyPem(): string {
  return (env.APPLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');
}

/**
 * Builds the short-lived ES256 JWT Apple's token endpoints accept in place of a
 * traditional client secret (iss = Team ID, sub = Client ID, aud = Apple).
 */
export function generateAppleClientSecret(): string {
  if (!appleClientSecretConfigured()) {
    throw new AppError('Apple server credentials are not configured.', HttpStatus.SERVICE_UNAVAILABLE);
  }
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      iss: env.APPLE_TEAM_ID,
      iat: now,
      exp: now + 300,
      aud: APPLE_ISSUER,
      sub: env.APPLE_CLIENT_ID,
    },
    applePrivateKeyPem(),
    { algorithm: 'ES256', keyid: env.APPLE_KEY_ID },
  );
}

/**
 * Exchanges the one-time `authorizationCode` from Sign in with Apple for a
 * refresh token, which is the only handle `/auth/revoke` later accepts.
 * Best-effort: returns `{}` (never throws) so it can't break sign-in.
 */
export async function exchangeAppleAuthCode(code: string): Promise<{ refreshToken?: string }> {
  if (!appleClientSecretConfigured()) return {};
  try {
    const body = new URLSearchParams({
      client_id: env.APPLE_CLIENT_ID!,
      client_secret: generateAppleClientSecret(),
      code,
      grant_type: 'authorization_code',
    });
    const res = await fetch(`${APPLE_ISSUER}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, 'Apple auth-code exchange failed');
      return {};
    }
    const json = await res.json() as { refresh_token?: string };
    return { refreshToken: json.refresh_token };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'Apple auth-code exchange threw');
    return {};
  }
}

/**
 * Revokes an Apple token so the Apple ID can no longer authenticate into the
 * (now deleted / unlinked) Kolab account — App Store requirement for account
 * deletion. Best-effort: logs and returns on any failure.
 */
export async function revokeAppleToken(token: string, tokenTypeHint: 'refresh_token' | 'access_token' = 'refresh_token'): Promise<void> {
  if (!appleClientSecretConfigured() || !token) return;
  try {
    const body = new URLSearchParams({
      client_id: env.APPLE_CLIENT_ID!,
      client_secret: generateAppleClientSecret(),
      token,
      token_type_hint: tokenTypeHint,
    });
    const res = await fetch(`${APPLE_ISSUER}/auth/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, 'Apple token revoke failed');
      return;
    }
    logger.info('Apple token revoked');
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'Apple token revoke threw');
  }
}
