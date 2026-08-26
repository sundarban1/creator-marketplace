import type { Prisma } from '@prisma/client';
import prisma from '../../prisma';

const BLOCKING_WITHDRAWAL_STATUSES = ['PENDING', 'PROCESSING'] as const;

export class PayoutMethodRepository {
  findByCreator(creatorId: string) {
    return prisma.payoutMethod.findMany({
      where:   { creatorId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findById(id: string) {
    return prisma.payoutMethod.findUnique({ where: { id } });
  }

  countForCreator(creatorId: string) {
    return prisma.payoutMethod.count({ where: { creatorId } });
  }

  create(data: Prisma.PayoutMethodUncheckedCreateInput) {
    return prisma.payoutMethod.create({ data });
  }

  update(id: string, data: Prisma.PayoutMethodUncheckedUpdateInput) {
    return prisma.payoutMethod.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.payoutMethod.delete({ where: { id } });
  }

  /** Unset isDefault on every other method for this creator. */
  clearDefault(creatorId: string, exceptId?: string) {
    return prisma.payoutMethod.updateMany({
      where: { creatorId, isDefault: true, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
      data:  { isDefault: false },
    });
  }

  /** An in-flight withdrawal still references this method — deletion must be blocked. */
  async hasBlockingWithdrawal(payoutMethodId: string) {
    const count = await prisma.withdrawal.count({
      where: { payoutMethodId, status: { in: [...BLOCKING_WITHDRAWAL_STATUSES] } },
    });
    return count > 0;
  }
}
