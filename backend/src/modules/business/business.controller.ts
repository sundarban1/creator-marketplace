import { Request, Response, NextFunction } from 'express';
import { BusinessService } from './business.service';
import { success } from '../../utils/response';
import { uploadImage as uploadToCloudinary } from '../../utils/cloudinary';
import { AppError } from '../../middleware/error';

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

  async listBusinesses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, category, platform, locations, page = '1', limit = '20' } = req.query as Record<string, string>;
      const locationList = locations
        ? locations.split(',').map((l) => l.trim()).filter(Boolean)
        : undefined;
      const result = await businessService.listBusinesses({
        search:    search    || undefined,
        category:  category  || undefined,
        platform:  platform  || undefined,
        locations: locationList && locationList.length > 0 ? locationList : undefined,
        page:      parseInt(page,  10) || 1,
        limit:     parseInt(limit, 10) || 20,
      });
      success(res, result, 'Businesses retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getBusinessPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const business = await businessService.getBusinessPublic(req.params.id);
      success(res, business, 'Business retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async uploadLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError('No image file provided', 400);
      const logoUrl = await uploadToCloudinary(
        req.file.buffer,
        'businesses/logos',
        `business_${req.user!.id}`,
      );
      const profile = await businessService.updateProfile(req.user!.id, { logoUrl });
      success(res, { logoUrl: profile.logoUrl }, 'Logo updated');
    } catch (err) {
      next(err);
    }
  }
}
