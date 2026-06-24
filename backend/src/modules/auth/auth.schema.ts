import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  phone: z.string().min(7, 'Phone number is too short').max(15, 'Phone number is too long').regex(/^\+?[\d\s\-().]+$/, 'Invalid phone number').optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(['CREATOR', 'BUSINESS'], {
    errorMap: () => ({ message: 'Role must be CREATOR or BUSINESS' }),
  }),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  businessName: z.string().min(2, 'Business name must be at least 2 characters').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must be numeric'),
});

export const resendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const forgotPasswordByPhoneSchema = z.object({
  phone: z.string().min(7).max(15).regex(/^\+?[\d\s\-().]+$/, 'Invalid phone number'),
});

export const verifyResetOtpSchema = z.object({
  phone: z.string().min(7).max(15).regex(/^\+?[\d\s\-().]+$/, 'Invalid phone number'),
  code:  z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must be numeric'),
});

export const requestPhoneOtpSchema = z.object({
  phone: z.string().min(7).max(15).regex(/^\+?[\d\s\-().]+$/, 'Invalid phone number'),
});

export const verifyPhoneOtpSchema = z.object({
  phone: z.string().min(7).max(15).regex(/^\+?[\d\s\-().]+$/, 'Invalid phone number'),
  code:  z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must be numeric'),
});

export const googleAuthSchema = z.object({
  accessToken: z.string().min(1, 'Google access token is required'),
  role: z.enum(['CREATOR', 'BUSINESS']).optional(),
});

export const facebookAuthSchema = z.object({
  accessToken: z.string().min(1, 'Facebook access token is required'),
  role: z.enum(['CREATOR', 'BUSINESS']).optional(),
});

export type RegisterInput              = z.infer<typeof registerSchema>;
export type LoginInput                 = z.infer<typeof loginSchema>;
export type RefreshTokenInput          = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput        = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput         = z.infer<typeof resetPasswordSchema>;
export type VerifyOtpInput             = z.infer<typeof verifyOtpSchema>;
export type ResendOtpInput             = z.infer<typeof resendOtpSchema>;
export type ForgotPasswordByPhoneInput = z.infer<typeof forgotPasswordByPhoneSchema>;
export type VerifyResetOtpInput        = z.infer<typeof verifyResetOtpSchema>;
export type RequestPhoneOtpInput       = z.infer<typeof requestPhoneOtpSchema>;
export type VerifyPhoneOtpInput        = z.infer<typeof verifyPhoneOtpSchema>;
export type GoogleAuthInput            = z.infer<typeof googleAuthSchema>;
export type FacebookAuthInput          = z.infer<typeof facebookAuthSchema>;
