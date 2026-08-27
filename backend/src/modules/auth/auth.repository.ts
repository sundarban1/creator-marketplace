import { AuthProvider, Role } from '@prisma/client';
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

  // ── Provider identities (Apple / Google / Facebook) ─────────────────────────

  async listAuthAccounts(userId: string) {
    return prisma.authAccount.findMany({
      where: { userId },
      select: { provider: true, email: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteAuthAccount(userId: string, provider: AuthProvider) {
    return prisma.authAccount.deleteMany({ where: { userId, provider } });
  }

  // By provider identity rather than userId — used by the Apple S2S webhook,
  // which only knows the `sub`. deleteMany keeps it idempotent under retries.
  async deleteAuthAccountByProviderUserId(provider: AuthProvider, providerUserId: string) {
    return prisma.authAccount.deleteMany({ where: { provider, providerUserId } });
  }

  // Includes `refreshToken` (unlike listAuthAccounts) — used only where a
  // provider-side revoke needs it (account deletion, unlink).
  async findUserAuthAccount(userId: string, provider: AuthProvider) {
    return prisma.authAccount.findFirst({ where: { userId, provider } });
  }

  async setAuthAccountRefreshToken(userId: string, provider: AuthProvider, refreshToken: string | null) {
    return prisma.authAccount.updateMany({ where: { userId, provider }, data: { refreshToken } });
  }

  async setHasPassword(userId: string, hasPassword: boolean) {
    return prisma.user.update({ where: { id: userId }, data: { hasPassword } });
  }

  async findAuthAccount(provider: AuthProvider, providerUserId: string) {
    return prisma.authAccount.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
      include: { user: { include: profileSelect } },
    });
  }

  async createAuthAccount(data: {
    userId: string;
    provider: AuthProvider;
    providerUserId: string;
    email?: string | null;
    refreshToken?: string | null;
  }) {
    return prisma.authAccount.create({
      data: {
        userId: data.userId,
        provider: data.provider,
        providerUserId: data.providerUserId,
        email: data.email ?? null,
        refreshToken: data.refreshToken ?? null,
      },
    });
  }

  // Best-effort convergence for the pre-existing Google/Facebook flows, which
  // historically matched purely on email and never recorded the provider id.
  // Called after a successful social sign-in so the row exists going forward;
  // never throws into the sign-in path.
  async upsertAuthAccount(data: {
    userId: string;
    provider: AuthProvider;
    providerUserId: string;
    email?: string | null;
  }) {
    return prisma.authAccount.upsert({
      where: { provider_providerUserId: { provider: data.provider, providerUserId: data.providerUserId } },
      create: {
        userId: data.userId,
        provider: data.provider,
        providerUserId: data.providerUserId,
        email: data.email ?? null,
      },
      update: { email: data.email ?? null },
    });
  }

  // Creates the User (+ role profile) and its Apple AuthAccount in one
  // transaction — never leaves a user without the provider row that identifies
  // how they signed up (spec §29). Email is marked verified: Apple verified it.
  async createUserWithProfileAndAppleAccount(data: {
    email: string;
    password: string;
    role: Role;
    sub: string;
    providerEmail?: string | null;
    providerRefreshToken?: string | null;
    fullName?: string | null;
    businessName?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: data.email,
          password: data.password,
          role: data.role,
          isEmailVerified: true,
          // Random unusable password — this is a social-only account until the
          // user runs a password reset.
          hasPassword: false,
          ...(data.role === Role.CREATOR
            ? { creatorProfile: { create: { fullName: data.fullName ?? null } } }
            : { businessProfile: { create: { businessName: data.businessName ?? null } } }),
        },
      });
      await tx.authAccount.create({
        data: {
          userId: created.id,
          provider: AuthProvider.APPLE,
          providerUserId: data.sub,
          email: data.providerEmail ?? null,
          refreshToken: data.providerRefreshToken ?? null,
        },
      });
      return tx.user.findUnique({ where: { id: created.id }, include: profileSelect });
    });
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
