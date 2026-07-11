import { Request, Response, NextFunction } from 'express';
import { CreatorService } from './creator.service';
import { analyticsService } from '../analytics/analytics.service';
import { success } from '../../utils/response';
import { uploadImage as uploadToCloudinary } from '../../utils/cloudinary';
import { AppError } from '../../middleware/error';

const creatorService = new CreatorService();

export class CreatorController {
  async listCreators(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(String(req.query.page ?? '1'), 10);
      const limit = parseInt(String(req.query.limit ?? '10'), 10);
      const search = req.query.search as string | undefined;
      const location = req.query.location as string | undefined;
      const categoriesRaw = req.query.categories as string | undefined;
      const platformsRaw = req.query.platforms as string | undefined;
      const categories = categoriesRaw ? categoriesRaw.split(',').filter(Boolean) : undefined;
      const platforms = platformsRaw ? platformsRaw.split(',').filter(Boolean) : undefined;
      const priceMin = req.query.priceMin ? parseFloat(String(req.query.priceMin)) : undefined;
      const priceMax = req.query.priceMax ? parseFloat(String(req.query.priceMax)) : undefined;
      const result = await creatorService.listCreators({ page, limit, search, categories, location, platforms, priceMin, priceMax, lang: req.language });
      success(res, result, 'Creators retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getRecommendedCreators(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = req.query.category as string | undefined;
      if (!category) throw new AppError('category is required', 400);
      const lat = req.query.lat ? parseFloat(String(req.query.lat)) : undefined;
      const lng = req.query.lng ? parseFloat(String(req.query.lng)) : undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
      const creators = await creatorService.getRecommendedForCampaign({ category, lat, lng, limit, lang: req.language });
      success(res, creators, 'Recommended creators retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getCreatorPublicProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await creatorService.getCreatorPublicProfile(req.params.id, req.language, req.user?.id);
      success(res, profile, 'Creator profile retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getCreatorFilterOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const options = await creatorService.getFilterOptions();
      success(res, options, 'Filter options retrieved');
    } catch (err) {
      next(err);
    }
  }

  async checkUsernameAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const username = req.query.username as string | undefined;
      if (!username) throw new AppError('Username query param is required', 400);
      const result = await creatorService.isUsernameAvailable(username);
      success(res, result, 'Username availability checked');
    } catch (err) {
      next(err);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await creatorService.getProfile(req.user!.id);
      success(res, profile, 'Profile retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await creatorService.updateProfile(req.user!.id, req.body);
      success(res, profile, 'Profile updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async addPortfolioLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await creatorService.addPortfolioLink(req.user!.id, req.body);
      success(res, profile, 'Portfolio link added', 201);
    } catch (err) {
      next(err);
    }
  }

  async removePortfolioLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await creatorService.removePortfolioLink(req.user!.id, req.params.id);
      success(res, profile, 'Portfolio link removed');
    } catch (err) {
      next(err);
    }
  }

  async updateSocialLinks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await creatorService.updateSocialLinks(req.user!.id, req.body);
      success(res, profile, 'Social links updated');
    } catch (err) {
      next(err);
    }
  }

  async getSocialAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accounts = await creatorService.getSocialAccounts(req.user!.id);
      success(res, accounts, 'Social accounts retrieved');
    } catch (err) {
      next(err);
    }
  }

  async addSocialAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = await creatorService.addSocialAccount(req.user!.id, req.body);
      success(res, account, 'Social account added', 201);
    } catch (err) {
      next(err);
    }
  }

  async updateSocialAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = await creatorService.updateSocialAccount(req.user!.id, req.params.id, req.body);
      success(res, account, 'Social account updated');
    } catch (err) {
      next(err);
    }
  }

  async deleteSocialAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await creatorService.deleteSocialAccount(req.user!.id, req.params.id);
      success(res, null, 'Social account removed');
    } catch (err) {
      next(err);
    }
  }

  async connectYoutubeAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = await creatorService.connectYoutubeAccount(req.user!.id, req.body.accessToken);
      success(res, account, 'YouTube account connected', 201);
    } catch (err) {
      next(err);
    }
  }

  async getEarnings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await creatorService.getEarningsSummary(req.user!.id);
      success(res, summary, 'Earnings retrieved');
    } catch (err) {
      next(err);
    }
  }

  async updatePaymentMethods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await creatorService.updatePaymentMethods(req.user!.id, req.body);
      success(res, { paymentMethods: profile.paymentMethods }, 'Payment methods updated');
    } catch (err) {
      next(err);
    }
  }

  async updateCampaignPrefs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await creatorService.updateCampaignPrefs(req.user!.id, req.body);
      success(res, {
        categories:    profile.categories,
        prefPlatforms: profile.prefPlatforms,
        prefLocations: profile.prefLocations,
        prefBudgetMin: profile.prefBudgetMin,
        prefBudgetMax: profile.prefBudgetMax,
      }, 'Campaign preferences updated');
    } catch (err) {
      next(err);
    }
  }

  async uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError('No image file provided', 400);
      const avatarUrl = await uploadToCloudinary(
        req.file.buffer,
        'creators/avatars',
        `creator_${req.user!.id}`,
      );
      const profile = await creatorService.updateProfile(req.user!.id, { avatarUrl });
      success(res, { avatarUrl: profile.avatarUrl }, 'Avatar updated');
    } catch (err) {
      next(err);
    }
  }

  async uploadCitizenship(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError('No image file provided', 400);
      const docUrl = await uploadToCloudinary(
        req.file.buffer,
        'creators/citizenship',
        `citizenship_${req.user!.id}`,
        [],
      );
      const profile = await creatorService.uploadCitizenship(req.user!.id, docUrl);
      success(res, { docUrl: profile.citizenshipDocUrl, citizenshipStatus: profile.citizenshipStatus }, 'Citizenship document uploaded');
    } catch (err) {
      next(err);
    }
  }

  async getMyAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await analyticsService.getCreatorAnalytics(req.user!.id, req.query['range']);
      success(res, result, 'Analytics retrieved');
    } catch (err) {
      next(err);
    }
  }
}
