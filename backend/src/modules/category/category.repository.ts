import { CategoryScope, CategoryStatus } from '@prisma/client';
import prisma from '../../prisma';

export class CategoryRepository {
  async findManyPublic(scope?: CategoryScope) {
    return prisma.category.findMany({
      where: {
        status: 'ACTIVE',
        ...(scope ? { OR: [{ scope: 'BOTH' }, { scope }] } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findAllForAdmin() {
    return prisma.category.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string) {
    return prisma.category.findUnique({ where: { id } });
  }

  async findByKey(key: string) {
    return prisma.category.findUnique({ where: { key } });
  }

  async create(data: { icon: string; iconBg: string; name: string; key: string; scope?: CategoryScope; status?: CategoryStatus }) {
    return prisma.category.create({ data });
  }

  async update(id: string, data: { icon: string; iconBg: string; name: string; key: string; scope?: CategoryScope; status?: CategoryStatus }) {
    return prisma.category.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: CategoryStatus) {
    return prisma.category.update({ where: { id }, data: { status } });
  }

  async delete(id: string) {
    return prisma.category.delete({ where: { id } });
  }

  /** Live usage count across campaigns and creator/business profiles that reference this category by name. */
  async countUsage(name: string) {
    const [campaignCount, creatorCount, businessCount] = await Promise.all([
      prisma.campaign.count({ where: { category: name } }),
      prisma.creatorProfile.count({ where: { categories: { has: name } } }),
      prisma.businessProfile.count({ where: { categories: { has: name } } }),
    ]);
    return campaignCount + creatorCount + businessCount;
  }
}
