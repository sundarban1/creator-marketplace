import { Request, Response, NextFunction } from 'express';
import { ServiceStatus } from '@prisma/client';
import { success } from '../../utils/response';
import { AppError } from '../../middleware/error';
import { ServiceService } from './service.service';
import { getDict } from '../../i18n';

import { HttpStatus } from '../../constants/httpStatus';

const serviceService = new ServiceService();

function parsePage(req: Request) {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));
  return { page, limit };
}

export class ServiceController {
  async listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const services = await serviceService.listMine(req.user!.id);
      success(res, services, getDict().service.servicesRetrieved);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const service = await serviceService.create(req.user!.id, req.body);
      success(res, service, getDict().service.serviceCreated, 201);
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const service = await serviceService.update(req.user!.id, req.params.id, req.body);
      success(res, service, getDict().service.serviceUpdated);
    } catch (err) { next(err); }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await serviceService.remove(req.user!.id, req.params.id);
      success(res, null, getDict().service.serviceDeleted);
    } catch (err) { next(err); }
  }

  async listPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = parsePage(req);
      const categoryId = req.query.categoryId as string | undefined;
      const search = req.query.search as string | undefined;
      const result = await serviceService.listPublic({ categoryId, search, page, limit });
      success(res, result, getDict().service.servicesRetrieved);
    } catch (err) { next(err); }
  }

  async getPublicDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const service = await serviceService.getPublicDetail(req.params.id);
      success(res, service, getDict().service.serviceRetrieved);
    } catch (err) { next(err); }
  }

  async listForAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = parsePage(req);
      const statusRaw = req.query.status as string | undefined;
      if (statusRaw && !Object.values(ServiceStatus).includes(statusRaw as ServiceStatus)) {
        throw new AppError(`Invalid status. Must be one of: ${Object.values(ServiceStatus).join(', ')}`, HttpStatus.BAD_REQUEST);
      }
      const result = await serviceService.listForAdmin({ status: statusRaw as ServiceStatus | undefined, page, limit });
      success(res, result, getDict().service.servicesRetrieved);
    } catch (err) { next(err); }
  }

  async updateStatusAsAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const service = await serviceService.updateStatusAsAdmin(req.params.id, req.body.status);
      success(res, service, 'Service status updated');
    } catch (err) { next(err); }
  }
}
