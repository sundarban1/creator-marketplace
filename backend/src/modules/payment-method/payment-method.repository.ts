import { PaymentMethodStatus } from '@prisma/client';
import prisma from '../../prisma';

export class PaymentMethodRepository {
  async findManyPublic() {
    return prisma.paymentMethod.findMany({
      where:   { status: 'ACTIVE' },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  async findAllForAdmin() {
    return prisma.paymentMethod.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: string) {
    return prisma.paymentMethod.findUnique({ where: { id } });
  }

  async findByKey(key: string) {
    return prisma.paymentMethod.findUnique({ where: { key } });
  }

  async create(data: { key: string; name: string; iconUrl?: string | null; color?: string; order?: number; status?: PaymentMethodStatus }) {
    return prisma.paymentMethod.create({ data });
  }

  async update(id: string, data: { key: string; name: string; iconUrl?: string | null; color?: string; order?: number; status?: PaymentMethodStatus }) {
    return prisma.paymentMethod.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: PaymentMethodStatus) {
    return prisma.paymentMethod.update({ where: { id }, data: { status } });
  }

  async delete(id: string) {
    return prisma.paymentMethod.delete({ where: { id } });
  }

  /** Live usage count across creator/business profiles and past withdrawals, so admins don't blindly delete a method people already rely on. */
  async countUsage(key: string) {
    const [creators, businesses, withdrawals] = await Promise.all([
      prisma.creatorProfile.count({ where: { paymentMethods: { has: key } } }),
      prisma.businessProfile.count({ where: { paymentMethods: { has: key } } }),
      prisma.withdrawal.count({ where: { method: key } }),
    ]);
    return creators + businesses + withdrawals;
  }
}
