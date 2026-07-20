import { Prisma } from '@prisma/client';
import prisma from '../../prisma';

export class SavedCreatorRepository {
  async toggle(businessId: string, creatorId: string): Promise<{ isSaved: boolean }> {
    const existing = await prisma.savedCreator.findUnique({
      where: { businessId_creatorId: { businessId, creatorId } },
    });
    if (existing) {
      await prisma.savedCreator.delete({ where: { id: existing.id } });
      return { isSaved: false };
    }
    await prisma.savedCreator.create({ data: { businessId, creatorId } });
    return { isSaved: true };
  }

  async listSaved(businessId: string, filters?: {
    search?:     string;
    categories?: string[];
    location?:   string;
    platforms?:  string[];
    priceMin?:   number;
    priceMax?:   number;
  }) {
    // Mirrors CreatorRepository.findMany's filter logic — same scale/semantics
    // as the "Explore Creators" filter sheet, so saved creators can be
    // narrowed down with the identical filter modal.
    const PRICE_MAX = 1000;
    const where: Prisma.SavedCreatorWhereInput = { businessId };

    const hasCreatorFilter = !!filters && (
      !!filters.search || !!filters.categories?.length || !!filters.location ||
      !!filters.platforms?.length || filters.priceMin !== undefined || filters.priceMax !== undefined
    );

    if (hasCreatorFilter && filters) {
      const creatorWhere: Prisma.CreatorProfileWhereInput = {};
      if (filters.search) creatorWhere.fullName = { contains: filters.search, mode: 'insensitive' };
      if (filters.categories?.length) creatorWhere.categories = { hasSome: filters.categories };
      if (filters.location) creatorWhere.location = { contains: filters.location, mode: 'insensitive' };
      if (filters.platforms?.length) creatorWhere.socialAccounts = { some: { platform: { in: filters.platforms } } };

      const andConditions: Prisma.CreatorProfileWhereInput[] = [];
      if (filters.priceMin !== undefined && filters.priceMin > 0) {
        andConditions.push({ prefBudgetMax: { gte: filters.priceMin } });
      }
      if (filters.priceMax !== undefined && filters.priceMax < PRICE_MAX) {
        andConditions.push({ prefBudgetMin: { lte: filters.priceMax } });
      }
      if (andConditions.length) creatorWhere.AND = andConditions;

      where.creator = creatorWhere;
    }

    return prisma.savedCreator.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            location: true,
            categories: true,
            isVerified: true,
            socialAccounts: { select: { platform: true, followers: true } },
          },
        },
      },
    });
  }

  async getSavedIds(businessId: string): Promise<string[]> {
    const rows = await prisma.savedCreator.findMany({
      where: { businessId },
      select: { creatorId: true },
    });
    return rows.map((r) => r.creatorId);
  }
}
