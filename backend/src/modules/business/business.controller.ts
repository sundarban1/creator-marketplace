import { Request, Response, NextFunction } from 'express';
import { BusinessService } from './business.service';
import { success } from '../../utils/response';

const businessService = new BusinessService();

export class BusinessController {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await businessService.getProfile(req.user!.id);
      success(res, profile, 'Profile retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await businessService.updateProfile(req.user!.id, req.body);
      success(res, profile, 'Profile updated successfully');
    } catch (err) {
      next(err);
    }
  }
}
