import type { RegisterInput, LoginInput, RefreshTokenInput, ForgotPasswordInput, ResetPasswordInput, VerifyOtpInput, ResendOtpInput, ForgotPasswordByPhoneInput, VerifyResetOtpInput, RequestPhoneOtpInput, VerifyPhoneOtpInput } from './auth.schema';
export declare class AuthService {
    private repo;
    constructor();
    register(input: RegisterInput): Promise<{
        email: string;
    }>;
    verifyOtp(input: VerifyOtpInput): Promise<{
        user: {
            id: string;
            email: string;
            phone: string | null;
            role: import(".prisma/client").$Enums.Role;
            isEmailVerified: boolean;
            isOnboarded: boolean;
            createdAt: Date;
            updatedAt: Date;
            creatorProfile: {
                id: string;
                username: string | null;
                fullName: string | null;
                avatarUrl: string | null;
            } | null;
            businessProfile: {
                id: string;
                businessName: string | null;
                logoUrl: string | null;
            } | null;
            name: string;
            avatar: string | null;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    resendOtp(input: ResendOtpInput): Promise<{
        message: string;
    }>;
    login(input: LoginInput): Promise<{
        user: {
            id: string;
            email: string;
            phone: string | null;
            role: import(".prisma/client").$Enums.Role;
            isEmailVerified: boolean;
            isOnboarded: boolean;
            createdAt: Date;
            updatedAt: Date;
            creatorProfile: {
                id: string;
                username: string | null;
                fullName: string | null;
                avatarUrl: string | null;
            } | null;
            businessProfile: {
                id: string;
                businessName: string | null;
                logoUrl: string | null;
            } | null;
            name: string;
            avatar: string | null;
        };
        accessToken: string;
        refreshToken: string;
        reactivated: boolean;
    }>;
    completeOnboarding(userId: string): Promise<{
        message: string;
    }>;
    refresh(input: RefreshTokenInput): Promise<{
        accessToken: string;
    }>;
    logout(userId: string): Promise<{
        message: string;
    }>;
    deactivateAccount(userId: string): Promise<{
        message: string;
    }>;
    deleteAccount(userId: string): Promise<{
        message: string;
    }>;
    forgotPasswordByPhone(input: ForgotPasswordByPhoneInput): Promise<{
        message: string;
    }>;
    verifyResetOtp(input: VerifyResetOtpInput): Promise<{
        resetToken: string;
    }>;
    forgotPassword(input: ForgotPasswordInput): Promise<{
        message: string;
    }>;
    requestPhoneOtp(userId: string, input: RequestPhoneOtpInput): Promise<{
        message: string;
    }>;
    verifyPhoneOtp(userId: string, input: VerifyPhoneOtpInput): Promise<{
        message: string;
    }>;
    resetPassword(input: ResetPasswordInput): Promise<{
        message: string;
    }>;
}
//# sourceMappingURL=auth.service.d.ts.map