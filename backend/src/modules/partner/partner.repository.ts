import { SuccessStoryStatus } from '@prisma/client';
import prisma from '../../prisma';
import type { CreatePartnerInput } from './partner.schema';

export class PartnerRepository {
  async findManyPublic() {
    return prisma.partner.findMany({
      where:   { status: 'ACTIVE' },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select:  { id: true, name: true, logoUrl: true, websiteUrl: true },
    });
  }

  async findAllForAdmin() {
    return prisma.partner.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findById(id: string) {
    return prisma.partner.findUnique({ where: { id } });
  }

  async create(data: CreatePartnerInput) {
    return prisma.partner.create({ data });
  }

  async update(id: string, data: CreatePartnerInput) {
    return prisma.partner.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: SuccessStoryStatus) {
    return prisma.partner.update({ where: { id }, data: { status } });
  }

  async delete(id: string) {
    return prisma.partner.delete({ where: { id } });
  }
}
