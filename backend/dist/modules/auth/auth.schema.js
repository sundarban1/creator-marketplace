"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.facebookAuthSchema = exports.googleAuthSchema = exports.verifyPhoneOtpSchema = exports.requestPhoneOtpSchema = exports.verifyResetOtpSchema = exports.forgotPasswordByPhoneSchema = exports.resendOtpSchema = exports.verifyOtpSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.refreshTokenSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    phone: zod_1.z.string().min(7, 'Phone number is too short').max(15, 'Phone number is too long').regex(/^\+?[\d\s\-().]+$/, 'Invalid phone number').optional(),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    role: zod_1.z.enum(['CREATOR', 'BUSINESS'], {
        errorMap: () => ({ message: 'Role must be CREATOR or BUSINESS' }),
    }),
    fullName: zod_1.z.string().min(2, 'Full name must be at least 2 characters').optional(),
    businessName: zod_1.z.string().min(2, 'Business name must be at least 2 characters').optional(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Reset token is required'),
    newPassword: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});
exports.verifyOtpSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    code: zod_1.z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must be numeric'),
});
exports.resendOtpSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
});
exports.forgotPasswordByPhoneSchema = zod_1.z.object({
    phone: zod_1.z.string().min(7).max(15).regex(/^\+?[\d\s\-().]+$/, 'Invalid phone number'),
});
exports.verifyResetOtpSchema = zod_1.z.object({
    phone: zod_1.z.string().min(7).max(15).regex(/^\+?[\d\s\-().]+$/, 'Invalid phone number'),
    code: zod_1.z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must be numeric'),
});
exports.requestPhoneOtpSchema = zod_1.z.object({
    phone: zod_1.z.string().min(7).max(15).regex(/^\+?[\d\s\-().]+$/, 'Invalid phone number'),
});
exports.verifyPhoneOtpSchema = zod_1.z.object({
    phone: zod_1.z.string().min(7).max(15).regex(/^\+?[\d\s\-().]+$/, 'Invalid phone number'),
    code: zod_1.z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must be numeric'),
});
exports.googleAuthSchema = zod_1.z.object({
    accessToken: zod_1.z.string().min(1, 'Google access token is required'),
    role: zod_1.z.enum(['CREATOR', 'BUSINESS']).optional(),
});
exports.facebookAuthSchema = zod_1.z.object({
    accessToken: zod_1.z.string().min(1, 'Facebook access token is required'),
    role: zod_1.z.enum(['CREATOR', 'BUSINESS']).optional(),
});
//# sourceMappingURL=auth.schema.js.map