import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { PromotionService } from './promotion.service';

const promotionService = new PromotionService();

export class PromotionController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const promotion = await promotionService.create(req.user!.id, req.body);
      success(res, promotion, 'Promotion created', 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const promotion = await promotionService.update(req.user!.id, req.params.id, req.body);
      success(res, promotion, 'Promotion updated');
    } catch (err) {
      next(err);
    }
  }

  async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const promotion = await promotionService.publish(req.user!.id, req.params.id);
      success(res, promotion, 'Promotion published');
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await promotionService.delete(req.user!.id, req.params.id);
      success(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  async pause(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const promotion = await promotionService.pause(req.user!.id, req.params.id);
      success(res, promotion, 'Promotion paused');
    } catch (err) {
      next(err);
    }
  }

  async listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const promotions = await promotionService.listMine(req.user!.id);
      success(res, promotions, 'Promotions retrieved');
    } catch (err) {
      next(err);
    }
  }

  async listDiscoverable(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const promotions = await promotionService.listDiscoverable();
      success(res, promotions, 'Promotions retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const promotion = await promotionService.getById(req.user!.id, req.params.id);
      success(res, promotion, 'Promotion retrieved');
    } catch (err) {
      next(err);
    }
  }
}
