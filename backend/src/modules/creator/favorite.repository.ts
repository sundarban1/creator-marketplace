import { Prisma } from '@prisma/client';
import prisma from '../../prisma';

export class FavoriteRepository {
  async toggle(creatorId: string, businessId: string): Promise<{ isFavorited: boolean }> {
    const existing = await prisma.favoriteBusiness.findUnique({
      where: { creatorId_businessId: { creatorId, businessId } },
    });
    if (existing) {
      await prisma.favoriteBusiness.delete({ where: { id: existing.id } });
      return { isFavorited: false };
    }
    await prisma.favoriteBusiness.create({ data: { creatorId, businessId } });
    return { isFavorited: true };
  }

  async getFavoriteIds(creatorId: string): Promise<string[]> {
    const rows = await prisma.favoriteBusiness.findMany({
      where: { creatorId },
      select: { businessId: true },
    });
    return rows.map((r) => r.businessId);
  }

  async isFavorited(creatorId: string, businessId: string): Promise<boolean> {
    const row = await prisma.favoriteBusiness.findUnique({
      where: { creatorId_businessId: { creatorId, businessId } },
    });
    return row !== null;
  }

  async getCreatorUserIdsForBusiness(businessId: string): Promise<string[]> {
    const rows = await prisma.favoriteBusiness.findMany({
      where: { businessId },
      include: { creator: { select: { userId: true } } },
    });
    return rows.map((r) => r.creator.userId);
  }

  async getFavoriteBusinesses(creatorId: string, filters?: {
    category?:  string;
    platform?:  string;
    locations?: string[]; // OR-matched against campaign.location
  }) {
    const where: Prisma.FavoriteBusinessWhereInput = { creatorId };

    if (filters?.category || filters?.platform || (filters?.locations && filters.locations.length > 0)) {
      const businessWhere: Prisma.BusinessProfileWhereInput = {};
      if (filters.category) businessWhere.categories = { has: filters.category };

      if (filters.platform || (filters.locations && filters.locations.length > 0)) {
        const campaignWhere: Prisma.CampaignWhereInput = { status: 'ACTIVE' };
        if (filters.platform) campaignWhere.platforms = { has: filters.platform };
        if (filters.locations && filters.locations.length > 0) {
          campaignWhere.OR = filters.locations.map((loc) => ({
            location: { contains: loc, mode: 'insensitive' as const },
          }));
        }
        businessWhere.campaigns = { some: campaignWhere };
      }
      where.business = businessWhere;
    }

    return prisma.favoriteBusiness.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          select: {
            id:           true,
            businessName: true,
            description:  true,
            logoUrl:      true,
            website:      true,
            categories:   true,
            isVerified:   true,
            _count:       { select: { campaigns: true } },
          },
        },
      },
    });
  }
}
