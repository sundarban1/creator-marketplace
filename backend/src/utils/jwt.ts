import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from '@prisma/client';

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
}

export function signOAuthState(payload: OAuthStatePayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET + '_oauth_state', { expiresIn: '10m' });
}

export function verifyOAuthState(token: string): OAuthStatePayload & JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET + '_oauth_state') as OAuthStatePayload & JwtPayload;
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
