import { z } from 'zod';
export declare const registerSchema: z.ZodEffects<z.ZodObject<{
    email: z.ZodString;
    phone: z.ZodString;
    password: z.ZodString;
    role: z.ZodEnum<["CREATOR", "BUSINESS"]>;
    fullName: z.ZodOptional<z.ZodString>;
    businessName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    phone: string;
    password: string;
    role: "CREATOR" | "BUSINESS";
    fullName?: string | undefined;
    businessName?: string | undefined;
}, {
    email: string;
    phone: string;
    password: string;
    role: "CREATOR" | "BUSINESS";
    fullName?: string | undefined;
    businessName?: string | undefined;
}>, {
    email: string;
    phone: string;
    password: string;
    role: "CREATOR" | "BUSINESS";
    fullName?: string | undefined;
    businessName?: string | undefined;
}, {
    email: string;
    phone: string;
    password: string;
    role: "CREATOR" | "BUSINESS";
    fullName?: string | undefined;
    businessName?: string | undefined;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const refreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export declare const forgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const resetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
    newPassword: string;
}, {
    token: string;
    newPassword: string;
}>;
export declare const verifyOtpSchema: z.ZodObject<{
    email: z.ZodString;
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    email: string;
}, {
    code: string;
    email: string;
}>;
export declare const resendOtpSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
//# sourceMappingURL=auth.schema.d.ts.map