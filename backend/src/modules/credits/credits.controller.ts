import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { CreditsService } from './credits.service';

const creditsService = new CreditsService();

export class CreditsController {
  async getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const balance = await creditsService.getBalance(req.user!.id);
      success(res, balance, 'Credits balance retrieved');
    } catch (err) {
      next(err);
    }
  }

  async listHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = await creditsService.listHistory(req.user!.id);
      success(res, history, 'Credits history retrieved');
    } catch (err) {
      next(err);
    }
  }
}
