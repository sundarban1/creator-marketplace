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

export class BusinessReferralRepository {
  async findBusinessProfileById(id: string) {
    return prisma.businessProfile.findUnique({
      where: { id },
      include: { user: { select: { id: true, deviceId: true } } },
    });
  }

  async findBusinessProfileByUserId(userId: string) {
    return prisma.businessProfile.findUnique({ where: { userId } });
  }

  async findBusinessProfileByReferralCode(code: string) {
    return prisma.businessProfile.findUnique({
      where: { referralCode: code },
      include: { user: { select: { id: true, deviceId: true } } },
    });
  }

  async setReferralCode(businessProfileId: string, code: string) {
    return prisma.businessProfile.update({
      where: { id: businessProfileId },
      data: { referralCode: code },
    });
  }

  /** Generates and persists a unique referral code for a business profile that doesn't have one yet. */
  async getOrCreateReferralCode(businessProfileId: string): Promise<string> {
    const profile = await prisma.businessProfile.findUnique({ where: { id: businessProfileId } });
    if (!profile) throw new Error('Business profile not found');
    if (profile.referralCode) return profile.referralCode;

    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateCandidateCode();
      const taken = await prisma.businessProfile.findUnique({ where: { referralCode: candidate } });
      if (!taken) {
        await this.setReferralCode(businessProfileId, candidate);
        return candidate;
      }
    }
    throw new Error('Failed to generate a unique referral code, please try again');
  }

  async findReferralByReferredId(referredId: string) {
    return prisma.businessReferral.findUnique({ where: { referredId } });
  }

  async findReferralById(id: string) {
    return prisma.businessReferral.findUnique({ where: { id } });
  }

  async createReferral(data: { referrerId: string; referredId: string; code: string; expiresAt: Date; rewardAmount: number }) {
    return prisma.businessReferral.create({ data });
  }

  async updateReferralStatus(id: string, data: { status: 'PENDING' | 'COMPLETED' | 'EXPIRED'; completedAt?: Date; reviewedBy?: string; expiresAt?: Date }) {
    return prisma.businessReferral.update({ where: { id }, data });
  }

  async listReferralsMadeByBusiness(referrerId: string) {
    return prisma.businessReferral.findMany({
      where: { referrerId },
      orderBy: { createdAt: 'desc' },
      include: {
        referred: { select: { id: true, businessName: true, logoUrl: true } },
      },
    });
  }

  async findReferralWithReferrerByReferredId(referredId: string) {
    return prisma.businessReferral.findUnique({
      where: { referredId },
      include: {
        referrer: { select: { id: true, businessName: true, logoUrl: true } },
      },
    });
  }

  async listAllForAdmin(status?: 'PENDING' | 'COMPLETED' | 'EXPIRED') {
    return prisma.businessReferral.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        referrer: {
          select: {
            id: true, businessName: true, logoUrl: true, panNo: true, paymentMethods: true,
            user: { select: { id: true, deviceId: true } },
          },
        },
        referred: {
          select: {
            id: true, businessName: true, logoUrl: true, isVerified: true, panNo: true, paymentMethods: true,
            description: true, location: true, categories: true,
            user: { select: { id: true, deviceId: true } },
          },
        },
      },
    });
  }

  /** Earliest campaign with a real budget that hasn't been cancelled — the "first funded campaign" milestone. */
  async findQualifyingCampaign(businessProfileId: string) {
    return prisma.campaign.findFirst({
      where: { businessId: businessProfileId, budgetMax: { gt: 0 }, status: { not: 'CANCELLED' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, createdAt: true },
    });
  }

  /** Has this PAN/VAT number already collected a completed referral reward under a different business account? */
  async hasCompletedReferralForPanNo(panNo: string, excludeBusinessId: string) {
    const match = await prisma.businessReferral.findFirst({
      where: {
        status: 'COMPLETED',
        referredId: { not: excludeBusinessId },
        referred: { panNo },
      },
      select: { id: true },
    });
    return !!match;
  }
}
