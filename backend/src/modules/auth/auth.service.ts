import crypto from 'crypto';
import { Role } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { hashPassword, comparePassword } from '../../utils/hash';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signPasswordResetToken,
  verifyPasswordResetToken,
} from '../../utils/jwt';
import { sendPasswordResetEmail, sendOtpEmail, sendWelcomeEmail } from '../../utils/email';
import { AuthRepository } from './auth.repository';
import type {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyOtpInput,
  ResendOtpInput,
  ForgotPasswordByPhoneInput,
  VerifyResetOtpInput,
  RequestPhoneOtpInput,
  VerifyPhoneOtpInput,
  GoogleAuthInput,
  FacebookAuthInput,
} from './auth.schema';

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function buildUserResponse(user: {
  id: string; email: string; phone: string | null; role: Role;
  isEmailVerified: boolean; isOnboarded: boolean;
  createdAt: Date; updatedAt: Date;
  creatorProfile?: { id: string; username: string | null; fullName: string | null; avatarUrl: string | null } | null;
  businessProfile?: { id: string; businessName: string | null; logoUrl: string | null } | null;
}) {
  const name   = user.creatorProfile?.fullName ?? user.businessProfile?.businessName ?? user.email.split('@')[0];
  const avatar = user.creatorProfile?.avatarUrl ?? user.businessProfile?.logoUrl ?? null;
  return { id: user.id, email: user.email, phone: user.phone, role: user.role,
           isEmailVerified: user.isEmailVerified, isOnboarded: user.isOnboarded,
           createdAt: user.createdAt, updatedAt: user.updatedAt,
           creatorProfile: user.creatorProfile ?? null,
           businessProfile: user.businessProfile ?? null,
           name, avatar };
}

export class AuthService {
  private repo: AuthRepository;

  constructor() {
    this.repo = new AuthRepository();
  }

  async register(input: RegisterInput) {
    const [existingEmail, existingPhone] = await Promise.all([
      this.repo.findUserByEmail(input.email),
      input.phone ? this.repo.findUserByPhone(input.phone) : Promise.resolve(null),
    ]);
    if (existingEmail) throw new AppError('An account with this email already exists', 409);
    if (existingPhone) throw new AppError('An account with this phone number already exists', 409);

    const hashedPassword = await hashPassword(input.password);

    let user;
    if (input.role === 'CREATOR') {
      user = await this.repo.createUserWithCreatorProfile({
        email: input.email, phone: input.phone, password: hashedPassword,
        role: Role.CREATOR, fullName: input.fullName,
      });
    } else {
      user = await this.repo.createUserWithBusinessProfile({
        email: input.email, phone: input.phone, password: hashedPassword,
        role: Role.BUSINESS, businessName: input.businessName,
      });
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.repo.saveOtp(user.id, code, expiresAt);
    await sendOtpEmail(user.email, code);

    console.log(`\n🔑 OTP for ${user.email}: ${code}\n`);
    return { email: user.email };
  }

  async verifyOtp(input: VerifyOtpInput) {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user) throw new AppError('No account found with this email', 404);
    if (user.isEmailVerified) throw new AppError('This account is already verified', 400);

    const otp = await this.repo.findValidOtp(user.id, input.code);
    if (!otp) throw new AppError('Invalid or expired verification code', 400);

    const verifiedUser = await this.repo.verifyEmail(user.id);
    await this.repo.deleteOtpsByUserId(user.id);

    const tokenPayload = { id: verifiedUser.id, email: verifiedUser.email, role: verifiedUser.role };
    const accessToken  = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);
    await this.repo.updateRefreshToken(verifiedUser.id, refreshToken);

    // Fire welcome email without blocking the response
    const displayName = verifiedUser.creatorProfile?.fullName
      ?? verifiedUser.businessProfile?.businessName
      ?? verifiedUser.email.split('@')[0];
    sendWelcomeEmail(verifiedUser.email, displayName, verifiedUser.role as 'CREATOR' | 'BUSINESS')
      .catch((err) => console.error('Welcome email failed:', err));

    return { user: buildUserResponse(verifiedUser), accessToken, refreshToken };
  }

  async resendOtp(input: ResendOtpInput) {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user) throw new AppError('No account found with this email', 404);
    if (user.isEmailVerified) throw new AppError('This account is already verified', 400);

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.repo.saveOtp(user.id, code, expiresAt);
    await sendOtpEmail(user.email, code);

    console.log(`\n🔑 Resent OTP for ${user.email}: ${code}\n`);
    return { message: 'Verification code resent to your email' };
  }

  async login(input: LoginInput) {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user) throw new AppError('Invalid email or password', 401);

    const isValidPassword = await comparePassword(input.password, user.password);
    if (!isValidPassword) throw new AppError('Invalid email or password', 401);
    if (!user.isEmailVerified) throw new AppError('Please verify your email before logging in', 403);

    // Auto-reactivate deactivated accounts on login
    let activeUser = user;
    let reactivated = false;
    if (!user.isActive) {
      activeUser = await this.repo.reactivateAccount(user.id);
      reactivated = true;
    }

    const tokenPayload = { id: activeUser.id, email: activeUser.email, role: activeUser.role };
    const accessToken  = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);
    await this.repo.updateRefreshToken(activeUser.id, refreshToken);

    return { user: buildUserResponse(activeUser), accessToken, refreshToken, reactivated };
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
    return { message: 'Account deactivated. Log in at any time to reactivate.' };
  }

  async deleteAccount(userId: string) {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new AppError('User not found', 404);
    await this.repo.deleteAccount(userId);
    return { message: 'Account permanently deleted.' };
  }

  async forgotPasswordByPhone(input: ForgotPasswordByPhoneInput) {
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

  async verifyResetOtp(input: VerifyResetOtpInput) {
    const user = await this.repo.findUserByPhone(input.phone);
    if (!user) throw new AppError('No account found with this phone number', 404);

    const otp = await this.repo.findValidOtp(user.id, input.code);
    if (!otp) throw new AppError('Invalid or expired code', 400);

    await this.repo.deleteOtpsByUserId(user.id);

    // Issue a short-lived reset token (reuses the same JWT util as email reset)
    const resetToken = signPasswordResetToken({ id: user.id, email: user.email });
    return { resetToken };
  }

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user) return { message: 'If that email exists, a reset link has been sent' };

    const resetToken = signPasswordResetToken({ id: user.id, email: user.email });
    await sendPasswordResetEmail(user.email, resetToken);
    return { message: 'If that email exists, a reset link has been sent' };
  }

  async requestPhoneOtp(userId: string, input: RequestPhoneOtpInput) {
    const phone = input.phone.trim();
    const existing = await this.repo.findUserByPhone(phone);
    if (existing && existing.id !== userId) {
      throw new AppError('This phone number is already in use by another account', 409);
    }
    const user = await this.repo.findUserById(userId);
    if (!user) throw new AppError('User not found', 404);

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.repo.saveOtp(userId, code, expiresAt);

    // In production: integrate an SMS gateway (e.g. Sparrow SMS for Nepal).
    // For now, log the OTP to the console.
    console.log(`\n📱 Phone verification OTP for ${phone}: ${code}\n`);

    return { message: 'Verification code sent to your phone number' };
  }

  async verifyPhoneOtp(userId: string, input: VerifyPhoneOtpInput) {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new AppError('User not found', 404);

    const otp = await this.repo.findValidOtp(userId, input.code);
    if (!otp) throw new AppError('Invalid or expired verification code', 400);

    await this.repo.deleteOtpsByUserId(userId);
    await this.repo.updateUserPhone(userId, input.phone.trim());

    return { message: 'Phone number verified successfully' };
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
      if (!existing.isActive) await this.repo.reactivateAccount(existing.id);
      const user = await this.repo.findUserById(existing.id);
      const payload = { id: user!.id, email: user!.email, role: user!.role };
      const accessToken  = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);
      await this.repo.updateRefreshToken(user!.id, refreshToken);
      return { needsRole: false as const, user: buildUserResponse(user!), accessToken, refreshToken, isNewUser: false };
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

    return { needsRole: false as const, user: buildUserResponse(verifiedUser), accessToken, refreshToken, isNewUser: true };
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
      if (!existing.isActive) await this.repo.reactivateAccount(existing.id);
      const user = await this.repo.findUserById(existing.id);
      const payload = { id: user!.id, email: user!.email, role: user!.role };
      const accessToken  = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);
      await this.repo.updateRefreshToken(user!.id, refreshToken);
      return { needsRole: false as const, user: buildUserResponse(user!), accessToken, refreshToken, isNewUser: false };
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

    return { needsRole: false as const, user: buildUserResponse(verifiedUser), accessToken, refreshToken, isNewUser: true };
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
