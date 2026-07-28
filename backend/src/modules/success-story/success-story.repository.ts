import { SuccessStoryStatus } from '@prisma/client';
import prisma from '../../prisma';

export class SuccessStoryRepository {
  async findManyPublic() {
    return prisma.successStory.findMany({
      where:   { status: 'ACTIVE' },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findAllForAdmin() {
    return prisma.successStory.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findById(id: string) {
    return prisma.successStory.findUnique({ where: { id } });
  }

  async create(data: { name: string; role: string; quote: string; photoUrl?: string | null; order?: number; status?: SuccessStoryStatus }) {
    return prisma.successStory.create({ data });
  }

  async update(id: string, data: { name: string; role: string; quote: string; photoUrl?: string | null; order?: number; status?: SuccessStoryStatus }) {
    return prisma.successStory.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: SuccessStoryStatus) {
    return prisma.successStory.update({ where: { id }, data: { status } });
  }

  async delete(id: string) {
    return prisma.successStory.delete({ where: { id } });
  }
}
