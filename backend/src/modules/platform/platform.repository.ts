import { PlatformStatus } from '@prisma/client';
import prisma from '../../prisma';

export class PlatformRepository {
  async findManyPublic() {
    return prisma.platform.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } });
  }

  async findAllForAdmin() {
    return prisma.platform.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string) {
    return prisma.platform.findUnique({ where: { id } });
  }

  async findByKey(key: string) {
    return prisma.platform.findUnique({ where: { key } });
  }

  async create(data: { icon: string; iconBg: string; color: string; name: string; key: string; status?: PlatformStatus }) {
    return prisma.platform.create({ data });
  }

  async update(id: string, data: { icon: string; iconBg: string; color: string; name: string; key: string; status?: PlatformStatus }) {
    return prisma.platform.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: PlatformStatus) {
    return prisma.platform.update({ where: { id }, data: { status } });
  }

  async delete(id: string) {
    return prisma.platform.delete({ where: { id } });
  }

  /** Live usage count across campaigns that list this platform by name. */
  async countUsage(name: string) {
    return prisma.campaign.count({ where: { platforms: { has: name } } });
  }
}
