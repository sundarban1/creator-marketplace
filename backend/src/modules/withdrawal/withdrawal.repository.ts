import type { Prisma, WithdrawalStatus } from '@prisma/client';
import prisma from '../../prisma';

const withCreator = {
  creator: { select: { id: true, userId: true, fullName: true, avatarUrl: true } },
} satisfies Prisma.WithdrawalInclude;

export class WithdrawalRepository {
  async list(params: {
    page: number;
    limit: number;
    status?: WithdrawalStatus;
    search?: string;
  }) {
    const where: Prisma.WithdrawalWhereInput = {};
    if (params.status) where.status = params.status;
    if (params.search) {
      const s = params.search.trim();
      const amount = Number(s);
      where.OR = [
        { id: { equals: s } },
        { referenceCode: { contains: s, mode: 'insensitive' } },
        { transactionReference: { contains: s, mode: 'insensitive' } },
        { creator: { fullName: { contains: s, mode: 'insensitive' } } },
        ...(Number.isFinite(amount) ? [{ amount: amount as number }] : []),
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        skip:    (params.page - 1) * params.limit,
        take:    params.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: withCreator,
      }),
      prisma.withdrawal.count({ where }),
    ]);
    return { rows, total };
  }

  /** Tab counts for the admin dashboard. */
  async countsByStatus() {
    const grouped = await prisma.withdrawal.groupBy({ by: ['status'], _count: { _all: true } });
    const counts: Record<string, number> = {};
    for (const g of grouped) counts[g.status] = g._count._all;
    return counts;
  }

  findById(id: string) {
    return prisma.withdrawal.findUnique({ where: { id }, include: withCreator });
  }

  update(id: string, data: Prisma.WithdrawalUpdateInput) {
    return prisma.withdrawal.update({ where: { id }, data, include: withCreator });
  }
}
