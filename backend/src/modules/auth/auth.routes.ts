import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate, optionalAuthenticate } from '../../middleware/auth';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyOtpSchema,
  resendOtpSchema,
  verifyResetOtpSchema,
  requestPhoneOtpSchema,
  verifyPhoneOtpSchema,
  requestEmailOtpSchema,
  verifyEmailOtpSchema,
  googleAuthSchema,
  facebookAuthSchema,
} from './auth.schema';

const router = Router();
const ctrl = new AuthController();

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
router.post('/register', validate(registerSchema), ctrl.register.bind(ctrl));

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
router.post('/login', validate(loginSchema), ctrl.login.bind(ctrl));

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
router.post('/refresh', validate(refreshTokenSchema), ctrl.refresh.bind(ctrl));

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
router.post('/logout', optionalAuthenticate, ctrl.logout.bind(ctrl));

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset code (email or phone)
 *     description: Accepts either `email` or `phone` (never both) and sends a 6-digit reset code down that same channel. Always returns 200 to prevent account enumeration.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane@example.com
 *               phone:
 *                 type: string
 *                 example: "+9779841234567"
 *     responses:
 *       200:
 *         description: Reset code sent (if the identifier is registered)
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
 *                   example: If that email is registered, a reset code has been sent
 */
router.post('/forgot-password', validate(forgotPasswordSchema), ctrl.forgotPassword.bind(ctrl));

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
router.post('/reset-password', validate(resetPasswordSchema), ctrl.resetPassword.bind(ctrl));

router.post('/verify-otp', validate(verifyOtpSchema), ctrl.verifyOtp.bind(ctrl));
router.post('/resend-otp', validate(resendOtpSchema), ctrl.resendOtp.bind(ctrl));

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
router.post('/complete-onboarding', authenticate, ctrl.completeOnboarding.bind(ctrl));
router.patch('/deactivate',         authenticate, ctrl.deactivateAccount.bind(ctrl));
router.delete('/account',           authenticate, ctrl.deleteAccount.bind(ctrl));

/**
 * @swagger
 * /api/auth/verify-reset-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify a password-reset code (email or phone) and receive a reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               email:
 *                 type: string
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
router.post('/verify-reset-otp',    validate(verifyResetOtpSchema),    ctrl.verifyResetOtp.bind(ctrl));
router.post('/request-phone-otp',   authenticate, validate(requestPhoneOtpSchema), ctrl.requestPhoneOtp.bind(ctrl));
router.post('/verify-phone-otp',    authenticate, validate(verifyPhoneOtpSchema),  ctrl.verifyPhoneOtp.bind(ctrl));

/**
 * @swagger
 * /api/auth/request-email-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Add & verify a real email on the logged-in account
 *     description: For phone-signup accounts that still hold a placeholder email. Sends a 6-digit code to the given email.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Verification code sent to the email
 */
/**
 * @swagger
 * /api/auth/email-available:
 *   get:
 *     tags: [Auth]
 *     summary: Check whether an email is free to attach to the logged-in account
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *     responses:
 *       200:
 *         description: Availability checked
 */
router.get('/email-available',      authenticate, ctrl.checkEmailAvailability.bind(ctrl));

router.post('/request-email-otp',   authenticate, validate(requestEmailOtpSchema), ctrl.requestEmailOtp.bind(ctrl));

/**
 * @swagger
 * /api/auth/verify-email-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify the email code and attach it to the logged-in account
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email verified and attached to the account
 */
router.post('/verify-email-otp',    authenticate, validate(verifyEmailOtpSchema),  ctrl.verifyEmailOtp.bind(ctrl));

router.post('/google',              validate(googleAuthSchema),          ctrl.googleAuth.bind(ctrl));
router.post('/facebook',            validate(facebookAuthSchema),        ctrl.facebookAuth.bind(ctrl));

export default router;
