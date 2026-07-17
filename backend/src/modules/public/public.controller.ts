import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { PublicService } from './public.service';

const publicService = new PublicService();

export class PublicController {
  async landingStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await publicService.getLandingStats();
      success(res, stats, 'Landing stats retrieved');
    } catch (err) {
      next(err);
    }
  }

  async comingSoon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const comingSoon = await publicService.getComingSoon();
      success(res, { comingSoon }, 'Coming soon status retrieved');
    } catch (err) {
      next(err);
    }
  }
}
