import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { RedemptionService } from './redemption.service';

const redemptionService = new RedemptionService();

export class RedemptionController {
  async issue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await redemptionService.issue(req.user!.id, req.body.promotionId);
      success(res, result, 'Redemption issued', 201);
    } catch (err) {
      next(err);
    }
  }

  async scan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await redemptionService.scan(req.user!.id, req.params.token);
      success(res, session, 'Redemption scanned');
    } catch (err) {
      next(err);
    }
  }

  async enterBill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await redemptionService.enterBill(req.user!.id, req.params.id, req.body.billAmount);
      success(res, session, 'Bill entered');
    } catch (err) {
      next(err);
    }
  }

  async confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await redemptionService.confirm(req.user!.id, req.params.id);
      success(res, session, 'Redemption confirmed');
    } catch (err) {
      next(err);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await redemptionService.cancel(req.user!.id, req.user!.role, req.params.id, req.body.reason);
      success(res, session, 'Redemption cancelled');
    } catch (err) {
      next(err);
    }
  }
}
