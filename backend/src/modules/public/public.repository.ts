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

  async getComingSoon(): Promise<boolean> {
    const row = await prisma.platformSetting.findUnique({ where: { key: 'platform.comingSoon' } });
    if (!row) return false;
    try { return JSON.parse(row.value) === true; } catch { return false; }
  }
}
