import prisma from '../../prisma';
import type { CreatePortfolioItemInput, UpdatePortfolioItemInput } from './portfolio.schema';

export class PortfolioRepository {
  // Moderator-hidden items are excluded unless the owner is listing their own
  // portfolio (they see them flagged so they know what happened).
  async findByCreatorProfileId(creatorProfileId: string, opts: { includeHidden?: boolean } = {}) {
    return prisma.portfolioItem.findMany({
      where: { creatorProfileId, ...(opts.includeHidden ? {} : { moderationHiddenAt: null }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.portfolioItem.findUnique({ where: { id } });
  }

  async create(creatorProfileId: string, data: CreatePortfolioItemInput) {
    return prisma.portfolioItem.create({ data: { creatorProfileId, ...data } });
  }

  async update(id: string, data: UpdatePortfolioItemInput) {
    return prisma.portfolioItem.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.portfolioItem.delete({ where: { id } });
  }
}
