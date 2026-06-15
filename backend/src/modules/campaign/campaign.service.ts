import { AppError } from '../../middleware/error';
import { BusinessRepository } from '../business/business.repository';
import { CreatorRepository } from '../creator/creator.repository';
import { CampaignRepository } from './campaign.repository';
import type {
  CreateCampaignInput,
  UpdateCampaignInput,
  CampaignListQuery,
  ApplyToCampaignInput,
} from './campaign.schema';

export class CampaignService {
  private repo: CampaignRepository;
  private businessRepo: BusinessRepository;
  private creatorRepo: CreatorRepository;

  constructor() {
    this.repo = new CampaignRepository();
    this.businessRepo = new BusinessRepository();
    this.creatorRepo = new CreatorRepository();
  }

  async create(userId: string, input: CreateCampaignInput) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) {
      throw new AppError('Business profile not found', 404);
    }

    const campaign = await this.repo.create({
      businessId: business.id,
      ...input,
      deadline: new Date(input.deadline),
    });

    return campaign;
  }

  async list(query: CampaignListQuery) {
    const { page = 1, limit = 10, ...filters } = query;
    const validatedLimit = Math.min(limit, 50); // cap at 50

    const { campaigns, total } = await this.repo.findMany({
      ...filters,
      page,
      limit: validatedLimit,
    });

    return { campaigns, total, page, limit: validatedLimit };
  }

  async getById(id: string) {
    const campaign = await this.repo.findById(id);
    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }
    return campaign;
  }

  async update(id: string, userId: string, input: UpdateCampaignInput) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) {
      throw new AppError('Business profile not found', 404);
    }

    const campaign = await this.repo.findById(id);
    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    if (campaign.businessId !== business.id) {
      throw new AppError('You are not authorized to update this campaign', 403);
    }

    const updated = await this.repo.update(id, {
      ...input,
      deadline: input.deadline ? new Date(input.deadline) : undefined,
    });

    return updated;
  }

  async delete(id: string, userId: string) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) {
      throw new AppError('Business profile not found', 404);
    }

    const campaign = await this.repo.findById(id);
    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    if (campaign.businessId !== business.id) {
      throw new AppError('You are not authorized to delete this campaign', 403);
    }

    await this.repo.delete(id);
    return { message: 'Campaign deleted successfully' };
  }

  async getMyCampaigns(userId: string, page: number, limit: number) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) {
      throw new AppError('Business profile not found', 404);
    }

    const { campaigns, total } = await this.repo.findByBusinessId(business.id, page, Math.min(limit, 50));
    return { campaigns, total, page, limit };
  }

  async apply(campaignId: string, userId: string, input: ApplyToCampaignInput) {
    const creator = await this.creatorRepo.findByUserId(userId);
    if (!creator) {
      throw new AppError('Creator profile not found', 404);
    }

    const campaign = await this.repo.findById(campaignId);
    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    if (campaign.status !== 'ACTIVE') {
      throw new AppError('This campaign is not accepting applications', 400);
    }

    const existingApplication = await this.repo.findApplication(campaignId, creator.id);
    if (existingApplication) {
      throw new AppError('You have already applied to this campaign', 409);
    }

    const application = await this.repo.createApplication({
      campaignId,
      creatorId: creator.id,
      ...input,
      socialHandles: input.socialHandles as Record<string, string>,
    });

    return application;
  }

  async getCampaignApplications(campaignId: string, userId: string, page: number, limit: number) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) {
      throw new AppError('Business profile not found', 404);
    }

    const campaign = await this.repo.findById(campaignId);
    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    if (campaign.businessId !== business.id) {
      throw new AppError('You are not authorized to view these applications', 403);
    }

    const { applications, total } = await this.repo.findApplicationsByCampaign(
      campaignId,
      page,
      Math.min(limit, 50)
    );

    return { applications, total, page, limit };
  }

  async acceptApplication(campaignId: string, appId: string, userId: string) {
    return this.updateApplicationStatus(campaignId, appId, userId, 'ACCEPTED');
  }

  async rejectApplication(campaignId: string, appId: string, userId: string) {
    return this.updateApplicationStatus(campaignId, appId, userId, 'REJECTED');
  }

  private async updateApplicationStatus(
    campaignId: string,
    appId: string,
    userId: string,
    status: 'ACCEPTED' | 'REJECTED'
  ) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) {
      throw new AppError('Business profile not found', 404);
    }

    const campaign = await this.repo.findById(campaignId);
    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    if (campaign.businessId !== business.id) {
      throw new AppError('You are not authorized to manage this campaign', 403);
    }

    const application = await this.repo.findApplicationById(appId);
    if (!application) {
      throw new AppError('Application not found', 404);
    }

    if (application.campaignId !== campaignId) {
      throw new AppError('Application does not belong to this campaign', 400);
    }

    const updated = await this.repo.updateApplicationStatus(appId, status);
    return updated;
  }

  async getMyApplications(userId: string, page: number, limit: number) {
    const creator = await this.creatorRepo.findByUserId(userId);
    if (!creator) {
      throw new AppError('Creator profile not found', 404);
    }

    const { applications, total } = await this.repo.findApplicationsByCreator(
      creator.id,
      page,
      Math.min(limit, 50)
    );

    return { applications, total, page, limit };
  }
}
