import type { RegisterInput, LoginInput, RefreshTokenInput, ForgotPasswordInput, ResetPasswordInput, VerifyOtpInput, ResendOtpInput, ForgotPasswordByPhoneInput, VerifyResetOtpInput, RequestPhoneOtpInput, VerifyPhoneOtpInput, GoogleAuthInput, FacebookAuthInput } from './auth.schema';
export declare class AuthService {
    private repo;
    constructor();
    register(input: RegisterInput): Promise<{
        email: string;
    }>;
    verifyOtp(input: VerifyOtpInput): Promise<{
        user: import("./auth.dto").UserDto;
        accessToken: string;
        refreshToken: string;
    }>;
    resendOtp(input: ResendOtpInput): Promise<{
        message: string;
    }>;
    login(input: LoginInput): Promise<{
        user: import("./auth.dto").UserDto;
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
    googleAuth(input: GoogleAuthInput): Promise<{
        needsRole: false;
        user: import("./auth.dto").UserDto;
        accessToken: string;
        refreshToken: string;
        isNewUser: boolean;
        email?: undefined;
        name?: undefined;
    } | {
        needsRole: true;
        email: string;
        name: string;
        user?: undefined;
        accessToken?: undefined;
        refreshToken?: undefined;
        isNewUser?: undefined;
    }>;
    facebookAuth(input: FacebookAuthInput): Promise<{
        needsRole: false;
        user: import("./auth.dto").UserDto;
        accessToken: string;
        refreshToken: string;
        isNewUser: boolean;
        email?: undefined;
        name?: undefined;
    } | {
        needsRole: true;
        email: string;
        name: string;
        user?: undefined;
        accessToken?: undefined;
        refreshToken?: undefined;
        isNewUser?: undefined;
    }>;
    resetPassword(input: ResetPasswordInput): Promise<{
        message: string;
    }>;
}
//# sourceMappingURL=auth.service.d.ts.map