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
}
