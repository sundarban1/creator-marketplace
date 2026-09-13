import prisma from '../../prisma';
import type { Prisma, RedemptionSessionStatus } from '@prisma/client';

type LockedSessionRow = {
  id: string;
  promotionId: string;
  creatorId: string;
  businessId: string;
  status: RedemptionSessionStatus;
  promotionSnapshot: Prisma.JsonValue;
  billAmount: number | null;
  discountAmount: number | null;
  pointsCost: number | null;
  creditsEarned: number | null;
  expiresAt: Date;
};

export class RedemptionRepository {
  async findCreatorProfileByUserId(userId: string) {
    return prisma.creatorProfile.findUnique({ where: { userId } });
  }

  async findBusinessProfileByUserId(userId: string) {
    return prisma.businessProfile.findUnique({ where: { userId } });
  }

  /** Idempotent get-or-create guard — one live (non-terminal) session per (creator, promotion) at a time. */
  async findLiveSessionForCreatorPromotion(creatorId: string, promotionId: string) {
    return prisma.redemptionSession.findFirst({
      where: { creatorId, promotionId, status: { in: ['ISSUED', 'SCANNED', 'BILL_ENTERED'] } },
    });
  }

  async create(data: Prisma.RedemptionSessionUncheckedCreateInput) {
    return prisma.redemptionSession.create({ data });
  }

  async findFullById(id: string) {
    return prisma.redemptionSession.findUnique({
      where:   { id },
      include: {
        promotion: { select: { title: true } },
        creator:   { select: { userId: true, fullName: true } },
        business:  { select: { userId: true, businessName: true } },
      },
    });
  }

  /**
   * Row-lock a session by token/id for the duration of the caller's
   * transaction — same `SELECT ... FOR UPDATE` shape as
   * withdrawal.admin.service.ts. Must be called with a transaction client;
   * the lock is released when that transaction commits or rolls back.
   */
  async lockByToken(tx: Prisma.TransactionClient, token: string): Promise<LockedSessionRow | undefined> {
    const rows = await tx.$queryRaw<LockedSessionRow[]>`
      SELECT id, "promotionId", "creatorId", "businessId", status, "promotionSnapshot",
             "billAmount", "discountAmount", "pointsCost", "creditsEarned", "expiresAt"
      FROM redemption_sessions WHERE token = ${token} FOR UPDATE`;
    return rows[0];
  }

  async lockById(tx: Prisma.TransactionClient, id: string): Promise<LockedSessionRow | undefined> {
    const rows = await tx.$queryRaw<LockedSessionRow[]>`
      SELECT id, "promotionId", "creatorId", "businessId", status, "promotionSnapshot",
             "billAmount", "discountAmount", "pointsCost", "creditsEarned", "expiresAt"
      FROM redemption_sessions WHERE id = ${id} FOR UPDATE`;
    return rows[0];
  }

  async lockPointsAccount(tx: Prisma.TransactionClient, creatorId: string): Promise<{ balance: number } | undefined> {
    const rows = await tx.$queryRaw<{ balance: number }[]>`
      SELECT balance FROM creator_points_accounts WHERE "creatorId" = ${creatorId} FOR UPDATE`;
    return rows[0];
  }

  async markExpired(tx: Prisma.TransactionClient, id: string) {
    return tx.redemptionSession.update({ where: { id }, data: { status: 'EXPIRED' } });
  }

  async markScanned(tx: Prisma.TransactionClient, id: string, scannedByUserId: string) {
    return tx.redemptionSession.update({
      where: { id },
      data:  { status: 'SCANNED', scannedAt: new Date(), scannedByUserId },
    });
  }

  async markBillEntered(
    tx: Prisma.TransactionClient,
    id: string,
    values: { billAmount: number; discountAmount: number; pointsCost: number; creditsEarned: number },
  ) {
    return tx.redemptionSession.update({
      where: { id },
      data:  { ...values, status: 'BILL_ENTERED', billEnteredAt: new Date() },
    });
  }

  async markConfirmed(tx: Prisma.TransactionClient, id: string) {
    return tx.redemptionSession.update({ where: { id }, data: { status: 'CONFIRMED', confirmedAt: new Date() } });
  }

  async markCancelled(tx: Prisma.TransactionClient, id: string, reason: string | undefined) {
    return tx.redemptionSession.update({
      where: { id },
      data:  { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason ?? null },
    });
  }

  async countConfirmedToday(promotionId: string, since: Date) {
    return prisma.redemptionSession.count({
      where: { promotionId, status: 'CONFIRMED', confirmedAt: { gte: since } },
    });
  }

  async countConfirmedTotal(promotionId: string) {
    return prisma.redemptionSession.count({ where: { promotionId, status: 'CONFIRMED' } });
  }

  async countConfirmedByCreator(promotionId: string, creatorId: string) {
    return prisma.redemptionSession.count({ where: { promotionId, creatorId, status: 'CONFIRMED' } });
  }
}
