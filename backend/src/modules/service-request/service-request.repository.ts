import { ServiceRequestStatus } from '@prisma/client';
import prisma from '../../prisma';

const RECEIVED_INCLUDE = {
  service: { select: { id: true, name: true, startingPrice: true, pricingModel: true } },
  business: { select: { id: true, businessName: true, logoUrl: true } },
} as const;

const SENT_INCLUDE = {
  service: { select: { id: true, name: true, startingPrice: true, pricingModel: true } },
  creator: { select: { id: true, fullName: true, avatarUrl: true } },
} as const;

export class ServiceRequestRepository {
  async create(data: { serviceId: string; businessId: string; creatorId: string; message: string; budget?: number }) {
    return prisma.serviceRequest.create({ data, include: RECEIVED_INCLUDE });
  }

  async findById(id: string) {
    return prisma.serviceRequest.findUnique({ where: { id } });
  }

  // Requests a provider has received, across all of their services.
  async findByCreatorId(creatorId: string, status?: ServiceRequestStatus) {
    return prisma.serviceRequest.findMany({
      where: { creatorId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      include: RECEIVED_INCLUDE,
    });
  }

  // Requests a business has sent, across all providers they've contacted.
  async findByBusinessId(businessId: string) {
    return prisma.serviceRequest.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      include: SENT_INCLUDE,
    });
  }

  async findExisting(serviceId: string, businessId: string) {
    // Only one *pending* request at a time per service+business — a business
    // can re-request after a DECLINED response (e.g. availability changed),
    // just not stack up multiple simultaneous pending asks for the same service.
    return prisma.serviceRequest.findFirst({ where: { serviceId, businessId, status: 'PENDING' } });
  }

  async updateStatus(id: string, status: ServiceRequestStatus) {
    return prisma.serviceRequest.update({
      where: { id },
      data: { status, respondedAt: new Date() },
      include: RECEIVED_INCLUDE,
    });
  }
}
