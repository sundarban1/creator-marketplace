import { Request, Response, NextFunction } from 'express';
import { BusinessService } from './business.service';
import { analyticsService } from '../analytics/analytics.service';
import { success } from '../../utils/response';
import { uploadImage as uploadToCloudinary } from '../../utils/cloudinary';
import { AppError } from '../../middleware/error';
import { getDict } from '../../i18n';

import { HttpStatus } from '../../constants/httpStatus';

const businessService = new BusinessService();

export class BusinessController {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await businessService.getProfile(req.user!.id);
      success(res, profile, getDict().business.profileRetrieved);
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await businessService.updateProfile(req.user!.id, req.body);
      success(res, profile, getDict().business.profileUpdated);
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
      success(res, result, getDict().business.businessesRetrieved);
    } catch (err) {
      next(err);
    }
  }

  async getBusinessPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const business = await businessService.getBusinessPublic(req.params.id, req.language);
      success(res, business, getDict().business.businessRetrieved);
    } catch (err) {
      next(err);
    }
  }

  async uploadLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError(getDict().business.noImageFileProvided, HttpStatus.BAD_REQUEST);
      const logoUrl = await uploadToCloudinary(
        req.file.buffer,
        'businesses/logos',
        `business_${req.user!.id}`,
      );
      const profile = await businessService.updateProfile(req.user!.id, { logoUrl });
      success(res, { logoUrl: profile.logoUrl }, getDict().business.logoUpdated);
    } catch (err) {
      next(err);
    }
  }

  async uploadCoverImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError(getDict().business.noImageFileProvided, HttpStatus.BAD_REQUEST);
      const coverImageUrl = await uploadToCloudinary(
        req.file.buffer,
        'businesses/covers',
        `business_cover_${req.user!.id}`,
      );
      const profile = await businessService.updateProfile(req.user!.id, { coverImageUrl });
      success(res, { coverImageUrl: profile.coverImageUrl }, getDict().business.coverImageUpdated);
    } catch (err) {
      next(err);
    }
  }

  async uploadPanDoc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError(getDict().business.noImageFileProvided, HttpStatus.BAD_REQUEST);
      const docUrl = await uploadToCloudinary(
        req.file.buffer,
        'businesses/pan',
        `pan_${req.user!.id}`,
        [],
      );
      const profile = await businessService.uploadPanDoc(req.user!.id, docUrl);
      success(res, { docUrl: profile.panDocUrl, panDocStatus: profile.panDocStatus }, getDict().business.panDocumentUploaded);
    } catch (err) {
      next(err);
    }
  }

  async uploadIdentityDoc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError(getDict().business.noImageFileProvided, HttpStatus.BAD_REQUEST);
      await businessService.assertCanUploadIdentityDoc(req.user!.id);
      const docUrl = await uploadToCloudinary(
        req.file.buffer,
        'businesses/identity',
        `identity_${req.user!.id}`,
        [],
      );
      const profile = await businessService.uploadIdentityDoc(req.user!.id, docUrl);
      success(res, { docUrl: profile.identityDocUrl, identityDocStatus: profile.identityDocStatus }, getDict().business.identityDocumentUploaded);
    } catch (err) {
      next(err);
    }
  }

  async uploadCompanyRegDoc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError(getDict().business.noImageFileProvided, HttpStatus.BAD_REQUEST);
      const docUrl = await uploadToCloudinary(
        req.file.buffer,
        'businesses/company-reg',
        `companyreg_${req.user!.id}`,
        [],
      );
      const profile = await businessService.uploadCompanyRegDoc(req.user!.id, docUrl);
      success(res, { docUrl: profile.companyRegDocUrl, companyRegDocStatus: profile.companyRegDocStatus }, getDict().business.companyRegistrationDocumentUploaded);
    } catch (err) {
      next(err);
    }
  }

  async getPaymentHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = await businessService.getPaymentHistory(req.user!.id);
      success(res, history, getDict().business.paymentHistoryRetrieved);
    } catch (err) {
      next(err);
    }
  }

  async getMyAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await analyticsService.getBrandAnalytics(req.user!.id, req.query['range']);
      success(res, result, getDict().business.analyticsRetrieved);
    } catch (err) {
      next(err);
    }
  }

  // ── Social Accounts — mirrors creator.controller.ts's handlers of the same name ──

  async getSocialAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accounts = await businessService.getSocialAccounts(req.user!.id);
      success(res, accounts, getDict().business.socialAccountsRetrieved);
    } catch (err) {
      next(err);
    }
  }

  async addSocialAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = await businessService.addSocialAccount(req.user!.id, req.body);
      success(res, account, getDict().business.socialAccountAdded, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateSocialAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = await businessService.updateSocialAccount(req.user!.id, req.params.id!, req.body);
      success(res, account, getDict().business.socialAccountUpdated);
    } catch (err) {
      next(err);
    }
  }

  async deleteSocialAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await businessService.deleteSocialAccount(req.user!.id, req.params.id!);
      success(res, null, getDict().business.socialAccountDeleted);
    } catch (err) {
      next(err);
    }
  }

  async connectYoutubeAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = await businessService.connectYoutubeAccount(
        req.user!.id, req.body.accessToken, req.body.refreshToken, req.body.expiresIn, req.body.clientPlatform,
      );
      success(res, account, getDict().business.youtubeAccountConnected, 201);
    } catch (err) {
      next(err);
    }
  }

  async getTiktokAuthorizeUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const url = await businessService.getTiktokAuthorizeUrl(req.user!.id);
      success(res, { url }, getDict().business.tiktokAuthorizeUrlGenerated);
    } catch (err) {
      next(err);
    }
  }

  async getInstagramLoginAuthorizeUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const url = await businessService.getInstagramLoginAuthorizeUrl(req.user!.id);
      success(res, { url }, getDict().business.instagramAuthorizeUrlGenerated);
    } catch (err) {
      next(err);
    }
  }

  async getFacebookPages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pages = await businessService.listFacebookPages(req.body.accessToken);
      success(res, pages, getDict().business.facebookPagesRetrieved);
    } catch (err) {
      next(err);
    }
  }

  async connectFacebookPage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = await businessService.connectFacebookPage(req.user!.id, req.body.accessToken, req.body.pageId);
      success(res, account, getDict().business.facebookPageConnected, 201);
    } catch (err) {
      next(err);
    }
  }

  async connectInstagramAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = await businessService.connectInstagramAccount(req.user!.id, req.body.accessToken, req.body.pageId);
      success(res, account, getDict().business.instagramAccountConnected, 201);
    } catch (err) {
      next(err);
    }
  }
}
