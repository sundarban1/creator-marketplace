import prisma from '../../prisma';
import type { Prisma } from '@prisma/client';

export class CreditsRepository {
  async findBusinessProfileByUserId(userId: string) {
    return prisma.businessProfile.findUnique({ where: { userId } });
  }

  async getAccount(businessId: string) {
    return prisma.businessCreditsAccount.findUnique({ where: { businessId } });
  }

  /**
   * Row-lock the account for the duration of the caller's transaction — same
   * `SELECT ... FOR UPDATE` shape as redemption.repository.ts's
   * lockPointsAccount. A missing row (never earned any credits yet) means a
   * balance of 0, so callers should treat `undefined` that way rather than erroring.
   */
  async lockAccount(tx: Prisma.TransactionClient, businessId: string): Promise<{ balance: number } | undefined> {
    const rows = await tx.$queryRaw<{ balance: number }[]>`
      SELECT balance FROM business_credits_accounts WHERE "businessId" = ${businessId} FOR UPDATE`;
    return rows[0];
  }

  async listLedger(businessId: string) {
    return prisma.businessCreditsLedger.findMany({
      where:   { businessId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    });
  }
}
