import { ServiceRequestStatus } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { ServiceRequestRepository } from './service-request.repository';
import { ServiceRepository } from '../service/service.repository';
import { CreatorRepository } from '../creator/creator.repository';
import { BusinessRepository } from '../business/business.repository';
import { notificationService } from '../notifications/notification.service';
import type { CreateServiceRequestInput } from './service-request.schema';
import { getDict } from '../../i18n';

import { HttpStatus } from '../../constants/httpStatus';

export class ServiceRequestService {
  private repo = new ServiceRequestRepository();
  private serviceRepo = new ServiceRepository();
  private creatorRepo = new CreatorRepository();
  private businessRepo = new BusinessRepository();

  async create(userId: string, input: CreateServiceRequestInput) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) throw new AppError(getDict().serviceRequest.businessProfileNotFound, HttpStatus.NOT_FOUND);

    const service = await this.serviceRepo.findById(input.serviceId);
    if (!service || service.status !== 'ACTIVE') throw new AppError(getDict().serviceRequest.serviceNotFound, HttpStatus.NOT_FOUND);

    const existing = await this.repo.findExisting(input.serviceId, business.id);
    if (existing) throw new AppError(getDict().serviceRequest.alreadyHasPendingRequest, HttpStatus.CONFLICT);

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
    if (!profile) throw new AppError(getDict().serviceRequest.creatorProfileNotFound, HttpStatus.NOT_FOUND);
    return this.repo.findByCreatorId(profile.id, status);
  }

  async listSent(userId: string) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) throw new AppError(getDict().serviceRequest.businessProfileNotFound, HttpStatus.NOT_FOUND);
    return this.repo.findByBusinessId(business.id);
  }

  async respond(userId: string, requestId: string, status: 'ACCEPTED' | 'DECLINED') {
    const profile = await this.creatorRepo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().serviceRequest.creatorProfileNotFound, HttpStatus.NOT_FOUND);

    const request = await this.repo.findById(requestId);
    if (!request) throw new AppError(getDict().serviceRequest.requestNotFound, HttpStatus.NOT_FOUND);
    if (request.creatorId !== profile.id) throw new AppError(getDict().serviceRequest.notAuthorizedToRespond, HttpStatus.FORBIDDEN);
    if (request.status !== 'PENDING') throw new AppError(getDict().serviceRequest.alreadyResponded, HttpStatus.BAD_REQUEST);

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
