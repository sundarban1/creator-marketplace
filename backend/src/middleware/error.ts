import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { Prisma } from '@prisma/client';

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

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
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

  // Custom AppError
  if (err instanceof AppError) {
    const level = err.statusCode >= 500 || !err.isOperational ? 'error' : 'warn';
    logError(req, err, err.message, level);
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Generic / unknown errors
  logError(req, err, 'Unhandled error');
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
