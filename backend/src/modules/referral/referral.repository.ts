import prisma from '../../prisma';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excludes ambiguous chars (0/O, 1/I)
const CODE_LENGTH = 8;

function generateCandidateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export class ReferralRepository {
  async findCreatorProfileById(id: string) {
    return prisma.creatorProfile.findUnique({ where: { id } });
  }

  async findCreatorProfileByUserId(userId: string) {
    return prisma.creatorProfile.findUnique({ where: { userId } });
  }

  async findCreatorProfileByReferralCode(code: string) {
    return prisma.creatorProfile.findUnique({ where: { referralCode: code } });
  }

  async setReferralCode(creatorProfileId: string, code: string) {
    return prisma.creatorProfile.update({
      where: { id: creatorProfileId },
      data: { referralCode: code },
    });
  }

  /** Generates and persists a unique referral code for a creator profile that doesn't have one yet. */
  async getOrCreateReferralCode(creatorProfileId: string): Promise<string> {
    const profile = await this.findCreatorProfileById(creatorProfileId);
    if (!profile) throw new Error('Creator profile not found');
    if (profile.referralCode) return profile.referralCode;

    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateCandidateCode();
      const taken = await prisma.creatorProfile.findUnique({ where: { referralCode: candidate } });
      if (!taken) {
        await this.setReferralCode(creatorProfileId, candidate);
        return candidate;
      }
    }
    throw new Error('Failed to generate a unique referral code, please try again');
  }

  async findReferralByReferredId(referredId: string) {
    return prisma.referral.findUnique({ where: { referredId } });
  }

  async findReferralById(id: string) {
    return prisma.referral.findUnique({ where: { id } });
  }

  async createReferral(data: { referrerId: string; referredId: string; code: string; expiresAt: Date; rewardAmount: number }) {
    return prisma.referral.create({ data });
  }

  async updateReferralStatus(id: string, data: { status: 'COMPLETED' | 'EXPIRED'; completedAt?: Date; reviewedBy?: string }) {
    return prisma.referral.update({ where: { id }, data });
  }

  async listReferralsMadeByCreator(referrerId: string) {
    return prisma.referral.findMany({
      where: { referrerId },
      orderBy: { createdAt: 'desc' },
      include: {
        referred: { select: { id: true, fullName: true, avatarUrl: true, username: true } },
      },
    });
  }

  async findReferralWithReferrerByReferredId(referredId: string) {
    return prisma.referral.findUnique({
      where: { referredId },
      include: {
        referrer: { select: { id: true, fullName: true, avatarUrl: true, username: true } },
      },
    });
  }

  async listAllForAdmin(status?: 'PENDING' | 'COMPLETED' | 'EXPIRED') {
    return prisma.referral.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        referrer: { select: { id: true, fullName: true, avatarUrl: true, username: true } },
        referred: {
          select: {
            id: true, fullName: true, avatarUrl: true, username: true, isVerified: true,
            bio: true, location: true, categories: true,
          },
        },
      },
    });
  }

  async hasApprovedApplication(creatorProfileId: string) {
    const application = await prisma.application.findFirst({
      where: { creatorId: creatorProfileId, workStatus: 'APPROVED' },
      select: { id: true },
    });
    return !!application;
  }
}
