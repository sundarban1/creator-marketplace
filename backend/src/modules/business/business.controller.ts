import { Request, Response, NextFunction } from 'express';
import { BusinessService } from './business.service';
import { analyticsService } from '../analytics/analytics.service';
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
        lang:      req.language,
      });
      success(res, result, 'Businesses retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getBusinessPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const business = await businessService.getBusinessPublic(req.params.id, req.language);
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

  async uploadCoverImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError('No image file provided', 400);
      const coverImageUrl = await uploadToCloudinary(
        req.file.buffer,
        'businesses/covers',
        `business_cover_${req.user!.id}`,
      );
      const profile = await businessService.updateProfile(req.user!.id, { coverImageUrl });
      success(res, { coverImageUrl: profile.coverImageUrl }, 'Cover image updated');
    } catch (err) {
      next(err);
    }
  }

  async uploadPanDoc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError('No image file provided', 400);
      const docUrl = await uploadToCloudinary(
        req.file.buffer,
        'businesses/pan',
        `pan_${req.user!.id}`,
        [],
      );
      const profile = await businessService.uploadPanDoc(req.user!.id, docUrl);
      success(res, { docUrl: profile.panDocUrl, panDocStatus: profile.panDocStatus }, 'PAN document uploaded');
    } catch (err) {
      next(err);
    }
  }

  async uploadCompanyRegDoc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError('No image file provided', 400);
      const docUrl = await uploadToCloudinary(
        req.file.buffer,
        'businesses/company-reg',
        `companyreg_${req.user!.id}`,
        [],
      );
      const profile = await businessService.uploadCompanyRegDoc(req.user!.id, docUrl);
      success(res, { docUrl: profile.companyRegDocUrl, companyRegDocStatus: profile.companyRegDocStatus }, 'Company registration document uploaded');
    } catch (err) {
      next(err);
    }
  }

  async getPaymentHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = await businessService.getPaymentHistory(req.user!.id);
      success(res, history, 'Payment history retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getMyAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await analyticsService.getBrandAnalytics(req.user!.id, req.query['range']);
      success(res, result, 'Analytics retrieved');
    } catch (err) {
      next(err);
    }
  }

  // ── Social Accounts — mirrors creator.controller.ts's handlers of the same name ──

  async getSocialAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accounts = await businessService.getSocialAccounts(req.user!.id);
      success(res, accounts, 'Social accounts retrieved');
    } catch (err) {
      next(err);
    }
  }

  async addSocialAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = await businessService.addSocialAccount(req.user!.id, req.body);
      success(res, account, 'Social account added', 201);
    } catch (err) {
      next(err);
    }
  }

  async updateSocialAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = await businessService.updateSocialAccount(req.user!.id, req.params.id!, req.body);
      success(res, account, 'Social account updated');
    } catch (err) {
      next(err);
    }
  }

  async deleteSocialAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await businessService.deleteSocialAccount(req.user!.id, req.params.id!);
      success(res, null, 'Social account deleted');
    } catch (err) {
      next(err);
    }
  }

  async connectYoutubeAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = await businessService.connectYoutubeAccount(
        req.user!.id, req.body.accessToken, req.body.refreshToken, req.body.expiresIn, req.body.clientPlatform,
      );
      success(res, account, 'YouTube account connected', 201);
    } catch (err) {
      next(err);
    }
  }

  async getTiktokAuthorizeUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const url = businessService.getTiktokAuthorizeUrl(req.user!.id);
      success(res, { url }, 'TikTok authorize URL generated');
    } catch (err) {
      next(err);
    }
  }

  async getInstagramLoginAuthorizeUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const url = businessService.getInstagramLoginAuthorizeUrl(req.user!.id);
      success(res, { url }, 'Instagram authorize URL generated');
    } catch (err) {
      next(err);
    }
  }

  async getFacebookPages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pages = await businessService.listFacebookPages(req.body.accessToken);
      success(res, pages, 'Facebook Pages retrieved');
    } catch (err) {
      next(err);
    }
  }

  async connectFacebookPage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = await businessService.connectFacebookPage(req.user!.id, req.body.accessToken, req.body.pageId);
      success(res, account, 'Facebook Page connected', 201);
    } catch (err) {
      next(err);
    }
  }

  async connectInstagramAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = await businessService.connectInstagramAccount(req.user!.id, req.body.accessToken, req.body.pageId);
      success(res, account, 'Instagram account connected', 201);
    } catch (err) {
      next(err);
    }
  }
}
