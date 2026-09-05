import { Request, Response, NextFunction } from 'express';
import { ServiceRequestStatus } from '@prisma/client';
import { success } from '../../utils/response';
import { AppError } from '../../middleware/error';
import { ServiceRequestService } from './service-request.service';
import { getDict } from '../../i18n';

import { HttpStatus } from '../../constants/httpStatus';

const serviceRequestService = new ServiceRequestService();

export class ServiceRequestController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const request = await serviceRequestService.create(req.user!.id, req.body);
      success(res, request, getDict().serviceRequest.serviceRequestSent, 201);
    } catch (err) { next(err); }
  }

  async listReceived(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const statusRaw = req.query.status as string | undefined;
      if (statusRaw && !Object.values(ServiceRequestStatus).includes(statusRaw as ServiceRequestStatus)) {
        throw new AppError(getDict().serviceRequest.invalidStatusFilter(Object.values(ServiceRequestStatus).join(', ')), HttpStatus.BAD_REQUEST);
      }
      const requests = await serviceRequestService.listReceived(req.user!.id, statusRaw as ServiceRequestStatus | undefined);
      success(res, requests, getDict().serviceRequest.serviceRequestsRetrieved);
    } catch (err) { next(err); }
  }

  async listSent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requests = await serviceRequestService.listSent(req.user!.id);
      success(res, requests, getDict().serviceRequest.serviceRequestsRetrieved);
    } catch (err) { next(err); }
  }

  async respond(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const request = await serviceRequestService.respond(req.user!.id, req.params.id, req.body.status);
      success(res, request, getDict().serviceRequest.serviceRequestUpdated);
    } catch (err) { next(err); }
  }
}
