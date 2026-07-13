import { Request, Response, NextFunction } from 'express';
import { CampaignStatus, ApplicationStatus, CampaignType } from '@prisma/client';
import { CampaignService } from './campaign.service';
import { analyticsService } from '../analytics/analytics.service';
import { success, paginated } from '../../utils/response';
import { uploadImage as uploadToCloudinary } from '../../utils/cloudinary';
import { AppError } from '../../middleware/error';
import type { SubmitReviewInput } from './campaign.schema';

const campaignService = new CampaignService();
const FEATURE_IMAGE_TRANSFORMATION = [{ width: 800, height: 450, crop: 'fill' }];

export class CampaignController {
  async uploadFeatureImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError('No image file provided', 400);
      const imageUrl = await uploadToCloudinary(
        req.file.buffer,
        'campaigns/features',
        `feature_${req.user!.id}_${Date.now()}`,
        FEATURE_IMAGE_TRANSFORMATION,
      );
      success(res, { imageUrl }, 'Image uploaded');
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await campaignService.create(req.user!.id, req.body);
      success(res, campaign, 'Campaign created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await campaignService.getCategories();
      success(res, categories, 'Categories retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  getMasterCategories(req: Request, res: Response, next: NextFunction): void {
    try {
      const categories = campaignService.getMasterCategories();
      success(res, categories, 'Master categories retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getPlatforms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const platforms = await campaignService.getPlatforms();
      success(res, platforms, 'Platforms retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campaigns, total, page, limit } = await campaignService.list(req.query as any, req.language);
      paginated(res, campaigns, total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async nearby(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campaigns, total, page, limit } = await campaignService.nearby(req.query as any, req.language);
      paginated(res, campaigns, total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await campaignService.getById(req.params.id, req.language);
      success(res, campaign, 'Campaign retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await campaignService.update(req.params.id, req.user!.id, req.body);
      success(res, campaign, 'Campaign updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.delete(req.params.id, req.user!.id);
      success(res, result, 'Campaign deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  async getMyCampaigns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as CampaignStatus | undefined;
      const { campaigns, total } = await campaignService.getMyCampaigns(req.user!.id, page, limit, req.language, status);
      paginated(res, campaigns, total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async apply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const application = await campaignService.apply(req.params.id, req.user!.id, req.body);
      success(res, application, 'Application submitted successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getCampaignApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const { applications, total } = await campaignService.getCampaignApplications(
        req.params.id,
        req.user!.id,
        page,
        limit
      );
      paginated(res, applications, total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async acceptApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const application = await campaignService.acceptApplication(
        req.params.id,
        req.params.appId,
        req.user!.id
      );
      success(res, application, 'Application accepted');
    } catch (err) {
      next(err);
    }
  }

  async rejectApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const application = await campaignService.rejectApplication(
        req.params.id,
        req.params.appId,
        req.user!.id
      );
      success(res, application, 'Application rejected');
    } catch (err) {
      next(err);
    }
  }

  async getBusinessApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as ApplicationStatus | undefined;
      const campaignType = req.query.campaignType as CampaignType | undefined;
      const { applications, total } = await campaignService.getBusinessApplications(
        req.user!.id, page, limit, status, campaignType
      );
      paginated(res, applications, total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async getMyApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as ApplicationStatus | undefined;
      const { applications, total } = await campaignService.getMyApplications(
        req.user!.id,
        page,
        limit,
        status,
      );
      paginated(res, applications, total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async payForCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { method } = req.body as { method?: string };
      const result = await campaignService.payForCampaign(
        req.params.id,
        req.user!.id,
        method ?? 'ESEWA'
      );
      success(res, result, 'Payment successful');
    } catch (err) {
      next(err);
    }
  }

  async submitWork(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.submitWork(
        req.params.appId,
        req.user!.id,
        req.body as { note?: string; urls?: string }
      );
      success(res, result, 'Work submitted successfully');
    } catch (err) {
      next(err);
    }
  }

  async approveWork(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.approveWork(req.params.appId, req.user!.id);
      success(res, result, 'Work approved');
    } catch (err) {
      next(err);
    }
  }

  async completeProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.completeProject(req.params.appId, req.user!.id);
      success(res, result, 'Project marked complete');
    } catch (err) {
      next(err);
    }
  }

  async requestRevision(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { note } = req.body as { note?: string };
      const result = await campaignService.requestRevision(
        req.params.appId,
        req.user!.id,
        note ?? ''
      );
      success(res, result, 'Revision requested');
    } catch (err) {
      next(err);
    }
  }

  async payForApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.payForApplication(req.params.appId, req.user!.id);
      res.json({ success: true, data: result });
    } catch (e) { next(e); }
  }

  async startWork(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.startWork(req.params.appId, req.user!.id);
      success(res, result, 'Work started');
    } catch (err) {
      next(err);
    }
  }

  async cancelCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.cancelCampaign(req.params.id, req.user!.id);
      success(res, result, 'Campaign cancelled');
    } catch (err) {
      next(err);
    }
  }

  async submitReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { rating, comment } = req.body as SubmitReviewInput;
      const result = await analyticsService.submitReview(req.params.appId, req.user!.id, rating, comment);
      success(res, result, 'Review submitted', 201);
    } catch (err) {
      next(err);
    }
  }
}
