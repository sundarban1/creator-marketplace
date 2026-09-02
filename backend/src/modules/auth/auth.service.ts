import crypto from 'crypto';
import { AuthProvider, Prisma, Role } from '@prisma/client';
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
  signAppleLinkToken,
  verifyAppleLinkToken,
} from '../../utils/jwt';
import { verifyAppleIdentityToken, exchangeAppleAuthCode, revokeAppleToken, verifyAppleNotification } from '../../utils/apple';
import { synthesizePlaceholderEmail } from '../../utils/placeholderEmail';
import { sendPasswordResetOtpEmail, sendOtpEmail, sendWelcomeEmail } from '../../utils/email';
import { isSmsConfigured, sendOtpSms, sendPasswordResetOtpSms } from '../../utils/sms';
import { AuthRepository } from './auth.repository';
import { AdminRepository } from '../admin/admin.repository';
import { ReferralService } from '../referral/referral.service';
import { BusinessReferralService } from '../business-referral/business-referral.service';
import { notificationService } from '../notifications/notification.service';
import { logActivity } from '../logging/activity.service';
import { logAudit } from '../logging/audit.service';
import { ActivityAction, AuditAction } from '../logging/logging.constants';
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
  AppleAuthInput,
  AppleLinkInput,
  UnlinkProviderInput,
  AppleNotificationInput,
} from './auth.schema';

type Channel = 'email' | 'phone';

// Fixed dev code for phone-delivered OTPs when no SMS gateway is configured
// (isSmsConfigured() === false) — keeps the signup / forgot-password flows fully
// testable end-to-end. When Sparrow SMS is configured a real random code is
// generated and texted instead.
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
  private adminRepo: AdminRepository;
  private referralService: ReferralService;
  private businessReferralService: BusinessReferralService;

  constructor() {
    this.repo = new AuthRepository();
    this.adminRepo = new AdminRepository();
    this.referralService = new ReferralService();
    this.businessReferralService = new BusinessReferralService();
  }

  private async assertRegistrationEnabled(role: 'CREATOR' | 'BUSINESS'): Promise<void> {
    const key = role === 'CREATOR' ? 'creator.registrationEnabled' : 'business.registrationEnabled';
    const enabled = await this.adminRepo.getSetting(key);
    if (enabled === false) {
      throw new AppError(
        role === 'CREATOR'
          ? 'Creator registration is currently closed. Please check back later.'
          : 'Business registration is currently closed. Please check back later.',
        403,
      );
    }
  }

  // Issues + persists an account-verification OTP for the given channel. Email
  // always sends. Phone sends via SMS only when a gateway is configured;
  // otherwise it falls back to the fixed dev code and just logs.
  private async issueOtp(userId: string, channel: Channel, destination: string): Promise<void> {
    const smsLive = channel === 'phone' && isSmsConfigured();
    const code = channel === 'email' || smsLive ? generateOtp() : PHONE_OTP_CODE;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.repo.saveOtp(userId, code, expiresAt);

    if (channel === 'email') {
      await sendOtpEmail(destination, code);
    } else if (smsLive) {
      await sendOtpSms(destination, code);
    } else if (env.NODE_ENV !== 'production') {
      logger.debug({ phone: destination, code }, 'Phone OTP issued (SMS stub — not actually sent)');
    }
  }

  async register(input: RegisterInput, deviceId?: string) {
    await this.assertRegistrationEnabled(input.role);

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

    logActivity({ userId: user.id, action: ActivityAction.USER_REGISTERED, metadata: { role: input.role, channel, referralCode: input.referralCode } });

    await this.issueOtp(user.id, channel, channel === 'email' ? emailForRecord : phoneForRecord!);

    const joinedName = input.role === 'CREATOR' ? input.fullName : input.businessName;
    notificationService.createForAdmins({
      type:    input.role === 'CREATOR' ? 'creator_joined' : 'business_joined',
      title:   input.role === 'CREATOR' ? 'New Creator Joined' : 'New Brand Joined',
      // Fall back to the phone number, never the `<phone>@phone.kolab.internal`
      // placeholder that fills the required email column on a phone-only signup.
      body:    `${joinedName ?? phoneForRecord ?? emailForRecord} just signed up as a ${input.role === 'CREATOR' ? 'creator' : 'brand'}.`,
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
    await this.repo.createSession(verifiedUser.id, refreshToken);

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
      title:   'Account Verified',
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
    if (!isValidPassword) {
      const failedCount = await this.repo.incrementFailedLogin(user.id);
      // Off by default (see AdminRepository DEFAULTS) — this only adds a flag
      // to the error response once the threshold is hit; there's no CAPTCHA
      // challenge UI or provider verification wired up yet, so turning it on
      // has no visible effect until that ships.
      const captchaEnabled = await this.adminRepo.getSetting('rateLimit.captcha.enabled');
      const captchaThreshold = Number(await this.adminRepo.getSetting('rateLimit.captcha.failedAttemptThreshold')) || 3;
      const captchaRequired = captchaEnabled === true && failedCount >= captchaThreshold;
      throw new AppError(
        `Invalid ${channel === 'email' ? 'email' : 'phone number'} or password`,
        401,
        true,
        captchaRequired ? { captchaRequired: true } : undefined,
      );
    }
    if (user.failedLoginCount > 0) await this.repo.resetFailedLogin(user.id);

    const isVerified = channel === 'email' ? user.isEmailVerified : user.isPhoneVerified;
    if (!isVerified) {
      // Give the user a way back to verification instead of just dead-ending
      // here — same issueOtp() signup/resendOtp already use. Guarded by
      // hasValidOtp so a repeated login click doesn't re-send an OTP email
      // every time while a still-valid one is already pending.
      if (!(await this.repo.hasValidOtp(user.id))) {
        await this.issueOtp(user.id, channel, channel === 'email' ? user.email : normalizePhone(input.phone!));
      }
      throw new AppError(`Please verify your ${channel === 'email' ? 'email' : 'phone number'} before logging in`, 403);
    }

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
    await this.repo.createSession(activeUser.id, refreshToken, deviceId);
    if (deviceId) await this.repo.setDeviceId(activeUser.id, deviceId);

    logActivity({ userId: activeUser.id, action: ActivityAction.USER_LOGIN, metadata: { channel, reactivated, deviceId } });

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

    const session = await this.repo.findSessionByRefreshToken(input.refreshToken);
    if (!session) throw new AppError('Refresh token mismatch. Please login again.', 401);

    const user = await this.repo.findUserById(decoded.id);
    if (!user) throw new AppError('User not found', 401);

    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const accessToken  = signAccessToken(tokenPayload);
    return { accessToken };
  }

  // Only tears down the session for the calling device (its own refresh
  // token) so other logged-in devices stay signed in — see deleteAllSessions
  // for the flows (password reset, deactivate, delete) that intentionally
  // sign out everywhere.
  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.repo.deleteSessionByRefreshToken(userId, refreshToken);
    } else {
      await this.repo.deleteAllSessions(userId);
    }
    return { message: 'Logged out successfully' };
  }

  async deactivateAccount(userId: string) {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new AppError('User not found', 404);
    await this.repo.deactivateAccount(userId);
    await this.repo.deleteAllSessions(userId);

    notificationService.createForAdmins({
      type:    'account_deactivated',
      title:   'Account Deactivated',
      body:    `${user.email} deactivated their account.`,
      refId:   user.id,
      refType: 'user',
    }).catch(() => {});

    return { message: 'Account deactivated. Log in at any time to reactivate.' };
  }

  async deleteAccount(userId: string) {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new AppError('User not found', 404);

    // Sever the Apple ↔ Kolab link so that Apple ID can't sign back into the
    // deleted account (App Store requirement, spec §26). Best-effort — never
    // blocks the deletion. The AuthAccount row itself goes with the cascade.
    const appleAccount = await this.repo.findUserAuthAccount(userId, AuthProvider.APPLE);
    if (appleAccount?.refreshToken) {
      await revokeAppleToken(appleAccount.refreshToken, 'refresh_token');
    }

    await this.repo.deleteAccount(userId);

    notificationService.createForAdmins({
      type:    'account_deleted',
      title:   'Account Deleted',
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

    const smsLive = channel === 'phone' && isSmsConfigured();
    const code = channel === 'email' || smsLive ? generateOtp() : PHONE_OTP_CODE;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.repo.saveOtp(user.id, code, expiresAt);

    if (channel === 'email') {
      await sendPasswordResetOtpEmail(user.email, code);
    } else if (smsLive) {
      await sendPasswordResetOtpSms(normalizePhone(input.phone!), code);
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

    logAudit({ userId, action: AuditAction.PHONE_CHANGED, performedBy: userId });

    return { message: 'Phone number verified successfully' };
  }

  // Live-checks an email against the DB while a phone-signup account is
  // filling it in (onboarding, Settings) — `userId` excludes the caller's own
  // row so re-checking an email they already hold doesn't read as taken.
  async isEmailAvailable(email: string, userId: string) {
    const existing = await this.repo.findUserByEmail(email);
    return { available: !existing || existing.id === userId };
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

    logAudit({ userId, action: AuditAction.EMAIL_CHANGED, performedBy: userId });

    return { message: 'Email verified successfully' };
  }

  // Records the provider identity for a social sign-in without ever failing the
  // sign-in itself — the pre-existing Google/Facebook flows matched purely on
  // email and never stored the provider id, so this backfills the AuthAccount
  // row lazily as those users sign in again.
  private async recordProviderAccount(userId: string, provider: AuthProvider, providerUserId: string, email?: string | null) {
    try {
      await this.repo.upsertAuthAccount({ userId, provider, providerUserId, email });
    } catch (err) {
      logger.warn({ err, userId, provider }, 'Failed to record provider auth account (non-fatal)');
    }
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
      await this.recordProviderAccount(user!.id, AuthProvider.GOOGLE, gUser.id, gUser.email);
      const payload = { id: user!.id, email: user!.email, role: user!.role };
      const accessToken  = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);
      await this.repo.createSession(user!.id, refreshToken);
      return { needsRole: false as const, user: toUserDto(user!), accessToken, refreshToken, isNewUser: false };
    }

    if (!input.role) {
      return { needsRole: true as const, email: gUser.email, name: gUser.name ?? gUser.email.split('@')[0] };
    }

    await this.assertRegistrationEnabled(input.role);

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
    await this.repo.setHasPassword(verifiedUser.id, false);
    await this.recordProviderAccount(verifiedUser.id, AuthProvider.GOOGLE, gUser.id, gUser.email);

    const payload = { id: verifiedUser.id, email: verifiedUser.email, role: verifiedUser.role };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    await this.repo.createSession(verifiedUser.id, refreshToken);

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
      await this.recordProviderAccount(user!.id, AuthProvider.FACEBOOK, fbUser.id, fbUser.email);
      const payload = { id: user!.id, email: user!.email, role: user!.role };
      const accessToken  = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);
      await this.repo.createSession(user!.id, refreshToken);
      return { needsRole: false as const, user: toUserDto(user!), accessToken, refreshToken, isNewUser: false };
    }

    if (!input.role) {
      return { needsRole: true as const, email: fbUser.email, name: fbUser.name ?? fbUser.email.split('@')[0] };
    }

    await this.assertRegistrationEnabled(input.role);

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
    await this.repo.setHasPassword(verifiedUser.id, false);
    await this.recordProviderAccount(verifiedUser.id, AuthProvider.FACEBOOK, fbUser.id, fbUser.email);

    const payload = { id: verifiedUser.id, email: verifiedUser.email, role: verifiedUser.role };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    await this.repo.createSession(verifiedUser.id, refreshToken);

    return { needsRole: false as const, user: toUserDto(verifiedUser), accessToken, refreshToken, isNewUser: true };
  }

  // ── Sign in with Apple ─────────────────────────────────────────────────────
  //
  // Unlike Google/Facebook above, Apple identity is keyed on the verified `sub`
  // in an AuthAccount row — never on email (which can be a throwaway private
  // relay alias, and may already belong to a different Kolab account).

  async appleAuth(input: AppleAuthInput) {
    const { sub, email: tokenEmail } = await verifyAppleIdentityToken(input.identityToken);

    // Apple only returns the name on the very first authorization — keep it if we got it.
    const nameFromClient = [input.fullName?.givenName, input.fullName?.familyName]
      .filter(Boolean).join(' ').trim() || undefined;

    // 1. Known Apple identity → straight in.
    const linked = await this.repo.findAuthAccount(AuthProvider.APPLE, sub);
    if (linked) {
      const user = linked.user;
      if (!user.isActive) {
        if (user.suspendedAt) {
          throw new AppError('Your account has been suspended. Please contact admin support.', 403);
        }
        await this.repo.reactivateAccount(user.id);
      }
      const fresh = await this.repo.findUserById(user.id);
      const payload = { id: fresh!.id, email: fresh!.email, role: fresh!.role };
      const accessToken  = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);
      await this.repo.createSession(fresh!.id, refreshToken);
      logger.info({ userId: fresh!.id }, 'Apple authentication successful (existing)');
      return { needsRole: false as const, user: toUserDto(fresh!), accessToken, refreshToken, isNewUser: false };
    }

    // 2. New Apple identity. Prefer the email Apple signed into the token; fall
    //    back to the client-supplied one only when the token carried none.
    const resolvedEmail = (tokenEmail ?? (typeof input.email === 'string' ? input.email.toLowerCase() : undefined))?.trim() || undefined;

    // 2a. Email already belongs to a Kolab account → never merge silently.
    //     Hand back a short-lived link token; the client makes the user sign in
    //     with their existing method, then calls /apple/link (spec §14–16).
    if (resolvedEmail) {
      const emailOwner = await this.repo.findUserByEmail(resolvedEmail);
      if (emailOwner) {
        logger.info({ userId: emailOwner.id }, 'Apple sign-in requires account linking');
        throw new AppError(
          'This Apple account needs to be linked to an existing Kolab account.',
          409,
          true,
          { code: 'ACCOUNT_LINKING_REQUIRED', appleLinkToken: signAppleLinkToken({ sub, email: resolvedEmail, name: nameFromClient }) },
        );
      }
    }

    // 2b. Genuinely new user, but no role picked yet → let the client ask.
    if (!input.role) {
      return {
        needsRole: true as const,
        email: resolvedEmail ?? '',
        name: nameFromClient ?? (resolvedEmail ? resolvedEmail.split('@')[0] : ''),
      };
    }

    // 2c. Create the account. Apple only discloses the email on the *first*
    //     authorization of an Apple ID for this app — a user who authorized once
    //     before (then deleted the account, or bailed before it was created)
    //     signs in with no email every time after. Rather than dead-ending them,
    //     mint the account against a reserved non-routable placeholder address
    //     and flag it; onboarding then forces a real email through the existing
    //     request-email-otp / verify-email-otp flow (which clears the flag).
    const emailIsPlaceholder = !resolvedEmail;
    const accountEmail = resolvedEmail ?? synthesizePlaceholderEmail(sub);
    if (emailIsPlaceholder) {
      logger.info({ sub: sub.slice(0, 6) }, 'Apple sign-in returned no email — creating account with placeholder, onboarding will collect a real one');
    }

    await this.assertRegistrationEnabled(input.role);
    const hashedPassword = await hashPassword(crypto.randomBytes(32).toString('hex'));

    // Exchange the one-time auth code for a refresh token now — it's the only
    // handle Apple's revoke endpoint accepts on account deletion. Best-effort.
    const { refreshToken: appleRefreshToken } = input.authorizationCode
      ? await exchangeAppleAuthCode(input.authorizationCode)
      : {};

    try {
      const user = await this.repo.createUserWithProfileAndAppleAccount({
        email: accountEmail,
        password: hashedPassword,
        role: input.role === 'CREATOR' ? Role.CREATOR : Role.BUSINESS,
        sub,
        providerEmail: resolvedEmail ?? null,
        providerRefreshToken: appleRefreshToken ?? null,
        emailIsPlaceholder,
        fullName: input.role === 'CREATOR' ? nameFromClient : undefined,
        businessName: input.role === 'BUSINESS' ? nameFromClient : undefined,
      });
      const payload = { id: user!.id, email: user!.email, role: user!.role };
      const accessToken  = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);
      await this.repo.createSession(user!.id, refreshToken);
      logger.info({ userId: user!.id }, 'Apple account created');
      return { needsRole: false as const, user: toUserDto(user!), accessToken, refreshToken, isNewUser: true };
    } catch (err) {
      // Race: a concurrent first sign-in for the same sub won the unique
      // constraint. Re-resolve and log that user in (spec §28).
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const raced = await this.repo.findAuthAccount(AuthProvider.APPLE, sub);
        if (raced) {
          const payload = { id: raced.user.id, email: raced.user.email, role: raced.user.role };
          const accessToken  = signAccessToken(payload);
          const refreshToken = signRefreshToken(payload);
          await this.repo.createSession(raced.user.id, refreshToken);
          return { needsRole: false as const, user: toUserDto(raced.user), accessToken, refreshToken, isNewUser: false };
        }
      }
      throw err;
    }
  }

  // Attach a verified Apple identity to the already-authenticated user. The
  // route's auth middleware IS the proof of ownership of the existing account —
  // email similarity alone never grants this (spec §16).
  async appleLink(userId: string, input: AppleLinkInput) {
    // The identity comes from one of two places: the short-lived link token the
    // /apple endpoint minted during the sign-in linking flow, or a fresh
    // identityToken from a "Connect Apple" tap in Settings.
    let sub: string;
    let email: string | undefined;
    if (input.appleLinkToken) {
      try {
        const decoded = verifyAppleLinkToken(input.appleLinkToken);
        sub = decoded.sub;
        email = decoded.email;
      } catch {
        throw new AppError('This Apple link request has expired. Please try again.', 400);
      }
    } else {
      const verified = await verifyAppleIdentityToken(input.identityToken!);
      sub = verified.sub;
      email = verified.email;
    }

    const already = await this.repo.findAuthAccount(AuthProvider.APPLE, sub);
    if (already) {
      if (already.userId === userId) {
        return { user: toUserDto((await this.repo.findUserById(userId))!) };
      }
      throw new AppError('This Apple account is already linked to a different Kolab account.', 409);
    }

    const user = await this.repo.findUserById(userId);
    if (!user) throw new AppError('User not found', 404);

    // Settings "Connect Apple" also passes the auth code → exchange it now so a
    // later account deletion can revoke the Apple link. Best-effort.
    const { refreshToken: appleRefreshToken } = input.authorizationCode
      ? await exchangeAppleAuthCode(input.authorizationCode)
      : {};

    try {
      await this.repo.createAuthAccount({
        userId,
        provider: AuthProvider.APPLE,
        providerUserId: sub,
        email: email ?? null,
        refreshToken: appleRefreshToken ?? null,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError('This Apple account is already linked to a Kolab account.', 409);
      }
      throw err;
    }

    logAudit({ userId, action: AuditAction.APPLE_ACCOUNT_LINKED, performedBy: userId });
    logger.info({ userId }, 'Apple account linked');
    return { user: toUserDto(user) };
  }

  // Apple's server-to-server webhook. Every branch is idempotent (deleteMany /
  // plain logging) so Apple's retries are harmless — no event-dedupe table
  // needed. Never throws for a recognised-but-unhandled event: returning 2xx
  // stops Apple re-sending.
  async handleAppleNotification(input: AppleNotificationInput) {
    const evt = await verifyAppleNotification(input.payload);
    const account = await this.repo.findAuthAccount(AuthProvider.APPLE, evt.sub);

    switch (evt.type) {
      case 'account-delete':
      case 'consent-revoked': {
        // The user pulled the plug on Apple's side — sever the link so that
        // Apple ID can't sign back in. We do NOT delete the Kolab user: they
        // may still have a password / phone / Google.
        if (account) {
          await this.repo.deleteAuthAccountByProviderUserId(AuthProvider.APPLE, evt.sub);
          logAudit({ userId: account.userId, action: AuditAction.APPLE_ACCOUNT_UNLINKED, performedBy: account.userId });
          logger.info({ userId: account.userId, type: evt.type }, 'Apple link removed via S2S notification');
        }
        break;
      }
      case 'email-disabled':
      case 'email-enabled': {
        // Hide My Email forwarding toggled. Informational for now — wiring this
        // into transactional-email suppression is a follow-up.
        logger.info({ userId: account?.userId, type: evt.type }, 'Apple email-forwarding notification');
        break;
      }
      default: {
        logger.warn({ type: evt.type }, 'Unhandled Apple S2S notification type');
      }
    }

    return { received: true };
  }

  // ── Manage login methods (Settings → Security) ─────────────────────────────

  async getAuthMethods(userId: string) {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new AppError('User not found', 404);
    const accounts = await this.repo.listAuthAccounts(userId);
    return {
      hasPassword: user.hasPassword,
      email: user.email,
      phone: user.phone,
      providers: accounts.map((a) => ({
        provider: a.provider,
        email: a.email,
        linkedAt: a.createdAt.toISOString(),
      })),
    };
  }

  async unlinkProvider(userId: string, input: UnlinkProviderInput) {
    const provider = input.provider as AuthProvider;
    const user = await this.repo.findUserById(userId);
    if (!user) throw new AppError('User not found', 404);

    const accounts = await this.repo.listAuthAccounts(userId);
    const target = accounts.find((a) => a.provider === provider);
    if (!target) throw new AppError('That login method is not connected to your account.', 404);

    // Never leave the account with no way back in (spec §25). A usable method is
    // a real password or any OTHER linked provider.
    const remaining = (user.hasPassword ? 1 : 0) + accounts.filter((a) => a.provider !== provider).length;
    if (remaining === 0) {
      throw new AppError(
        'Add a password or another login method before disconnecting this one.',
        409,
        true,
        { code: 'LAST_LOGIN_METHOD' },
      );
    }

    // Best-effort Apple-side revoke so the disconnected Apple ID can't silently
    // stay authorized (spec §25/§26).
    if (provider === AuthProvider.APPLE) {
      const account = await this.repo.findUserAuthAccount(userId, AuthProvider.APPLE);
      if (account?.refreshToken) await revokeAppleToken(account.refreshToken, 'refresh_token');
    }

    await this.repo.deleteAuthAccount(userId, provider);
    logger.info({ userId, provider }, 'Login method unlinked');
    return this.getAuthMethods(userId);
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
    // A social-only account that just set a real password now has a
    // password login method.
    if (!user.hasPassword) await this.repo.setHasPassword(user.id, true);
    await this.repo.deleteAllSessions(user.id);

    logAudit({ userId: user.id, action: AuditAction.PASSWORD_RESET, performedBy: user.id });

    return { message: 'Password reset successfully. Please login with your new password.' };
  }
}
