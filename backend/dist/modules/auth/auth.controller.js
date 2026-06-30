"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("./auth.service");
const response_1 = require("../../utils/response");
const authService = new auth_service_1.AuthService();
class AuthController {
    async register(req, res, next) {
        try {
            const result = await authService.register(req.body);
            (0, response_1.success)(res, result, 'Account created successfully', 201);
        }
        catch (err) {
            next(err);
        }
    }
    async login(req, res, next) {
        try {
            const result = await authService.login(req.body);
            (0, response_1.success)(res, result, 'Login successful');
        }
        catch (err) {
            next(err);
        }
    }
    async refresh(req, res, next) {
        try {
            const result = await authService.refresh(req.body);
            (0, response_1.success)(res, result, 'Token refreshed');
        }
        catch (err) {
            next(err);
        }
    }
    async logout(req, res, next) {
        try {
            if (req.user) {
                await authService.logout(req.user.id);
            }
            (0, response_1.success)(res, {}, 'Logged out successfully');
        }
        catch (err) {
            next(err);
        }
    }
    async verifyOtp(req, res, next) {
        try {
            const result = await authService.verifyOtp(req.body);
            (0, response_1.success)(res, result, 'Email verified successfully');
        }
        catch (err) {
            next(err);
        }
    }
    async resendOtp(req, res, next) {
        try {
            const result = await authService.resendOtp(req.body);
            (0, response_1.success)(res, result, result.message);
        }
        catch (err) {
            next(err);
        }
    }
    async forgotPassword(req, res, next) {
        try {
            const result = await authService.forgotPassword(req.body);
            (0, response_1.success)(res, result, result.message);
        }
        catch (err) {
            next(err);
        }
    }
    async resetPassword(req, res, next) {
        try {
            const result = await authService.resetPassword(req.body);
            (0, response_1.success)(res, result, result.message);
        }
        catch (err) {
            next(err);
        }
    }
    async forgotPasswordByPhone(req, res, next) {
        try {
            const result = await authService.forgotPasswordByPhone(req.body);
            (0, response_1.success)(res, result, result.message);
        }
        catch (err) {
            next(err);
        }
    }
    async verifyResetOtp(req, res, next) {
        try {
            const result = await authService.verifyResetOtp(req.body);
            (0, response_1.success)(res, result, 'OTP verified');
        }
        catch (err) {
            next(err);
        }
    }
    async completeOnboarding(req, res, next) {
        try {
            const result = await authService.completeOnboarding(req.user.id);
            (0, response_1.success)(res, result, result.message);
        }
        catch (err) {
            next(err);
        }
    }
    async deactivateAccount(req, res, next) {
        try {
            const result = await authService.deactivateAccount(req.user.id);
            (0, response_1.success)(res, result, result.message);
        }
        catch (err) {
            next(err);
        }
    }
    async deleteAccount(req, res, next) {
        try {
            const result = await authService.deleteAccount(req.user.id);
            (0, response_1.success)(res, result, result.message);
        }
        catch (err) {
            next(err);
        }
    }
    async googleAuth(req, res, next) {
        try {
            const result = await authService.googleAuth(req.body);
            (0, response_1.success)(res, result, result.needsRole ? 'Role selection required' : 'Google sign-in successful');
        }
        catch (err) {
            next(err);
        }
    }
    async facebookAuth(req, res, next) {
        try {
            const result = await authService.facebookAuth(req.body);
            (0, response_1.success)(res, result, result.needsRole ? 'Role selection required' : 'Facebook sign-in successful');
        }
        catch (err) {
            next(err);
        }
    }
    async requestPhoneOtp(req, res, next) {
        try {
            const result = await authService.requestPhoneOtp(req.user.id, req.body);
            (0, response_1.success)(res, result, result.message);
        }
        catch (err) {
            next(err);
        }
    }
    async verifyPhoneOtp(req, res, next) {
        try {
            const result = await authService.verifyPhoneOtp(req.user.id, req.body);
            (0, response_1.success)(res, result, result.message);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map