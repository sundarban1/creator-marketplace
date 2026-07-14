import { z } from 'zod';
import { isValidNepaliPhone, toE164NepaliPhone } from '../../utils/phone';

const emailField = z.string().email('Invalid email address');

// Tolerant of a +977/977 prefix and spaces/dashes/parens on input, but always
// canonicalizes to E.164 (+977XXXXXXXXXX) so every phone number is ever stored
// or queried in exactly one format — never trust the client to have normalized it.
const phoneField = z
  .string()
  .refine(isValidNepaliPhone, 'Enter a valid Nepali mobile number (starts with 97 or 98, 10 digits)')
  .transform(toE164NepaliPhone);

const codeField  = z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must be numeric');

// Every identifier-based schema below accepts EITHER email OR phone — never both,
// never neither. The service layer picks whichever channel was provided and sends
// the OTP down that same channel (email -> real email, phone -> SMS).
function exactlyOneIdentifier<T extends { email?: string; phone?: string }>(data: T) {
  return Boolean(data.email) !== Boolean(data.phone);
}
const IDENTIFIER_MESSAGE = { message: 'Provide either an email or a phone number, not both', path: ['email'] };

export const registerSchema = z.object({
  email: emailField.optional(),
  phone: phoneField.optional(),
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
  referralCode: z.string().min(4).max(20).optional(),
}).refine(exactlyOneIdentifier, IDENTIFIER_MESSAGE);

export const loginSchema = z.object({
  email: emailField.optional(),
  phone: phoneField.optional(),
  password: z.string().min(1, 'Password is required'),
}).refine(exactlyOneIdentifier, IDENTIFIER_MESSAGE);

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailField.optional(),
  phone: phoneField.optional(),
}).refine(exactlyOneIdentifier, IDENTIFIER_MESSAGE);

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const verifyOtpSchema = z.object({
  email: emailField.optional(),
  phone: phoneField.optional(),
  code: codeField,
}).refine(exactlyOneIdentifier, IDENTIFIER_MESSAGE);

export const resendOtpSchema = z.object({
  email: emailField.optional(),
  phone: phoneField.optional(),
}).refine(exactlyOneIdentifier, IDENTIFIER_MESSAGE);

export const verifyResetOtpSchema = z.object({
  email: emailField.optional(),
  phone: phoneField.optional(),
  code: codeField,
}).refine(exactlyOneIdentifier, IDENTIFIER_MESSAGE);

// ── Add & verify a phone number on an already-authenticated account ──────────

export const requestPhoneOtpSchema = z.object({
  phone: phoneField,
});

export const verifyPhoneOtpSchema = z.object({
  phone: phoneField,
  code:  codeField,
});

// ── Add & verify a real email on an already-authenticated account ───────────
// (mirrors the phone flow above — used when the account was created via phone
// signup and still has a placeholder email)

export const requestEmailOtpSchema = z.object({
  email: emailField,
});

export const verifyEmailOtpSchema = z.object({
  email: emailField,
  code:  codeField,
});

export const googleAuthSchema = z.object({
  accessToken: z.string().min(1, 'Google access token is required'),
  role: z.enum(['CREATOR', 'BUSINESS']).optional(),
});

export const facebookAuthSchema = z.object({
  accessToken: z.string().min(1, 'Facebook access token is required'),
  role: z.enum(['CREATOR', 'BUSINESS']).optional(),
});

export type RegisterInput         = z.infer<typeof registerSchema>;
export type LoginInput            = z.infer<typeof loginSchema>;
export type RefreshTokenInput     = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput   = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput    = z.infer<typeof resetPasswordSchema>;
export type VerifyOtpInput        = z.infer<typeof verifyOtpSchema>;
export type ResendOtpInput        = z.infer<typeof resendOtpSchema>;
export type VerifyResetOtpInput   = z.infer<typeof verifyResetOtpSchema>;
export type RequestPhoneOtpInput  = z.infer<typeof requestPhoneOtpSchema>;
export type VerifyPhoneOtpInput   = z.infer<typeof verifyPhoneOtpSchema>;
export type RequestEmailOtpInput  = z.infer<typeof requestEmailOtpSchema>;
export type VerifyEmailOtpInput   = z.infer<typeof verifyEmailOtpSchema>;
export type GoogleAuthInput       = z.infer<typeof googleAuthSchema>;
export type FacebookAuthInput     = z.infer<typeof facebookAuthSchema>;
