import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import * as Sentry from '@sentry/node';

// req.log is normally always set by pinoHttp, but errors can originate before it
// runs (e.g. a malformed body). Falls back to console so logging itself never throws
// — calling req.log[level] directly (not through a detached reference) preserves the
// `this` binding pino's logger methods need internally.
export function logError(req: Request, err: unknown, msg: string, level: 'error' | 'warn' = 'error'): void {
  if (req.log) {
    req.log[level]({ err }, msg);
  } else {
    console.error(msg, err);
  }
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  // Optional machine-readable payload alongside the message — e.g. the
  // captchaRequired flag on a failed login (see AuthService.login). Kept
  // optional/untyped here since only a couple of call sites use it; each
  // caller documents its own shape.
  public readonly data?: Record<string, unknown>;

  constructor(message: string, statusCode: number, isOperational = true, data?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.data = data;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // The client can disconnect before a handler finishes (e.g. cancelling an
  // in-flight upload) — the request keeps running server-side regardless (see
  // CampaignService.uploadDeliverableFile), so by the time it throws there may
  // be no connection left to answer. Writing to it anyway risks an unhandled
  // stream 'error' event; nothing downstream needs the response, so just stop.
  if (res.writableEnded || res.destroyed) return;

  // Malformed request body (invalid JSON) from express.json()
  if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400 && 'body' in err) {
    res.status(400).json({
      success: false,
      message: 'Malformed JSON in request body',
    });
    return;
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
    return;
  }

  // JWT errors
  if (err instanceof TokenExpiredError) {
    res.status(401).json({
      success: false,
      message: 'Token has expired',
    });
    return;
  }

  if (err instanceof JsonWebTokenError) {
    res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
    return;
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const fields = (err.meta?.target as string[])?.join(', ') || 'field';
      res.status(409).json({
        success: false,
        message: `A record with this ${fields} already exists`,
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'Record not found',
      });
      return;
    }

    if (err.code === 'P2003') {
      res.status(400).json({
        success: false,
        message: 'Related record not found',
      });
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      message: 'Invalid data provided',
    });
    return;
  }

  // Multer upload errors (file too large, too many files, etc.) — previously fell
  // through to the generic 500 below since MulterError isn't an AppError. Applies
  // to the multer-backed uploads (chat image/file attachments, avatars, docs, etc.)
  // — video no longer goes through multer at all, it's uploaded direct-to-Cloudinary
  // (see utils/cloudinary.ts's generateVideoUploadSignature) and its size cap is
  // enforced separately, not via a MulterError.
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File is too large'
      : err.message;
    res.status(400).json({
      success: false,
      message,
    });
    return;
  }

  // Custom AppError
  if (err instanceof AppError) {
    const level = err.statusCode >= 500 || !err.isOperational ? 'error' : 'warn';
    logError(req, err, err.message, level);
    // Only genuinely unexpected server faults go to Sentry — expected 4xx
    // AppErrors (validation, auth, not-found, etc.) are normal traffic, not
    // exceptions worth an alert.
    if (err.statusCode >= 500) Sentry.captureException(err);
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.data ? err.data : {}),
    });
    return;
  }

  // Generic / unknown errors
  logError(req, err, 'Unhandled error');
  Sentry.captureException(err);
  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'An internal server error occurred'
        : err.message,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}
