"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
const zod_1 = require("zod");
const jsonwebtoken_1 = require("jsonwebtoken");
const client_1 = require("@prisma/client");
class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
function errorHandler(err, req, res, _next) {
    // Zod validation errors
    if (err instanceof zod_1.ZodError) {
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
    if (err instanceof jsonwebtoken_1.TokenExpiredError) {
        res.status(401).json({
            success: false,
            message: 'Token has expired',
        });
        return;
    }
    if (err instanceof jsonwebtoken_1.JsonWebTokenError) {
        res.status(401).json({
            success: false,
            message: 'Invalid token',
        });
        return;
    }
    // Prisma errors
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            const fields = err.meta?.target?.join(', ') || 'field';
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
    if (err instanceof client_1.Prisma.PrismaClientValidationError) {
        res.status(400).json({
            success: false,
            message: 'Invalid data provided',
        });
        return;
    }
    // Custom AppError
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
        return;
    }
    // Generic / unknown errors
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production'
            ? 'An internal server error occurred'
            : err.message,
    });
}
function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
}
//# sourceMappingURL=error.js.map