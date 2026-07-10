import crypto from 'crypto';
import { Role } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { hashPassword, comparePassword } from '../../utils/hash';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signPasswordResetToken,
  verifyPasswordResetToken,
} from '../../utils/jwt';
import { sendPasswordResetOtpEmail, sendOtpEmail, sendWelcomeEmail } from '../../utils/email';
import { AuthRepository } from './auth.repository';
import { ReferralService } from '../referral/referral.service';
import { BusinessReferralService } from '../business-referral/business-referral.service';
import { notificationService } from '../notifications/notification.service';
import { toUserDto } from './auth.dto';
import type {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyOtpInput,
  ResendOtpInput,
  VerifyResetOtpInput,
  RequestPhoneOtpInput,
  VerifyPhoneOtpInput,
  RequestEmailOtpInput,
  VerifyEmailOtpInput,
  GoogleAuthInput,
  FacebookAuthInput,
} from './auth.schema';

type Channel = 'email' | 'phone';

// There is no SMS gateway wired up yet. Every phone-delivered OTP uses this fixed
// code so the flow is fully testable end-to-end; swap this for a real generated
// code + SMS send (e.g. Sparrow SMS for Nepal) once that integration ships.
const PHONE_OTP_CODE = '123456';
const PLACEHOLDER_EMAIL_DOMAIN = 'phone.kolab.internal';

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizePhone(phone: string): string {
  return phone.trim();
}

// Phone-only signups still need a value in the (required) `email` column. This
// placeholder is never sent to, never shown as a real email in the UI, and is
// replaced the moment the user adds & verifies a real one (see requestEmailOtp).
function makePlaceholderEmail(phone: string): string {
  return `${normalizePhone(phone)}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

export class AuthService {
  private repo: AuthRepository;
  private referralService: ReferralService;
  private businessReferralService: BusinessReferralService;

  constructor() {
    this.repo = new AuthRepository();
    this.referralService = new ReferralService();
    this.businessReferralService = new BusinessReferralService();
  }

  // Issues + persists an OTP for the given channel, sending it for real on the
  // email channel and using the fixed stub code on the phone channel.
  private async issueOtp(userId: string, channel: Channel, destination: string): Promise<void> {
    const code = channel === 'phone' ? PHONE_OTP_CODE : generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.repo.saveOtp(userId, code, expiresAt);

    if (channel === 'email') {
      await sendOtpEmail(destination, code);
    } else if (env.NODE_ENV !== 'production') {
      logger.debug({ phone: destination, code }, 'Phone OTP issued (SMS stub — not actually sent)');
    }
  }

  async register(input: RegisterInput, deviceId?: string) {
    const channel: Channel = input.email ? 'email' : 'phone';

    if (channel === 'email') {
      const existing = await this.repo.findUserByEmail(input.email!);
      if (existing) throw new AppError('An account with this email already exists', 409);
    } else {
      const existing = await this.repo.findUserByPhone(normalizePhone(input.phone!));
      if (existing) throw new AppError('An account with this phone number already exists', 409);
    }

    const hashedPassword = await hashPassword(input.password);
    const emailForRecord = channel === 'email' ? input.email! : makePlaceholderEmail(input.phone!);
    const phoneForRecord = channel === 'phone' ? normalizePhone(input.phone!) : undefined;

    let user;
    if (input.role === 'CREATOR') {
      user = await this.repo.createUserWithCreatorProfile({
        email: emailForRecord, phone: phoneForRecord, password: hashedPassword,
        role: Role.CREATOR, fullName: input.fullName,
      });
    } else {
      user = await this.repo.createUserWithBusinessProfile({
        email: emailForRecord, phone: phoneForRecord, password: hashedPassword,
        role: Role.BUSINESS, businessName: input.businessName,
      });
    }

    if (input.referralCode && 'creatorProfile' in user && user.creatorProfile) {
      // Best-effort: an invalid/expired code shouldn't block account creation.
      this.referralService.linkCreatorToReferrer(user.creatorProfile.id, input.referralCode)
        .catch((err) => logger.error({ err, userId: user.id }, 'Referral code linking failed at signup'));
    }
    if (input.referralCode && 'businessProfile' in user && user.businessProfile) {
      this.businessReferralService.linkBusinessToReferrer(user.businessProfile.id, input.referralCode)
        .catch((err) => logger.error({ err, userId: user.id }, 'Business referral code linking failed at signup'));
    }
    if (deviceId) await this.repo.setDeviceId(user.id, deviceId);

    await this.issueOtp(user.id, channel, channel === 'email' ? emailForRecord : phoneForRecord!);

    const joinedName = input.role === 'CREATOR' ? input.fullName : input.businessName;
    notificationService.createForAdmins({
      type:    input.role === 'CREATOR' ? 'creator_joined' : 'business_joined',
      title:   input.role === 'CREATOR' ? '👤 New Creator Joined' : '🏢 New Brand Joined',
      body:    `${joinedName ?? emailForRecord} just signed up as a ${input.role === 'CREATOR' ? 'creator' : 'brand'}.`,
      refId:   user.id,
      refType: 'user',
    }).catch(() => {});

    return channel === 'email' ? { channel, email: emailForRecord } : { channel, phone: phoneForRecord };
  }

  async verifyOtp(input: VerifyOtpInput) {
    const channel: Channel = input.email ? 'email' : 'phone';
    const user = channel === 'email'
      ? await this.repo.findUserByEmail(input.email!)
      : await this.repo.findUserByPhone(normalizePhone(input.phone!));
    if (!user) throw new AppError(`No account found with this ${channel === 'email' ? 'email' : 'phone number'}`, 404);

    const alreadyVerified = channel === 'email' ? user.isEmailVerified : user.isPhoneVerified;
    if (alreadyVerified) throw new AppError('This account is already verified', 400);

    const otp = await this.repo.findValidOtp(user.id, input.code);
    if (!otp) throw new AppError('Invalid or expired verification code', 400);

    const verifiedUser = channel === 'email'
      ? await this.repo.verifyEmail(user.id)
      : await this.repo.verifyPhoneFlag(user.id);
    await this.repo.deleteOtpsByUserId(user.id);

    const tokenPayload = { id: verifiedUser.id, email: verifiedUser.email, role: verifiedUser.role };
    const accessToken  = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);
    await this.repo.updateRefreshToken(verifiedUser.id, refreshToken);

    const verifiedDisplayName = verifiedUser.creatorProfile?.fullName
      ?? verifiedUser.businessProfile?.businessName
      ?? verifiedUser.email.split('@')[0];

    // Only fire a welcome email when we actually have a real, verified email —
    // a phone-signup account still holds a placeholder at this point.
    if (channel === 'email') {
      sendWelcomeEmail(verifiedUser.email, verifiedDisplayName, verifiedUser.role as 'CREATOR' | 'BUSINESS')
        .catch((err) => logger.error({ err, userId: verifiedUser.id }, 'Welcome email failed'));
    }

    notificationService.createForAdmins({
      type:    'account_verified',
      title:   '✅ Account Verified',
      body:    `${verifiedDisplayName} verified their ${channel === 'email' ? 'email' : 'phone number'}.`,
      refId:   verifiedUser.id,
      refType: 'user',
    }).catch(() => {});

    return { user: toUserDto(verifiedUser), accessToken, refreshToken };
  }

  async resendOtp(input: ResendOtpInput) {
    const channel: Channel = input.email ? 'email' : 'phone';
    const user = channel === 'email'
      ? await this.repo.findUserByEmail(input.email!)
      : await this.repo.findUserByPhone(normalizePhone(input.phone!));
    if (!user) throw new AppError(`No account found with this ${channel === 'email' ? 'email' : 'phone number'}`, 404);

    const alreadyVerified = channel === 'email' ? user.isEmailVerified : user.isPhoneVerified;
    if (alreadyVerified) throw new AppError('This account is already verified', 400);

    await this.issueOtp(user.id, channel, channel === 'email' ? user.email : normalizePhone(input.phone!));

    return { message: `Verification code resent to your ${channel === 'email' ? 'email' : 'phone number'}` };
  }

  async login(input: LoginInput, deviceId?: string) {
    const channel: Channel = input.email ? 'email' : 'phone';
    const user = channel === 'email'
      ? await this.repo.findUserByEmail(input.email!)
      : await this.repo.findUserByPhone(normalizePhone(input.phone!));
    if (!user) throw new AppError(`Invalid ${channel === 'email' ? 'email' : 'phone number'} or password`, 401);

    const isValidPassword = await comparePassword(input.password, user.password);
    if (!isValidPassword) throw new AppError(`Invalid ${channel === 'email' ? 'email' : 'phone number'} or password`, 401);

    const isVerified = channel === 'email' ? user.isEmailVerified : user.isPhoneVerified;
    if (!isVerified) throw new AppError(`Please verify your ${channel === 'email' ? 'email' : 'phone number'} before logging in`, 403);

    // Admin-suspended accounts are blocked outright — never silently
    // reactivated. Self-deactivated accounts (suspendedAt null) still
    // auto-reactivate on next login, per deactivateAccount()'s promise.
    let activeUser = user;
    let reactivated = false;
    if (!user.isActive) {
      if (user.suspendedAt) {
        throw new AppError('Your account has been suspended. Please contact admin support.', 403);
      }
      activeUser = await this.repo.reactivateAccount(user.id);
      reactivated = true;
    }

    const tokenPayload = { id: activeUser.id, email: activeUser.email, role: activeUser.role };
    const accessToken  = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);
    await this.repo.updateRefreshToken(activeUser.id, refreshToken);
    if (deviceId) await this.repo.setDeviceId(activeUser.id, deviceId);

    return { user: toUserDto(activeUser), accessToken, refreshToken, reactivated };
  }

  async completeOnboarding(userId: string) {
    await this.repo.setOnboarded(userId);
    return { message: 'Onboarding complete' };
  }

  async refresh(input: RefreshTokenInput) {
    let decoded;
    try {
      decoded = verifyRefreshToken(input.refreshToken);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = await this.repo.findUserById(decoded.id);
    if (!user) throw new AppError('User not found', 401);
    if (user.refreshToken !== input.refreshToken) throw new AppError('Refresh token mismatch. Please login again.', 401);

    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const accessToken  = signAccessToken(tokenPayload);
    return { accessToken };
  }

  async logout(userId: string) {
    await this.repo.updateRefreshToken(userId, null);
    return { message: 'Logged out successfully' };
  }

  async deactivateAccount(userId: string) {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new AppError('User not found', 404);
    await this.repo.deactivateAccount(userId);

    notificationService.createForAdmins({
      type:    'account_deactivated',
      title:   '⏸️ Account Deactivated',
      body:    `${user.email} deactivated their account.`,
      refId:   user.id,
      refType: 'user',
    }).catch(() => {});

    return { message: 'Account deactivated. Log in at any time to reactivate.' };
  }

  async deleteAccount(userId: string) {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new AppError('User not found', 404);
    await this.repo.deleteAccount(userId);

    notificationService.createForAdmins({
      type:    'account_deleted',
      title:   '🗑️ Account Deleted',
      body:    `${user.email} permanently deleted their account.`,
    }).catch(() => {});

    return { message: 'Account permanently deleted.' };
  }

  // ── Forgot password (email or phone — same logic, different delivery) ───────

  async forgotPassword(input: ForgotPasswordInput) {
    const channel: Channel = input.email ? 'email' : 'phone';
    const genericMessage = `If that ${channel === 'email' ? 'email' : 'phone number'} is registered, a reset code has been sent`;

    const user = channel === 'email'
      ? await this.repo.findUserByEmail(input.email!)
      : await this.repo.findUserByPhone(normalizePhone(input.phone!));
    if (!user) return { message: genericMessage }; // don't leak whether the identifier exists

    const code = channel === 'phone' ? PHONE_OTP_CODE : generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.repo.saveOtp(user.id, code, expiresAt);

    if (channel === 'email') {
      await sendPasswordResetOtpEmail(user.email, code);
    } else if (env.NODE_ENV !== 'production') {
      logger.debug({ phone: input.phone, code }, 'Password reset OTP issued (SMS stub — not actually sent)');
    }

    return { message: genericMessage };
  }

  async verifyResetOtp(input: VerifyResetOtpInput) {
    const channel: Channel = input.email ? 'email' : 'phone';
    const user = channel === 'email'
      ? await this.repo.findUserByEmail(input.email!)
      : await this.repo.findUserByPhone(normalizePhone(input.phone!));
    if (!user) throw new AppError(`No account found with this ${channel === 'email' ? 'email' : 'phone number'}`, 404);

    const otp = await this.repo.findValidOtp(user.id, input.code);
    if (!otp) throw new AppError('Invalid or expired code', 400);

    await this.repo.deleteOtpsByUserId(user.id);

    const resetToken = signPasswordResetToken({ id: user.id, email: user.email });
    return { resetToken };
  }

  // ── Add & verify a phone number on an existing account ───────────────────────

  async requestPhoneOtp(userId: string, input: RequestPhoneOtpInput) {
    const phone = normalizePhone(input.phone);
    const existing = await this.repo.findUserByPhone(phone);
    if (existing && existing.id !== userId) {
      throw new AppError('This phone number is already in use by another account', 409);
    }
    const user = await this.repo.findUserById(userId);
    if (!user) throw new AppError('User not found', 404);

    await this.issueOtp(userId, 'phone', phone);
    return { message: 'Verification code sent to your phone number' };
  }

  async verifyPhoneOtp(userId: string, input: VerifyPhoneOtpInput) {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new AppError('User not found', 404);

    const otp = await this.repo.findValidOtp(userId, input.code);
    if (!otp) throw new AppError('Invalid or expired verification code', 400);

    await this.repo.deleteOtpsByUserId(userId);
    await this.repo.updateUserPhone(userId, normalizePhone(input.phone));

    return { message: 'Phone number verified successfully' };
  }

  // ── Add & verify a real email on an existing (phone-signup) account ─────────

  async requestEmailOtp(userId: string, input: RequestEmailOtpInput) {
    const existing = await this.repo.findUserByEmail(input.email);
    if (existing && existing.id !== userId) {
      throw new AppError('This email is already in use by another account', 409);
    }
    const user = await this.repo.findUserById(userId);
    if (!user) throw new AppError('User not found', 404);

    await this.issueOtp(userId, 'email', input.email);
    return { message: 'Verification code sent to your email' };
  }

  async verifyEmailOtp(userId: string, input: VerifyEmailOtpInput) {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new AppError('User not found', 404);

    const otp = await this.repo.findValidOtp(userId, input.code);
    if (!otp) throw new AppError('Invalid or expired verification code', 400);

    await this.repo.deleteOtpsByUserId(userId);
    await this.repo.updateUserEmail(userId, input.email);

    return { message: 'Email verified successfully' };
  }

  async googleAuth(input: GoogleAuthInput) {
    const googleRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });
    if (!googleRes.ok) throw new AppError('Invalid or expired Google token. Please try again.', 401);

    const gUser = await googleRes.json() as { id: string; email: string; name?: string; picture?: string };
    if (!gUser.email) throw new AppError('Could not retrieve email from Google.', 400);

    const existing = await this.repo.findUserByEmail(gUser.email);

    if (existing) {
      if (!existing.isActive) {
        if (existing.suspendedAt) {
          throw new AppError('Your account has been suspended. Please contact admin support.', 403);
        }
        await this.repo.reactivateAccount(existing.id);
      }
      const user = await this.repo.findUserById(existing.id);
      const payload = { id: user!.id, email: user!.email, role: user!.role };
      const accessToken  = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);
      await this.repo.updateRefreshToken(user!.id, refreshToken);
      return { needsRole: false as const, user: toUserDto(user!), accessToken, refreshToken, isNewUser: false };
    }

    if (!input.role) {
      return { needsRole: true as const, email: gUser.email, name: gUser.name ?? gUser.email.split('@')[0] };
    }

    const hashedPassword = await hashPassword(crypto.randomBytes(32).toString('hex'));

    let createdUser;
    if (input.role === 'CREATOR') {
      createdUser = await this.repo.createUserWithCreatorProfile({
        email: gUser.email, password: hashedPassword, role: Role.CREATOR, fullName: gUser.name,
      });
    } else {
      createdUser = await this.repo.createUserWithBusinessProfile({
        email: gUser.email, password: hashedPassword, role: Role.BUSINESS, businessName: gUser.name,
      });
    }

    // Google has already verified the email — mark it verified without OTP
    const verifiedUser = await this.repo.verifyEmail(createdUser.id);

    const payload = { id: verifiedUser.id, email: verifiedUser.email, role: verifiedUser.role };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    await this.repo.updateRefreshToken(verifiedUser.id, refreshToken);

    return { needsRole: false as const, user: toUserDto(verifiedUser), accessToken, refreshToken, isNewUser: true };
  }

  async facebookAuth(input: FacebookAuthInput) {
    const fbRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${input.accessToken}`
    );
    if (!fbRes.ok) throw new AppError('Invalid or expired Facebook token. Please try again.', 401);

    const fbUser = await fbRes.json() as { id: string; name?: string; email?: string };
    if (!fbUser.email) throw new AppError('Facebook account has no email. Please use a different sign-in method.', 400);

    const existing = await this.repo.findUserByEmail(fbUser.email);

    if (existing) {
      if (!existing.isActive) {
        if (existing.suspendedAt) {
          throw new AppError('Your account has been suspended. Please contact admin support.', 403);
        }
        await this.repo.reactivateAccount(existing.id);
      }
      const user = await this.repo.findUserById(existing.id);
      const payload = { id: user!.id, email: user!.email, role: user!.role };
      const accessToken  = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);
      await this.repo.updateRefreshToken(user!.id, refreshToken);
      return { needsRole: false as const, user: toUserDto(user!), accessToken, refreshToken, isNewUser: false };
    }

    if (!input.role) {
      return { needsRole: true as const, email: fbUser.email, name: fbUser.name ?? fbUser.email.split('@')[0] };
    }

    const hashedPassword = await hashPassword(crypto.randomBytes(32).toString('hex'));

    let createdUser;
    if (input.role === 'CREATOR') {
      createdUser = await this.repo.createUserWithCreatorProfile({
        email: fbUser.email, password: hashedPassword, role: Role.CREATOR, fullName: fbUser.name,
      });
    } else {
      createdUser = await this.repo.createUserWithBusinessProfile({
        email: fbUser.email, password: hashedPassword, role: Role.BUSINESS, businessName: fbUser.name,
      });
    }

    const verifiedUser = await this.repo.verifyEmail(createdUser.id);

    const payload = { id: verifiedUser.id, email: verifiedUser.email, role: verifiedUser.role };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    await this.repo.updateRefreshToken(verifiedUser.id, refreshToken);

    return { needsRole: false as const, user: toUserDto(verifiedUser), accessToken, refreshToken, isNewUser: true };
  }

  async resetPassword(input: ResetPasswordInput) {
    let decoded;
    try {
      decoded = verifyPasswordResetToken(input.token);
    } catch {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const user = await this.repo.findUserById(decoded.id);
    if (!user) throw new AppError('User not found', 404);

    const hashedPassword = await hashPassword(input.newPassword);
    await this.repo.updatePassword(user.id, hashedPassword);
    return { message: 'Password reset successfully. Please login with your new password.' };
  }
}
