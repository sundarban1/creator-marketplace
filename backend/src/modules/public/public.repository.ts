import { Role } from '@prisma/client';
import prisma from '../../prisma';

export class PublicRepository {
  async getLandingStats() {
    const [totalCreators, totalBusinesses, categories] = await Promise.all([
      prisma.user.count({ where: { role: Role.CREATOR } }),
      prisma.user.count({ where: { role: Role.BUSINESS } }),
      prisma.category.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return { totalCreators, totalBusinesses, categories };
  }
}
