import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { BusinessReferralService } from './business-referral.service';

const businessReferralService = new BusinessReferralService();

export class BusinessReferralController {
  async getMyReferralOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await businessReferralService.getMyReferralOverview(req.user!.id);
      success(res, overview, 'Referral overview retrieved');
    } catch (err) {
      next(err);
    }
  }

  async applyReferralCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const referral = await businessReferralService.applyReferralCode(req.user!.id, req.body.code);
      success(res, referral, 'Referral code applied', 201);
    } catch (err) {
      next(err);
    }
  }

  async resendReferral(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const referral = await businessReferralService.resendReferral(req.user!.id, req.params.id);
      success(res, referral, 'Referral resent');
    } catch (err) {
      next(err);
    }
  }
}
