import prisma from '../../prisma';
import type { CreatePortfolioItemInput, UpdatePortfolioItemInput } from './portfolio.schema';

export class PortfolioRepository {
  async findByCreatorProfileId(creatorProfileId: string) {
    return prisma.portfolioItem.findMany({
      where: { creatorProfileId },
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
