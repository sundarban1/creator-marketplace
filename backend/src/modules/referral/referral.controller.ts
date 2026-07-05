import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { ReferralService } from './referral.service';

const referralService = new ReferralService();

export class ReferralController {
  async getMyReferralOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await referralService.getMyReferralOverview(req.user!.id);
      success(res, overview, 'Referral overview retrieved');
    } catch (err) {
      next(err);
    }
  }

  async applyReferralCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const referral = await referralService.applyReferralCode(req.user!.id, req.body.code);
      success(res, referral, 'Referral code applied', 201);
    } catch (err) {
      next(err);
    }
  }
}
