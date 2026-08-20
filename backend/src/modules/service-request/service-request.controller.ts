import { Request, Response, NextFunction } from 'express';
import { ServiceRequestStatus } from '@prisma/client';
import { success } from '../../utils/response';
import { AppError } from '../../middleware/error';
import { ServiceRequestService } from './service-request.service';

const serviceRequestService = new ServiceRequestService();

export class ServiceRequestController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const request = await serviceRequestService.create(req.user!.id, req.body);
      success(res, request, 'Service request sent', 201);
    } catch (err) { next(err); }
  }

  async listReceived(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const statusRaw = req.query.status as string | undefined;
      if (statusRaw && !Object.values(ServiceRequestStatus).includes(statusRaw as ServiceRequestStatus)) {
        throw new AppError(`Invalid status. Must be one of: ${Object.values(ServiceRequestStatus).join(', ')}`, 400);
      }
      const requests = await serviceRequestService.listReceived(req.user!.id, statusRaw as ServiceRequestStatus | undefined);
      success(res, requests, 'Service requests retrieved');
    } catch (err) { next(err); }
  }

  async listSent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requests = await serviceRequestService.listSent(req.user!.id);
      success(res, requests, 'Service requests retrieved');
    } catch (err) { next(err); }
  }

  async respond(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const request = await serviceRequestService.respond(req.user!.id, req.params.id, req.body.status);
      success(res, request, 'Service request updated');
    } catch (err) { next(err); }
  }
}
