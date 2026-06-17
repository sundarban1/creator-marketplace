"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const validate_1 = require("../../middleware/validate");
const auth_1 = require("../../middleware/auth");
const auth_schema_1 = require("./auth.schema");
const router = (0, express_1.Router)();
const ctrl = new auth_controller_1.AuthController();
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: Creates a new CREATOR or BUSINESS account with the associated profile
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePass123
 *               role:
 *                 type: string
 *                 enum: [CREATOR, BUSINESS]
 *                 example: CREATOR
 *               fullName:
 *                 type: string
 *                 description: Required when role is CREATOR
 *                 example: Jane Doe
 *               businessName:
 *                 type: string
 *                 description: Required when role is BUSINESS
 *                 example: Acme Corp
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Account created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', (0, validate_1.validate)(auth_schema_1.registerSchema), ctrl.register.bind(ctrl));
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane@example.com
 *               password:
 *                 type: string
 *                 example: SecurePass123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     accessToken:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     refreshToken:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', (0, validate_1.validate)(auth_schema_1.loginSchema), ctrl.login.bind(ctrl));
/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     description: Exchange a valid refresh token for a new access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refresh', (0, validate_1.validate)(auth_schema_1.refreshTokenSchema), ctrl.refresh.bind(ctrl));
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout (invalidate refresh token)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logout', auth_1.optionalAuthenticate, ctrl.logout.bind(ctrl));
/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset email
 *     description: Sends a password reset link to the user's email (always returns 200 to prevent email enumeration)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane@example.com
 *     responses:
 *       200:
 *         description: Reset email sent (if email exists)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: If that email exists, a reset link has been sent
 */
router.post('/forgot-password', (0, validate_1.validate)(auth_schema_1.forgotPasswordSchema), ctrl.forgotPassword.bind(ctrl));
/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: JWT reset token received via email
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: NewSecurePass456
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password reset successfully. Please login with your new password.
 *       400:
 *         description: Invalid or expired reset token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/reset-password', (0, validate_1.validate)(auth_schema_1.resetPasswordSchema), ctrl.resetPassword.bind(ctrl));
router.post('/verify-otp', (0, validate_1.validate)(auth_schema_1.verifyOtpSchema), ctrl.verifyOtp.bind(ctrl));
router.post('/resend-otp', (0, validate_1.validate)(auth_schema_1.resendOtpSchema), ctrl.resendOtp.bind(ctrl));
/**
 * @swagger
 * /api/auth/complete-onboarding:
 *   post:
 *     tags: [Auth]
 *     summary: Mark onboarding as complete for the logged-in user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding marked complete
 *       401:
 *         description: Not authenticated
 */
router.post('/complete-onboarding', auth_1.authenticate, ctrl.completeOnboarding.bind(ctrl));
router.patch('/deactivate', auth_1.authenticate, ctrl.deactivateAccount.bind(ctrl));
router.delete('/account', auth_1.authenticate, ctrl.deleteAccount.bind(ctrl));
/**
 * @swagger
 * /api/auth/forgot-password-phone:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset via phone OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+9779841234567"
 *     responses:
 *       200:
 *         description: OTP sent (always 200 to avoid phone enumeration)
 */
router.post('/forgot-password-phone', (0, validate_1.validate)(auth_schema_1.forgotPasswordByPhoneSchema), ctrl.forgotPasswordByPhone.bind(ctrl));
/**
 * @swagger
 * /api/auth/verify-reset-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify the phone OTP and receive a password reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, code]
 *             properties:
 *               phone:
 *                 type: string
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified — resetToken returned
 *       400:
 *         description: Invalid or expired code
 */
router.post('/verify-reset-otp', (0, validate_1.validate)(auth_schema_1.verifyResetOtpSchema), ctrl.verifyResetOtp.bind(ctrl));
exports.default = router;
//# sourceMappingURL=auth.routes.js.map