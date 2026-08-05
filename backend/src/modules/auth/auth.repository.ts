import { Role } from '@prisma/client';
import prisma from '../../prisma';

const profileSelect = {
  creatorProfile:  { select: { id: true, username: true, fullName: true, avatarUrl: true } },
  businessProfile: { select: { id: true, businessName: true, logoUrl: true } },
} as const;

export class AuthRepository {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, include: profileSelect });
  }

  async findUserById(id: string) {
    return prisma.user.findUnique({ where: { id }, include: profileSelect });
  }

  async findUserByPhone(phone: string) {
    return prisma.user.findUnique({ where: { phone }, include: profileSelect });
  }

  async createUserWithCreatorProfile(data: {
    email: string;
    phone?: string;
    password: string;
    role: Role;
    fullName?: string;
  }) {
    return prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone ?? null,
        password: data.password,
        role: data.role,
        creatorProfile: { create: { fullName: data.fullName ?? null } },
      },
      include: { creatorProfile: true },
    });
  }

  async createUserWithBusinessProfile(data: {
    email: string;
    phone?: string;
    password: string;
    role: Role;
    businessName?: string;
  }) {
    return prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone ?? null,
        password: data.password,
        role: data.role,
        businessProfile: { create: { businessName: data.businessName ?? null } },
      },
      include: { businessProfile: true },
    });
  }

  async createSession(userId: string, refreshToken: string, deviceId?: string) {
    return prisma.session.create({ data: { userId, refreshToken, deviceId } });
  }

  async findSessionByRefreshToken(refreshToken: string) {
    return prisma.session.findUnique({ where: { refreshToken } });
  }

  async deleteSessionByRefreshToken(userId: string, refreshToken: string) {
    await prisma.session.deleteMany({ where: { userId, refreshToken } });
  }

  async deleteAllSessions(userId: string) {
    await prisma.session.deleteMany({ where: { userId } });
  }

  async setDeviceId(userId: string, deviceId: string) {
    return prisma.user.update({ where: { id: userId }, data: { deviceId } });
  }

  // Drives the admin-configurable CAPTCHA-after-suspicious-behaviour trigger
  // — see AuthService.login.
  async incrementFailedLogin(userId: string): Promise<number> {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: { increment: 1 }, lastFailedLoginAt: new Date() },
      select: { failedLoginCount: true },
    });
    return updated.failedLoginCount;
  }

  async resetFailedLogin(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: 0 },
    });
  }

  async updatePassword(userId: string, hashedPassword: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async verifyEmail(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
      include: profileSelect,
    });
  }

  async setOnboarded(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { isOnboarded: true },
    });
  }

  async deactivateAccount(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  async reactivateAccount(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive: true, suspendedAt: null },
      include: profileSelect,
    });
  }

  async deleteAccount(userId: string) {
    return prisma.user.delete({ where: { id: userId } });
  }

  async saveOtp(userId: string, code: string, expiresAt: Date) {
    await prisma.otpVerification.deleteMany({ where: { userId } });
    return prisma.otpVerification.create({ data: { userId, code, expiresAt } });
  }

  async findValidOtp(userId: string, code: string) {
    return prisma.otpVerification.findFirst({
      where: { userId, code, expiresAt: { gt: new Date() } },
    });
  }

  // No `code` filter, unlike findValidOtp — used to check whether one is
  // already pending before issuing another (see AuthService.login), so a
  // repeated login click on an unverified account doesn't spam a new OTP
  // email every time while a still-valid one is already in flight.
  async hasValidOtp(userId: string): Promise<boolean> {
    const otp = await prisma.otpVerification.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
    });
    return !!otp;
  }

  async deleteOtpsByUserId(userId: string) {
    return prisma.otpVerification.deleteMany({ where: { userId } });
  }

  async updateUserPhone(userId: string, phone: string) {
    return prisma.user.update({ where: { id: userId }, data: { phone, isPhoneVerified: true } });
  }

  async verifyPhoneFlag(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { isPhoneVerified: true },
      include: profileSelect,
    });
  }

  async updateUserEmail(userId: string, email: string) {
    return prisma.user.update({ where: { id: userId }, data: { email, isEmailVerified: true } });
  }
}
