import prisma from '../../prisma';

export class WalletRepository {
  async findCreatorProfileByUserId(userId: string) {
    return prisma.creatorProfile.findUnique({ where: { userId } });
  }

  async sumProposedRateByPaymentStatus(creatorId: string, paymentStatus: 'PAID' | 'RELEASED') {
    const result = await prisma.application.aggregate({
      where: { creatorId, paymentStatus },
      _sum: { proposedRate: true },
    });
    return result._sum.proposedRate ?? 0;
  }

  async sumWithdrawn(creatorId: string) {
    const result = await prisma.withdrawal.aggregate({
      where: { creatorId },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  }

  async createWithdrawal(creatorId: string, amount: number, method: string) {
    return prisma.withdrawal.create({ data: { creatorId, amount, method } });
  }

  async listWithdrawals(creatorId: string) {
    return prisma.withdrawal.findMany({
      where: { creatorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Rs. 500 rewards earned as the referrer, once each referral is admin-released. */
  async sumCompletedReferrerRewards(creatorId: string) {
    const result = await prisma.referral.aggregate({
      where: { referrerId: creatorId, status: 'COMPLETED' },
      _sum: { rewardAmount: true },
    });
    return Number(result._sum.rewardAmount ?? 0);
  }

  /** Was this creator referred by someone, and did that referral get released? At most one, ever (referredId is unique). */
  async hasCompletedReferredBonus(creatorId: string) {
    const referral = await prisma.referral.findFirst({
      where: { referredId: creatorId, status: 'COMPLETED' },
      select: { id: true },
    });
    return !!referral;
  }
}
