"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const error_1 = require("../../middleware/error");
const hash_1 = require("../../utils/hash");
const jwt_1 = require("../../utils/jwt");
const email_1 = require("../../utils/email");
const auth_repository_1 = require("./auth.repository");
const auth_dto_1 = require("./auth.dto");
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
class AuthService {
    repo;
    constructor() {
        this.repo = new auth_repository_1.AuthRepository();
    }
    async register(input) {
        const [existingEmail, existingPhone] = await Promise.all([
            this.repo.findUserByEmail(input.email),
            input.phone ? this.repo.findUserByPhone(input.phone) : Promise.resolve(null),
        ]);
        if (existingEmail)
            throw new error_1.AppError('An account with this email already exists', 409);
        if (existingPhone)
            throw new error_1.AppError('An account with this phone number already exists', 409);
        const hashedPassword = await (0, hash_1.hashPassword)(input.password);
        let user;
        if (input.role === 'CREATOR') {
            user = await this.repo.createUserWithCreatorProfile({
                email: input.email, phone: input.phone, password: hashedPassword,
                role: client_1.Role.CREATOR, fullName: input.fullName,
            });
        }
        else {
            user = await this.repo.createUserWithBusinessProfile({
                email: input.email, phone: input.phone, password: hashedPassword,
                role: client_1.Role.BUSINESS, businessName: input.businessName,
            });
        }
        const code = generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await this.repo.saveOtp(user.id, code, expiresAt);
        await (0, email_1.sendOtpEmail)(user.email, code);
        console.log(`\n🔑 OTP for ${user.email}: ${code}\n`);
        return { email: user.email };
    }
    async verifyOtp(input) {
        const user = await this.repo.findUserByEmail(input.email);
        if (!user)
            throw new error_1.AppError('No account found with this email', 404);
        if (user.isEmailVerified)
            throw new error_1.AppError('This account is already verified', 400);
        const otp = await this.repo.findValidOtp(user.id, input.code);
        if (!otp)
            throw new error_1.AppError('Invalid or expired verification code', 400);
        const verifiedUser = await this.repo.verifyEmail(user.id);
        await this.repo.deleteOtpsByUserId(user.id);
        const tokenPayload = { id: verifiedUser.id, email: verifiedUser.email, role: verifiedUser.role };
        const accessToken = (0, jwt_1.signAccessToken)(tokenPayload);
        const refreshToken = (0, jwt_1.signRefreshToken)(tokenPayload);
        await this.repo.updateRefreshToken(verifiedUser.id, refreshToken);
        // Fire welcome email without blocking the response
        const displayName = verifiedUser.creatorProfile?.fullName
            ?? verifiedUser.businessProfile?.businessName
            ?? verifiedUser.email.split('@')[0];
        (0, email_1.sendWelcomeEmail)(verifiedUser.email, displayName, verifiedUser.role)
            .catch((err) => console.error('Welcome email failed:', err));
        return { user: (0, auth_dto_1.toUserDto)(verifiedUser), accessToken, refreshToken };
    }
    async resendOtp(input) {
        const user = await this.repo.findUserByEmail(input.email);
        if (!user)
            throw new error_1.AppError('No account found with this email', 404);
        if (user.isEmailVerified)
            throw new error_1.AppError('This account is already verified', 400);
        const code = generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await this.repo.saveOtp(user.id, code, expiresAt);
        await (0, email_1.sendOtpEmail)(user.email, code);
        console.log(`\n🔑 Resent OTP for ${user.email}: ${code}\n`);
        return { message: 'Verification code resent to your email' };
    }
    async login(input) {
        const user = await this.repo.findUserByEmail(input.email);
        if (!user)
            throw new error_1.AppError('Invalid email or password', 401);
        const isValidPassword = await (0, hash_1.comparePassword)(input.password, user.password);
        if (!isValidPassword)
            throw new error_1.AppError('Invalid email or password', 401);
        if (!user.isEmailVerified)
            throw new error_1.AppError('Please verify your email before logging in', 403);
        // Auto-reactivate deactivated accounts on login
        let activeUser = user;
        let reactivated = false;
        if (!user.isActive) {
            activeUser = await this.repo.reactivateAccount(user.id);
            reactivated = true;
        }
        const tokenPayload = { id: activeUser.id, email: activeUser.email, role: activeUser.role };
        const accessToken = (0, jwt_1.signAccessToken)(tokenPayload);
        const refreshToken = (0, jwt_1.signRefreshToken)(tokenPayload);
        await this.repo.updateRefreshToken(activeUser.id, refreshToken);
        return { user: (0, auth_dto_1.toUserDto)(activeUser), accessToken, refreshToken, reactivated };
    }
    async completeOnboarding(userId) {
        await this.repo.setOnboarded(userId);
        return { message: 'Onboarding complete' };
    }
    async refresh(input) {
        let decoded;
        try {
            decoded = (0, jwt_1.verifyRefreshToken)(input.refreshToken);
        }
        catch {
            throw new error_1.AppError('Invalid or expired refresh token', 401);
        }
        const user = await this.repo.findUserById(decoded.id);
        if (!user)
            throw new error_1.AppError('User not found', 401);
        if (user.refreshToken !== input.refreshToken)
            throw new error_1.AppError('Refresh token mismatch. Please login again.', 401);
        const tokenPayload = { id: user.id, email: user.email, role: user.role };
        const accessToken = (0, jwt_1.signAccessToken)(tokenPayload);
        return { accessToken };
    }
    async logout(userId) {
        await this.repo.updateRefreshToken(userId, null);
        return { message: 'Logged out successfully' };
    }
    async deactivateAccount(userId) {
        const user = await this.repo.findUserById(userId);
        if (!user)
            throw new error_1.AppError('User not found', 404);
        await this.repo.deactivateAccount(userId);
        return { message: 'Account deactivated. Log in at any time to reactivate.' };
    }
    async deleteAccount(userId) {
        const user = await this.repo.findUserById(userId);
        if (!user)
            throw new error_1.AppError('User not found', 404);
        await this.repo.deleteAccount(userId);
        return { message: 'Account permanently deleted.' };
    }
    async forgotPasswordByPhone(input) {
        const user = await this.repo.findUserByPhone(input.phone);
        if (!user) {
            // Return success anyway — don't leak whether phone exists
            return { message: 'If that phone number is registered, a reset code has been sent' };
        }
        const code = generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await this.repo.saveOtp(user.id, code, expiresAt);
        // In production: send via SMS. For now log to console.
        console.log(`\n🔑 Password reset OTP for ${input.phone}: ${code}\n`);
        return { message: 'OTP sent to your phone number' };
    }
    async verifyResetOtp(input) {
        const user = await this.repo.findUserByPhone(input.phone);
        if (!user)
            throw new error_1.AppError('No account found with this phone number', 404);
        const otp = await this.repo.findValidOtp(user.id, input.code);
        if (!otp)
            throw new error_1.AppError('Invalid or expired code', 400);
        await this.repo.deleteOtpsByUserId(user.id);
        // Issue a short-lived reset token (reuses the same JWT util as email reset)
        const resetToken = (0, jwt_1.signPasswordResetToken)({ id: user.id, email: user.email });
        return { resetToken };
    }
    async forgotPassword(input) {
        const user = await this.repo.findUserByEmail(input.email);
        if (!user)
            return { message: 'If that email exists, a reset link has been sent' };
        const resetToken = (0, jwt_1.signPasswordResetToken)({ id: user.id, email: user.email });
        await (0, email_1.sendPasswordResetEmail)(user.email, resetToken);
        return { message: 'If that email exists, a reset link has been sent' };
    }
    async requestPhoneOtp(userId, input) {
        const phone = input.phone.trim();
        const existing = await this.repo.findUserByPhone(phone);
        if (existing && existing.id !== userId) {
            throw new error_1.AppError('This phone number is already in use by another account', 409);
        }
        const user = await this.repo.findUserById(userId);
        if (!user)
            throw new error_1.AppError('User not found', 404);
        const code = generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await this.repo.saveOtp(userId, code, expiresAt);
        // In production: integrate an SMS gateway (e.g. Sparrow SMS for Nepal).
        // For now, log the OTP to the console.
        console.log(`\n📱 Phone verification OTP for ${phone}: ${code}\n`);
        return { message: 'Verification code sent to your phone number' };
    }
    async verifyPhoneOtp(userId, input) {
        const user = await this.repo.findUserById(userId);
        if (!user)
            throw new error_1.AppError('User not found', 404);
        const otp = await this.repo.findValidOtp(userId, input.code);
        if (!otp)
            throw new error_1.AppError('Invalid or expired verification code', 400);
        await this.repo.deleteOtpsByUserId(userId);
        await this.repo.updateUserPhone(userId, input.phone.trim());
        return { message: 'Phone number verified successfully' };
    }
    async googleAuth(input) {
        const googleRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${input.accessToken}` },
        });
        if (!googleRes.ok)
            throw new error_1.AppError('Invalid or expired Google token. Please try again.', 401);
        const gUser = await googleRes.json();
        if (!gUser.email)
            throw new error_1.AppError('Could not retrieve email from Google.', 400);
        const existing = await this.repo.findUserByEmail(gUser.email);
        if (existing) {
            if (!existing.isActive)
                await this.repo.reactivateAccount(existing.id);
            const user = await this.repo.findUserById(existing.id);
            const payload = { id: user.id, email: user.email, role: user.role };
            const accessToken = (0, jwt_1.signAccessToken)(payload);
            const refreshToken = (0, jwt_1.signRefreshToken)(payload);
            await this.repo.updateRefreshToken(user.id, refreshToken);
            return { needsRole: false, user: (0, auth_dto_1.toUserDto)(user), accessToken, refreshToken, isNewUser: false };
        }
        if (!input.role) {
            return { needsRole: true, email: gUser.email, name: gUser.name ?? gUser.email.split('@')[0] };
        }
        const hashedPassword = await (0, hash_1.hashPassword)(crypto_1.default.randomBytes(32).toString('hex'));
        let createdUser;
        if (input.role === 'CREATOR') {
            createdUser = await this.repo.createUserWithCreatorProfile({
                email: gUser.email, password: hashedPassword, role: client_1.Role.CREATOR, fullName: gUser.name,
            });
        }
        else {
            createdUser = await this.repo.createUserWithBusinessProfile({
                email: gUser.email, password: hashedPassword, role: client_1.Role.BUSINESS, businessName: gUser.name,
            });
        }
        // Google has already verified the email — mark it verified without OTP
        const verifiedUser = await this.repo.verifyEmail(createdUser.id);
        const payload = { id: verifiedUser.id, email: verifiedUser.email, role: verifiedUser.role };
        const accessToken = (0, jwt_1.signAccessToken)(payload);
        const refreshToken = (0, jwt_1.signRefreshToken)(payload);
        await this.repo.updateRefreshToken(verifiedUser.id, refreshToken);
        return { needsRole: false, user: (0, auth_dto_1.toUserDto)(verifiedUser), accessToken, refreshToken, isNewUser: true };
    }
    async facebookAuth(input) {
        const fbRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${input.accessToken}`);
        if (!fbRes.ok)
            throw new error_1.AppError('Invalid or expired Facebook token. Please try again.', 401);
        const fbUser = await fbRes.json();
        if (!fbUser.email)
            throw new error_1.AppError('Facebook account has no email. Please use a different sign-in method.', 400);
        const existing = await this.repo.findUserByEmail(fbUser.email);
        if (existing) {
            if (!existing.isActive)
                await this.repo.reactivateAccount(existing.id);
            const user = await this.repo.findUserById(existing.id);
            const payload = { id: user.id, email: user.email, role: user.role };
            const accessToken = (0, jwt_1.signAccessToken)(payload);
            const refreshToken = (0, jwt_1.signRefreshToken)(payload);
            await this.repo.updateRefreshToken(user.id, refreshToken);
            return { needsRole: false, user: (0, auth_dto_1.toUserDto)(user), accessToken, refreshToken, isNewUser: false };
        }
        if (!input.role) {
            return { needsRole: true, email: fbUser.email, name: fbUser.name ?? fbUser.email.split('@')[0] };
        }
        const hashedPassword = await (0, hash_1.hashPassword)(crypto_1.default.randomBytes(32).toString('hex'));
        let createdUser;
        if (input.role === 'CREATOR') {
            createdUser = await this.repo.createUserWithCreatorProfile({
                email: fbUser.email, password: hashedPassword, role: client_1.Role.CREATOR, fullName: fbUser.name,
            });
        }
        else {
            createdUser = await this.repo.createUserWithBusinessProfile({
                email: fbUser.email, password: hashedPassword, role: client_1.Role.BUSINESS, businessName: fbUser.name,
            });
        }
        const verifiedUser = await this.repo.verifyEmail(createdUser.id);
        const payload = { id: verifiedUser.id, email: verifiedUser.email, role: verifiedUser.role };
        const accessToken = (0, jwt_1.signAccessToken)(payload);
        const refreshToken = (0, jwt_1.signRefreshToken)(payload);
        await this.repo.updateRefreshToken(verifiedUser.id, refreshToken);
        return { needsRole: false, user: (0, auth_dto_1.toUserDto)(verifiedUser), accessToken, refreshToken, isNewUser: true };
    }
    async resetPassword(input) {
        let decoded;
        try {
            decoded = (0, jwt_1.verifyPasswordResetToken)(input.token);
        }
        catch {
            throw new error_1.AppError('Invalid or expired reset token', 400);
        }
        const user = await this.repo.findUserById(decoded.id);
        if (!user)
            throw new error_1.AppError('User not found', 404);
        const hashedPassword = await (0, hash_1.hashPassword)(input.newPassword);
        await this.repo.updatePassword(user.id, hashedPassword);
        return { message: 'Password reset successfully. Please login with your new password.' };
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map