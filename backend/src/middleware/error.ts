import { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodIssue } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { reportToSentry, LogEvent } from '../config/observability';

import { HttpStatus } from '../constants/httpStatus';


// "businessName" / "brief.audience.ageMin" → "Business name" / "Age min".
function fieldLabel(path: (string | number)[]): string {
  const last = [...path].reverse().find((p) => typeof p === 'string') as string | undefined;
  if (!last) return '';
  const words = last.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase().trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Zod's built-in defaults ("Required", "Expected string, received number", …)
// don't say which field they're about — name the field for those. Custom
// messages from our schemas are already user-facing and pass through as-is.
function zodIssueMessage(issue: ZodIssue): string {
  const label = fieldLabel(issue.path);
  if (issue.code === 'invalid_type') {
    if (!label) return issue.message;
    return issue.received === 'undefined' || issue.received === 'null' ? `${label} is required` : `${label} is invalid`;
  }
  if (label && /^(Required|Invalid( input)?)$/i.test(issue.message)) {
    return /^Required$/i.test(issue.message) ? `${label} is required` : `${label} is invalid`;
  }
  return issue.message;
}

// Unique-constraint clash → plain words: "This email is already in use."
// Compound/internal keys (userId_campaignId, …) get a neutral sentence rather
// than leaking column names.
function duplicateMessage(target: unknown): string {
  const fields = Array.isArray(target) ? (target as string[]) : typeof target === 'string' ? [target] : [];
  if (fields.length === 1 && !/id$/i.test(fields[0])) {
    const label = fieldLabel([fields[0]]).toLowerCase();
    return `This ${label} is already in use.`;
  }
  return 'This already exists.';
}

export function validationSummary(errors: { message: string }[]): string {
  const unique = Array.from(new Set(errors.map((e) => e.message.trim()).filter(Boolean)));
  if (!unique.length) return 'Please check the details you entered.';
  return unique.slice(0, 3).map((m) => (/[.!?]$/.test(m) ? m : `${m}.`)).join(' ');
}

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
    // new.target, NOT AppError.prototype — hardcoding the base class here
    // reset every SUBCLASS instance's prototype back to AppError's, so
    // `err instanceof SomeSubclassOfAppError` was always false. That silently
    // disabled CampaignIntentError's special handling in campaign-ai.service:
    // a prompt with no campaign intent got answered with an unrelated dummy
    // draft instead of the AI's own "what would you like to promote?".
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Machine-readable codes on auth failures, so clients branch on `code` and not
// on message text. 401 means "who are you?" (missing, invalid or expired
// token: refresh or sign in). 403 means "you're known but not allowed".
export const AuthErrorCode = {
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  FORBIDDEN: 'FORBIDDEN',
  // Login-time 403s. The message is localized (x-language), so clients must
  // branch on these, not on the text.
  ACCOUNT_NOT_VERIFIED: 'ACCOUNT_NOT_VERIFIED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
} as const;

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
    res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: "We couldn't read that request. Please refresh the page and try again.",
    });
    return;
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: zodIssueMessage(e),
    }));
    // The top-level message is what clients show — make it the actual
    // reason(s), never a bare "Validation failed".
    res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
      success: false,
      message: validationSummary(formattedErrors),
      errors: formattedErrors,
    });
    return;
  }

  // JWT errors
  if (err instanceof TokenExpiredError) {
    res.status(HttpStatus.UNAUTHORIZED).json({
      success: false,
      message: 'Token has expired',
      code: AuthErrorCode.TOKEN_EXPIRED,
    });
    return;
  }

  if (err instanceof JsonWebTokenError) {
    res.status(HttpStatus.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid token',
      code: AuthErrorCode.TOKEN_INVALID,
    });
    return;
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(HttpStatus.CONFLICT).json({
        success: false,
        message: duplicateMessage(err.meta?.target),
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'This item no longer exists. Please refresh and try again.',
      });
      return;
    }

    if (err.code === 'P2003') {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Something this refers to no longer exists. Please refresh and try again.',
      });
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Some of the details sent were not valid. Please check them and try again.',
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
    res.status(HttpStatus.BAD_REQUEST).json({
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
    if (err.statusCode >= 500) reportToSentry(err, { event: LogEvent.HTTP_SERVER_ERROR, route: req.originalUrl, method: req.method });
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.data ? err.data : {}),
    });
    return;
  }

  // Generic / unknown errors
  logError(req, err, 'Unhandled error');
  reportToSentry(err, { event: LogEvent.HTTP_UNHANDLED_ERROR, route: req.originalUrl, method: req.method });
  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'Something went wrong on our side. Please try again in a moment.'
        : err.message,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(HttpStatus.NOT_FOUND).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}
