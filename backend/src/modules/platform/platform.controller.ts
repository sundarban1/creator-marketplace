import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { PlatformService } from './platform.service';

const platformService = new PlatformService();

export class PlatformController {
  async listPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const platforms = await platformService.listPublic();
      success(res, platforms, 'Platforms retrieved');
    } catch (err) {
      next(err);
    }
  }

  async listForAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const platforms = await platformService.listForAdmin();
      success(res, platforms, 'Platforms retrieved');
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const platform = await platformService.create(req.body);
      success(res, platform, 'Platform created', 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const platform = await platformService.update(req.params.id, req.body);
      success(res, platform, 'Platform updated');
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const platform = await platformService.updateStatus(req.params.id, req.body.status);
      success(res, platform, 'Platform status updated');
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await platformService.remove(req.params.id);
      success(res, null, 'Platform deleted');
    } catch (err) {
      next(err);
    }
  }
}
