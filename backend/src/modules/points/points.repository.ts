import prisma from '../../prisma';

export class PointsRepository {
  async findCreatorProfileByUserId(userId: string) {
    return prisma.creatorProfile.findUnique({ where: { userId } });
  }

  async getAccount(creatorId: string) {
    return prisma.creatorPointsAccount.findUnique({ where: { creatorId } });
  }

  async listLedger(creatorId: string) {
    return prisma.creatorPointsLedger.findMany({
      where:   { creatorId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Points earned (CREDIT rows) since `since` — powers the "+N this month" figure. */
  async sumCreditsSince(creatorId: string, since: Date) {
    const result = await prisma.creatorPointsLedger.aggregate({
      where: { creatorId, status: 'COMPLETED', direction: 'CREDIT', createdAt: { gte: since } },
      _sum:  { amount: true },
    });
    return result._sum.amount ?? 0;
  }
}
