import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize, optionalAuthenticate } from './auth';
import { AppError, AuthErrorCode, errorHandler } from './error';
import { signAccessToken } from '../utils/jwt';

const reqWith = (authorization?: string, user?: Request['user']) =>
  ({ headers: authorization ? { authorization } : {}, user } as unknown as Request);

function run(mw: (req: Request, res: Response, next: (e?: unknown) => void) => void, req: Request) {
  const next = vi.fn();
  mw(req, {} as Response, next);
  return next.mock.calls[0]?.[0] as unknown;
}

function render(err: unknown) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), writableEnded: false, destroyed: false };
  errorHandler(err as Error, { log: { warn: vi.fn(), error: vi.fn() } } as unknown as Request, res as unknown as Response, vi.fn());
  return { status: res.status.mock.calls[0]?.[0], body: res.json.mock.calls[0]?.[0] };
}

describe('authenticate', () => {
  it('missing token → 401 AUTHENTICATION_REQUIRED', () => {
    const { status, body } = render(run(authenticate, reqWith()));
    expect(status).toBe(401);
    expect(body).toMatchObject({ success: false, code: AuthErrorCode.AUTHENTICATION_REQUIRED });
  });

  it('garbage token → 401 TOKEN_INVALID, no token contents leaked', () => {
    const { status, body } = render(run(authenticate, reqWith('Bearer not.a.jwt')));
    expect(status).toBe(401);
    expect(body).toEqual({ success: false, message: 'Invalid token', code: AuthErrorCode.TOKEN_INVALID });
  });

  it('valid token → sets req.user and calls next()', () => {
    const token = signAccessToken({ id: 'u1', email: 'a@b.c', role: Role.CREATOR });
    const req = reqWith(`Bearer ${token}`);
    expect(run(authenticate, req)).toBeUndefined();
    expect(req.user).toMatchObject({ id: 'u1', role: Role.CREATOR });
  });
});

describe('optionalAuthenticate', () => {
  it('anonymous public request passes through without a user', () => {
    const req = reqWith();
    expect(run(optionalAuthenticate, req)).toBeUndefined();
    expect(req.user).toBeUndefined();
  });
});

describe('authorize', () => {
  it('authenticated but wrong role → 403 FORBIDDEN (not 401)', () => {
    const err = run(authorize(Role.ADMIN), reqWith(undefined, { id: 'u', email: 'e', role: Role.CREATOR }));
    expect(err).toBeInstanceOf(AppError);
    const { status, body } = render(err);
    expect(status).toBe(403);
    expect(body.code).toBe(AuthErrorCode.FORBIDDEN);
  });
});
