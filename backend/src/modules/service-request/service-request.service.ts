import { ServiceRequestStatus } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { ServiceRequestRepository } from './service-request.repository';
import { ServiceRepository } from '../service/service.repository';
import { CreatorRepository } from '../creator/creator.repository';
import { BusinessRepository } from '../business/business.repository';
import { notificationService } from '../notifications/notification.service';
import type { CreateServiceRequestInput } from './service-request.schema';

export class ServiceRequestService {
  private repo = new ServiceRequestRepository();
  private serviceRepo = new ServiceRepository();
  private creatorRepo = new CreatorRepository();
  private businessRepo = new BusinessRepository();

  async create(userId: string, input: CreateServiceRequestInput) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) throw new AppError('Business profile not found', 404);

    const service = await this.serviceRepo.findById(input.serviceId);
    if (!service || service.status !== 'ACTIVE') throw new AppError('Service not found', 404);

    const existing = await this.repo.findExisting(input.serviceId, business.id);
    if (existing) throw new AppError('You already have a pending request for this service', 409);

    const request = await this.repo.create({
      serviceId: input.serviceId,
      businessId: business.id,
      creatorId: service.creatorProfileId,
      message: input.message,
      budget: input.budget,
    });

    if (service.creatorProfile) {
      await notificationService.create({
        userId: service.creatorProfile.userId,
        type: 'service_request_received',
        title: 'New service request',
        body: `${business.businessName ?? 'A business'} is interested in "${service.name}"`,
        refId: request.id,
        refType: 'service_request',
      }).catch(() => {});
    }

    return request;
  }

  async listReceived(userId: string, status?: ServiceRequestStatus) {
    const profile = await this.creatorRepo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);
    return this.repo.findByCreatorId(profile.id, status);
  }

  async listSent(userId: string) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) throw new AppError('Business profile not found', 404);
    return this.repo.findByBusinessId(business.id);
  }

  async respond(userId: string, requestId: string, status: 'ACCEPTED' | 'DECLINED') {
    const profile = await this.creatorRepo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    const request = await this.repo.findById(requestId);
    if (!request) throw new AppError('Request not found', 404);
    if (request.creatorId !== profile.id) throw new AppError('Not authorized to respond to this request', 403);
    if (request.status !== 'PENDING') throw new AppError('This request has already been responded to', 400);

    const updated = await this.repo.updateStatus(requestId, status);

    const business = await this.businessRepo.findById(request.businessId).catch(() => null);
    if (business) {
      await notificationService.create({
        userId: business.userId,
        type: status === 'ACCEPTED' ? 'service_request_accepted' : 'service_request_declined',
        title: status === 'ACCEPTED' ? 'Request accepted' : 'Request declined',
        body: status === 'ACCEPTED'
          ? `${profile.fullName ?? 'The provider'} accepted your service request`
          : `${profile.fullName ?? 'The provider'} declined your service request`,
        refId: requestId,
        refType: 'service_request',
      }).catch(() => {});
    }

    return updated;
  }
}
