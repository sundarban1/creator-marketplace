import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { verifyAccessToken, verifyVisitorChatToken } from '../utils/jwt';
import { AppError } from './error';

import { HttpStatus } from '../constants/httpStatus';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError('No token provided. Please authenticate.', HttpStatus.UNAUTHORIZED));
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = verifyAccessToken(authHeader.split(' ')[1]);
      req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    } catch {
      // invalid / expired token — proceed without setting req.user
    }
  }
  next();
}

// Anonymous website-visitor chat — proves "this browser owns this chat" via a
// long-lived token (see utils/jwt.ts) carried in a custom header, since the
// visitor has no account and Authorization: Bearer is reserved for real users.
export function verifyVisitorChat(req: Request, _res: Response, next: NextFunction): void {
  const token = req.headers['x-visitor-token'] as string | undefined;
  if (!token) {
    next(new AppError('Missing visitor token', HttpStatus.UNAUTHORIZED));
    return;
  }
  try {
    const decoded = verifyVisitorChatToken(token);
    if (decoded.chatId !== req.params['chatId']) {
      next(new AppError('Visitor token does not match this chat', HttpStatus.FORBIDDEN));
      return;
    }
    next();
  } catch {
    next(new AppError('Invalid or expired visitor token', HttpStatus.UNAUTHORIZED));
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Not authenticated', HttpStatus.UNAUTHORIZED));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(
        new AppError(
          `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
          HttpStatus.FORBIDDEN
        )
      );
      return;
    }

    next();
  };
}
