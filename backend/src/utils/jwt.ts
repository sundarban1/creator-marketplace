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
