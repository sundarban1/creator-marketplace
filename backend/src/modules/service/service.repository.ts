import { Prisma, ServiceStatus } from '@prisma/client';
import prisma from '../../prisma';
import type { CreateServiceInput, UpdateServiceInput } from './service.schema';

export class ServiceRepository {
  async findByCreatorProfileId(creatorProfileId: string) {
    return prisma.service.findMany({
      where: { creatorProfileId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ACTIVE only — for a provider's public profile (a business browsing them),
  // as opposed to findByCreatorProfileId above (the owner managing their own
  // listings, where every status needs to be visible).
  async findActiveByCreatorProfileId(creatorProfileId: string) {
    return prisma.service.findMany({
      where: { creatorProfileId, status: ServiceStatus.ACTIVE },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.service.findUnique({
      where: { id },
      include: { category: true, creatorProfile: true },
    });
  }

  async create(creatorProfileId: string, data: CreateServiceInput) {
    return prisma.service.create({
      data: {
        creatorProfileId,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        startingPrice: data.startingPrice,
        pricingModel: data.pricingModel,
        deliveryTime: data.deliveryTime,
        whatsIncluded: data.whatsIncluded ?? [],
      },
      include: { category: true },
    });
  }

  async update(id: string, data: UpdateServiceInput) {
    return prisma.service.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async delete(id: string) {
    return prisma.service.delete({ where: { id } });
  }

  // Public discovery — only ACTIVE services from verified-or-not creators alike
  // (verification is surfaced to the browsing business via the creator's own
  // isVerified flag, not gated here).
  //
  // Search spans the service itself (name, description) as well as the
  // provider behind it (category name, creator full name/bio/location) —
  // matching on name alone missed a search like "wedding photographer" when
  // "photographer" only appeared in the creator's category or bio, not the
  // service listing text.
  async findManyPublic(params: { categoryId?: string; search?: string; page: number; limit: number }) {
    const search = params.search?.trim();
    const where: Prisma.ServiceWhereInput = {
      status: ServiceStatus.ACTIVE,
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
        { creatorProfile: { fullName: { contains: search, mode: 'insensitive' } } },
        { creatorProfile: { bio: { contains: search, mode: 'insensitive' } } },
        { creatorProfile: { location: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: { category: true, creatorProfile: true },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.service.count({ where }),
    ]);
    return { items, total };
  }

  async findAllForAdmin(params: { status?: ServiceStatus; page: number; limit: number }) {
    const where = params.status ? { status: params.status } : {};
    const [items, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: { category: true, creatorProfile: true },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.service.count({ where }),
    ]);
    return { items, total };
  }

  async updateStatus(id: string, status: ServiceStatus) {
    return prisma.service.update({ where: { id }, data: { status } });
  }
}
