import { Request, Response, NextFunction } from 'express';
import { CampaignService } from './campaign.service';
import { success, paginated } from '../../utils/response';

const campaignService = new CampaignService();

export class CampaignController {
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
      const { campaigns, total } = await campaignService.getMyCampaigns(req.user!.id, page, limit, req.language);
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
      const { applications, total } = await campaignService.getBusinessApplications(
        req.user!.id, page, limit
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
      const { applications, total } = await campaignService.getMyApplications(
        req.user!.id,
        page,
        limit
      );
      paginated(res, applications, total, page, limit);
    } catch (err) {
      next(err);
    }
  }
}
