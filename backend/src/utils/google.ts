import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../middleware/error';
import { getDict } from '../i18n';
import { HttpStatus } from '../constants/httpStatus';

export interface GoogleIdentity {
  /** Google's stable per-user identifier (`userinfo`'s `id`). */
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

let warnedNoAudienceConfigured = false;

/**
 * Verifies a Google OAuth2 access token belongs to one of OUR configured
 * clients (web/iOS/Android) before trusting it, then resolves the identity.
 *
 * Two calls, both against Google's own endpoints — no library needed:
 *   1. `tokeninfo` — cheap way to read the token's `aud` (the OAuth client id
 *      it was minted for) without a signed JWT to verify. If none of our
 *      client ids are configured (only ever true in an environment that never
 *      set up the YouTube-connect feature either) this check is skipped with a
 *      one-time warning rather than breaking sign-in outright.
 *   2. `userinfo` — the actual profile, plus `verified_email`.
 *
 * Any failure throws a generic AppError — callers must not leak which check
 * failed (account-enumeration hardening, same as verifyAppleIdentityToken).
 */
export async function verifyGoogleAccessToken(accessToken: string): Promise<GoogleIdentity> {
  const allowedAudiences = [env.GOOGLE_WEB_CLIENT_ID, env.GOOGLE_IOS_CLIENT_ID, env.GOOGLE_ANDROID_CLIENT_ID]
    .filter((id): id is string => Boolean(id));

  if (allowedAudiences.length > 0) {
    try {
      const tokenInfoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
      );
      if (!tokenInfoRes.ok) {
        logger.warn({ status: tokenInfoRes.status }, 'Google tokeninfo lookup failed');
        throw new AppError(getDict().auth.googleTokenInvalid, HttpStatus.UNAUTHORIZED);
      }
      const tokenInfo = (await tokenInfoRes.json()) as { aud?: string };
      if (!tokenInfo.aud || !allowedAudiences.includes(tokenInfo.aud)) {
        logger.warn({ aud: tokenInfo.aud }, 'Google access token audience mismatch');
        throw new AppError(getDict().auth.googleTokenInvalid, HttpStatus.UNAUTHORIZED);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'Google tokeninfo lookup threw');
      throw new AppError(getDict().auth.googleTokenInvalid, HttpStatus.UNAUTHORIZED);
    }
  } else if (!warnedNoAudienceConfigured) {
    warnedNoAudienceConfigured = true;
    logger.warn(
      'No GOOGLE_WEB_CLIENT_ID/GOOGLE_IOS_CLIENT_ID/GOOGLE_ANDROID_CLIENT_ID configured — skipping Google token audience check',
    );
  }

  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userInfoRes.ok) throw new AppError(getDict().auth.googleTokenInvalid, HttpStatus.UNAUTHORIZED);

  const gUser = (await userInfoRes.json()) as {
    id: string;
    email?: string;
    verified_email?: boolean;
    name?: string;
    picture?: string;
  };

  if (!gUser.email) throw new AppError(getDict().auth.googleNoEmail, HttpStatus.BAD_REQUEST);
  if (gUser.verified_email !== true) throw new AppError(getDict().auth.googleEmailNotVerified, HttpStatus.BAD_REQUEST);

  return { sub: gUser.id, email: gUser.email, name: gUser.name, picture: gUser.picture };
}

/**
 * Exchanges an authorization `code` (the mobile-web redirect flow) for an
 * access token, server-side, using our client secret. The `redirectUri` must
 * be byte-identical to the one the code was issued against.
 */
export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<string> {
  if (!env.GOOGLE_WEB_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    logger.error('Google code exchange attempted but GOOGLE_WEB_CLIENT_ID/GOOGLE_CLIENT_SECRET is not configured');
    throw new AppError('Google Sign-In is not available right now.', HttpStatus.SERVICE_UNAVAILABLE);
  }

  const body = new URLSearchParams({
    client_id: env.GOOGLE_WEB_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  let res: Response;
  try {
    res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'Google code exchange threw');
    throw new AppError(getDict().auth.googleTokenInvalid, HttpStatus.UNAUTHORIZED);
  }

  if (!res.ok) {
    logger.warn({ status: res.status }, 'Google code exchange failed');
    throw new AppError(getDict().auth.googleTokenInvalid, HttpStatus.UNAUTHORIZED);
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new AppError(getDict().auth.googleTokenInvalid, HttpStatus.UNAUTHORIZED);

  return json.access_token;
}
