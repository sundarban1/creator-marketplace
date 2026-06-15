"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignService = void 0;
const error_1 = require("../../middleware/error");
const business_repository_1 = require("../business/business.repository");
const creator_repository_1 = require("../creator/creator.repository");
const campaign_repository_1 = require("./campaign.repository");
class CampaignService {
    repo;
    businessRepo;
    creatorRepo;
    constructor() {
        this.repo = new campaign_repository_1.CampaignRepository();
        this.businessRepo = new business_repository_1.BusinessRepository();
        this.creatorRepo = new creator_repository_1.CreatorRepository();
    }
    async create(userId, input) {
        const business = await this.businessRepo.findByUserId(userId);
        if (!business) {
            throw new error_1.AppError('Business profile not found', 404);
        }
        const campaign = await this.repo.create({
            businessId: business.id,
            ...input,
            deadline: new Date(input.deadline),
        });
        return campaign;
    }
    async list(query) {
        const { page = 1, limit = 10, ...filters } = query;
        const validatedLimit = Math.min(limit, 50); // cap at 50
        const { campaigns, total } = await this.repo.findMany({
            ...filters,
            page,
            limit: validatedLimit,
        });
        return { campaigns, total, page, limit: validatedLimit };
    }
    async getById(id) {
        const campaign = await this.repo.findById(id);
        if (!campaign) {
            throw new error_1.AppError('Campaign not found', 404);
        }
        return campaign;
    }
    async update(id, userId, input) {
        const business = await this.businessRepo.findByUserId(userId);
        if (!business) {
            throw new error_1.AppError('Business profile not found', 404);
        }
        const campaign = await this.repo.findById(id);
        if (!campaign) {
            throw new error_1.AppError('Campaign not found', 404);
        }
        if (campaign.businessId !== business.id) {
            throw new error_1.AppError('You are not authorized to update this campaign', 403);
        }
        const updated = await this.repo.update(id, {
            ...input,
            deadline: input.deadline ? new Date(input.deadline) : undefined,
        });
        return updated;
    }
    async delete(id, userId) {
        const business = await this.businessRepo.findByUserId(userId);
        if (!business) {
            throw new error_1.AppError('Business profile not found', 404);
        }
        const campaign = await this.repo.findById(id);
        if (!campaign) {
            throw new error_1.AppError('Campaign not found', 404);
        }
        if (campaign.businessId !== business.id) {
            throw new error_1.AppError('You are not authorized to delete this campaign', 403);
        }
        await this.repo.delete(id);
        return { message: 'Campaign deleted successfully' };
    }
    async getMyCampaigns(userId, page, limit) {
        const business = await this.businessRepo.findByUserId(userId);
        if (!business) {
            throw new error_1.AppError('Business profile not found', 404);
        }
        const { campaigns, total } = await this.repo.findByBusinessId(business.id, page, Math.min(limit, 50));
        return { campaigns, total, page, limit };
    }
    async apply(campaignId, userId, input) {
        const creator = await this.creatorRepo.findByUserId(userId);
        if (!creator) {
            throw new error_1.AppError('Creator profile not found', 404);
        }
        const campaign = await this.repo.findById(campaignId);
        if (!campaign) {
            throw new error_1.AppError('Campaign not found', 404);
        }
        if (campaign.status !== 'ACTIVE') {
            throw new error_1.AppError('This campaign is not accepting applications', 400);
        }
        const existingApplication = await this.repo.findApplication(campaignId, creator.id);
        if (existingApplication) {
            throw new error_1.AppError('You have already applied to this campaign', 409);
        }
        const application = await this.repo.createApplication({
            campaignId,
            creatorId: creator.id,
            ...input,
            socialHandles: input.socialHandles,
        });
        return application;
    }
    async getCampaignApplications(campaignId, userId, page, limit) {
        const business = await this.businessRepo.findByUserId(userId);
        if (!business) {
            throw new error_1.AppError('Business profile not found', 404);
        }
        const campaign = await this.repo.findById(campaignId);
        if (!campaign) {
            throw new error_1.AppError('Campaign not found', 404);
        }
        if (campaign.businessId !== business.id) {
            throw new error_1.AppError('You are not authorized to view these applications', 403);
        }
        const { applications, total } = await this.repo.findApplicationsByCampaign(campaignId, page, Math.min(limit, 50));
        return { applications, total, page, limit };
    }
    async acceptApplication(campaignId, appId, userId) {
        return this.updateApplicationStatus(campaignId, appId, userId, 'ACCEPTED');
    }
    async rejectApplication(campaignId, appId, userId) {
        return this.updateApplicationStatus(campaignId, appId, userId, 'REJECTED');
    }
    async updateApplicationStatus(campaignId, appId, userId, status) {
        const business = await this.businessRepo.findByUserId(userId);
        if (!business) {
            throw new error_1.AppError('Business profile not found', 404);
        }
        const campaign = await this.repo.findById(campaignId);
        if (!campaign) {
            throw new error_1.AppError('Campaign not found', 404);
        }
        if (campaign.businessId !== business.id) {
            throw new error_1.AppError('You are not authorized to manage this campaign', 403);
        }
        const application = await this.repo.findApplicationById(appId);
        if (!application) {
            throw new error_1.AppError('Application not found', 404);
        }
        if (application.campaignId !== campaignId) {
            throw new error_1.AppError('Application does not belong to this campaign', 400);
        }
        const updated = await this.repo.updateApplicationStatus(appId, status);
        return updated;
    }
    async getMyApplications(userId, page, limit) {
        const creator = await this.creatorRepo.findByUserId(userId);
        if (!creator) {
            throw new error_1.AppError('Creator profile not found', 404);
        }
        const { applications, total } = await this.repo.findApplicationsByCreator(creator.id, page, Math.min(limit, 50));
        return { applications, total, page, limit };
    }
}
exports.CampaignService = CampaignService;
//# sourceMappingURL=campaign.service.js.map