import { Role } from '@prisma/client';
import prisma from '../../prisma';

export class PublicRepository {
  async getLandingStats() {
    const [totalCreators, totalBusinesses, categories] = await Promise.all([
      prisma.user.count({ where: { role: Role.CREATOR } }),
      prisma.user.count({ where: { role: Role.BUSINESS } }),
      prisma.category.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, icon: true, color: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return { totalCreators, totalBusinesses, categories };
  }

  // Per-store "Coming Soon" state for the landing page. Each store falls back to
  // the legacy single 'platform.comingSoon' flag when it has no explicit value,
  // so an existing install that only ever set the old key keeps behaving the
  // same until an admin touches the new toggles.
  async getComingSoon(): Promise<{ ios: boolean; android: boolean }> {
    const rows = await prisma.platformSetting.findMany({
      where: { key: { in: ['platform.comingSoon', 'platform.comingSoon.ios', 'platform.comingSoon.android'] } },
    });
    const read = (key: string): boolean | undefined => {
      const row = rows.find((r) => r.key === key);
      if (!row) return undefined;
      try { return JSON.parse(row.value) === true; } catch { return false; }
    };
    const legacy = read('platform.comingSoon') ?? false;
    return {
      ios:     read('platform.comingSoon.ios') ?? legacy,
      android: read('platform.comingSoon.android') ?? legacy,
    };
  }
}
