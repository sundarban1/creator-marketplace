import prisma from '../../prisma';
import type { Prisma, PromotionStatus } from '@prisma/client';

export class PromotionRepository {
  async findBusinessProfileByUserId(userId: string) {
    return prisma.businessProfile.findUnique({ where: { userId } });
  }

  async create(businessId: string, data: Prisma.PromotionCreateWithoutBusinessInput) {
    return prisma.promotion.create({ data: { ...data, business: { connect: { id: businessId } } } });
  }

  async findById(id: string) {
    return prisma.promotion.findUnique({
      where: { id },
      include: { business: { select: { id: true, userId: true, businessName: true, logoUrl: true, location: true } } },
    });
  }

  async update(id: string, data: Prisma.PromotionUpdateInput) {
    return prisma.promotion.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: PromotionStatus) {
    return prisma.promotion.update({ where: { id }, data: { status } });
  }

  async delete(id: string) {
    return prisma.promotion.delete({ where: { id } });
  }

  async hasAnyRedemptions(promotionId: string) {
    const count = await prisma.redemptionSession.count({ where: { promotionId } });
    return count > 0;
  }

  async listForBusiness(businessId: string) {
    return prisma.promotion.findMany({
      where:   { businessId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Promotions a creator can currently discover — ACTIVE and inside their date window. */
  async listActive(now: Date) {
    return prisma.promotion.findMany({
      where: {
        status:     'ACTIVE',
        validFrom:  { lte: now },
        validUntil: { gte: now },
      },
      include: { business: { select: { id: true, businessName: true, logoUrl: true, location: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** ACTIVE promotions whose window has passed but haven't been flipped to EXPIRED yet — for lazy materialization. */
  async findStaleActiveExpired(now: Date) {
    return prisma.promotion.findMany({
      where: { status: 'ACTIVE', validUntil: { lt: now } },
      select: { id: true },
    });
  }

  async countConfirmedRedemptions(promotionId: string, since?: Date) {
    return prisma.redemptionSession.count({
      where: {
        promotionId,
        status: 'CONFIRMED',
        ...(since ? { confirmedAt: { gte: since } } : {}),
      },
    });
  }

  async countConfirmedRedemptionsByCreator(promotionId: string, creatorId: string) {
    return prisma.redemptionSession.count({
      where: { promotionId, creatorId, status: 'CONFIRMED' },
    });
  }

  async sumCreditsEarned(promotionId: string) {
    const result = await prisma.redemptionSession.aggregate({
      where: { promotionId, status: 'CONFIRMED' },
      _sum:  { creditsEarned: true },
    });
    return result._sum.creditsEarned ?? 0;
  }
}
