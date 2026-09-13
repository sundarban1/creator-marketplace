import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { PointsService } from './points.service';

const pointsService = new PointsService();

export class PointsController {
  async getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const balance = await pointsService.getBalance(req.user!.id);
      success(res, balance, 'Points balance retrieved');
    } catch (err) {
      next(err);
    }
  }

  async listHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = await pointsService.listHistory(req.user!.id);
      success(res, history, 'Points history retrieved');
    } catch (err) {
      next(err);
    }
  }
}
