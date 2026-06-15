"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const client_1 = require("@prisma/client");
const error_1 = require("../../middleware/error");
const hash_1 = require("../../utils/hash");
const jwt_1 = require("../../utils/jwt");
const email_1 = require("../../utils/email");
const auth_repository_1 = require("./auth.repository");
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
            this.repo.findUserByPhone(input.phone),
        ]);
        if (existingEmail)
            throw new error_1.AppError('An account with this email already exists', 409);
        if (existingPhone)
            throw new error_1.AppError('An account with this phone number already exists', 409);
        const hashedPassword = await (0, hash_1.hashPassword)(input.password);
        let user;
        if (input.role === 'CREATOR') {
            user = await this.repo.createUserWithCreatorProfile({
                email: input.email,
                phone: input.phone,
                password: hashedPassword,
                role: client_1.Role.CREATOR,
                fullName: input.fullName,
            });
        }
        else {
            user = await this.repo.createUserWithBusinessProfile({
                email: input.email,
                phone: input.phone,
                password: hashedPassword,
                role: client_1.Role.BUSINESS,
                businessName: input.businessName,
            });
        }
        // Generate OTP, store it, send email
        const code = generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await this.repo.saveOtp(user.id, code, expiresAt);
        await (0, email_1.sendOtpEmail)(user.email, code);
        // Log OTP in dev so it's easy to test without SMTP
        console.log(`\n🔑 OTP for ${user.email}: ${code}\n`);
        return { email: user.email };
    }
    async verifyOtp(input) {
        const user = await this.repo.findUserByEmail(input.email);
        if (!user) {
            throw new error_1.AppError('No account found with this email', 404);
        }
        if (user.isEmailVerified) {
            throw new error_1.AppError('This account is already verified', 400);
        }
        const otp = await this.repo.findValidOtp(user.id, input.code);
        if (!otp) {
            throw new error_1.AppError('Invalid or expired verification code', 400);
        }
        // Mark verified, delete OTP
        const verifiedUser = await this.repo.verifyEmail(user.id);
        await this.repo.deleteOtpsByUserId(user.id);
        // Issue tokens
        const tokenPayload = { id: verifiedUser.id, email: verifiedUser.email, role: verifiedUser.role };
        const accessToken = (0, jwt_1.signAccessToken)(tokenPayload);
        const refreshToken = (0, jwt_1.signRefreshToken)(tokenPayload);
        await this.repo.updateRefreshToken(verifiedUser.id, refreshToken);
        const { password: _pw, refreshToken: _rt, ...safeUser } = verifiedUser;
        const name = verifiedUser.creatorProfile?.fullName ?? verifiedUser.businessProfile?.businessName ?? verifiedUser.email.split('@')[0];
        const avatar = verifiedUser.creatorProfile?.avatarUrl ?? verifiedUser.businessProfile?.logoUrl ?? null;
        return {
            user: { ...safeUser, name, avatar },
            accessToken,
            refreshToken,
        };
    }
    async resendOtp(input) {
        const user = await this.repo.findUserByEmail(input.email);
        if (!user) {
            throw new error_1.AppError('No account found with this email', 404);
        }
        if (user.isEmailVerified) {
            throw new error_1.AppError('This account is already verified', 400);
        }
        const code = generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await this.repo.saveOtp(user.id, code, expiresAt);
        await (0, email_1.sendOtpEmail)(user.email, code);
        console.log(`\n🔑 Resent OTP for ${user.email}: ${code}\n`);
        return { message: 'Verification code resent to your email' };
    }
    async login(input) {
        const user = await this.repo.findUserByEmail(input.email);
        if (!user) {
            throw new error_1.AppError('Invalid email or password', 401);
        }
        const isValidPassword = await (0, hash_1.comparePassword)(input.password, user.password);
        if (!isValidPassword) {
            throw new error_1.AppError('Invalid email or password', 401);
        }
        if (!user.isEmailVerified) {
            throw new error_1.AppError('Please verify your email before logging in', 403);
        }
        const tokenPayload = { id: user.id, email: user.email, role: user.role };
        const accessToken = (0, jwt_1.signAccessToken)(tokenPayload);
        const refreshToken = (0, jwt_1.signRefreshToken)(tokenPayload);
        await this.repo.updateRefreshToken(user.id, refreshToken);
        const { password: _pw, refreshToken: _rt, ...safeUser } = user;
        const name = user.creatorProfile?.fullName ?? user.businessProfile?.businessName ?? user.email.split('@')[0];
        const avatar = user.creatorProfile?.avatarUrl ?? user.businessProfile?.logoUrl ?? null;
        return {
            user: { ...safeUser, name, avatar },
            accessToken,
            refreshToken,
        };
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
        if (!user) {
            throw new error_1.AppError('User not found', 401);
        }
        if (user.refreshToken !== input.refreshToken) {
            throw new error_1.AppError('Refresh token mismatch. Please login again.', 401);
        }
        const tokenPayload = { id: user.id, email: user.email, role: user.role };
        const accessToken = (0, jwt_1.signAccessToken)(tokenPayload);
        return { accessToken };
    }
    async logout(userId) {
        await this.repo.updateRefreshToken(userId, null);
        return { message: 'Logged out successfully' };
    }
    async forgotPassword(input) {
        const user = await this.repo.findUserByEmail(input.email);
        if (!user) {
            return { message: 'If that email exists, a reset link has been sent' };
        }
        const resetToken = (0, jwt_1.signPasswordResetToken)({ id: user.id, email: user.email });
        await (0, email_1.sendPasswordResetEmail)(user.email, resetToken);
        return { message: 'If that email exists, a reset link has been sent' };
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
        if (!user) {
            throw new error_1.AppError('User not found', 404);
        }
        const hashedPassword = await (0, hash_1.hashPassword)(input.newPassword);
        await this.repo.updatePassword(user.id, hashedPassword);
        return { message: 'Password reset successfully. Please login with your new password.' };
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map