"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignController = void 0;
const campaign_service_1 = require("./campaign.service");
const response_1 = require("../../utils/response");
const campaignService = new campaign_service_1.CampaignService();
class CampaignController {
    async create(req, res, next) {
        try {
            const campaign = await campaignService.create(req.user.id, req.body);
            (0, response_1.success)(res, campaign, 'Campaign created successfully', 201);
        }
        catch (err) {
            next(err);
        }
    }
    async getCategories(req, res, next) {
        try {
            const categories = await campaignService.getCategories();
            (0, response_1.success)(res, categories, 'Categories retrieved successfully');
        }
        catch (err) {
            next(err);
        }
    }
    async getPlatforms(req, res, next) {
        try {
            const platforms = await campaignService.getPlatforms();
            (0, response_1.success)(res, platforms, 'Platforms retrieved successfully');
        }
        catch (err) {
            next(err);
        }
    }
    async list(req, res, next) {
        try {
            const { campaigns, total, page, limit } = await campaignService.list(req.query, req.language);
            (0, response_1.paginated)(res, campaigns, total, page, limit);
        }
        catch (err) {
            next(err);
        }
    }
    async getById(req, res, next) {
        try {
            const campaign = await campaignService.getById(req.params.id, req.language);
            (0, response_1.success)(res, campaign, 'Campaign retrieved successfully');
        }
        catch (err) {
            next(err);
        }
    }
    async update(req, res, next) {
        try {
            const campaign = await campaignService.update(req.params.id, req.user.id, req.body);
            (0, response_1.success)(res, campaign, 'Campaign updated successfully');
        }
        catch (err) {
            next(err);
        }
    }
    async delete(req, res, next) {
        try {
            const result = await campaignService.delete(req.params.id, req.user.id);
            (0, response_1.success)(res, result, 'Campaign deleted successfully');
        }
        catch (err) {
            next(err);
        }
    }
    async getMyCampaigns(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const { campaigns, total } = await campaignService.getMyCampaigns(req.user.id, page, limit, req.language);
            (0, response_1.paginated)(res, campaigns, total, page, limit);
        }
        catch (err) {
            next(err);
        }
    }
    async apply(req, res, next) {
        try {
            const application = await campaignService.apply(req.params.id, req.user.id, req.body);
            (0, response_1.success)(res, application, 'Application submitted successfully', 201);
        }
        catch (err) {
            next(err);
        }
    }
    async getCampaignApplications(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const { applications, total } = await campaignService.getCampaignApplications(req.params.id, req.user.id, page, limit);
            (0, response_1.paginated)(res, applications, total, page, limit);
        }
        catch (err) {
            next(err);
        }
    }
    async acceptApplication(req, res, next) {
        try {
            const application = await campaignService.acceptApplication(req.params.id, req.params.appId, req.user.id);
            (0, response_1.success)(res, application, 'Application accepted');
        }
        catch (err) {
            next(err);
        }
    }
    async rejectApplication(req, res, next) {
        try {
            const application = await campaignService.rejectApplication(req.params.id, req.params.appId, req.user.id);
            (0, response_1.success)(res, application, 'Application rejected');
        }
        catch (err) {
            next(err);
        }
    }
    async getBusinessApplications(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const { applications, total } = await campaignService.getBusinessApplications(req.user.id, page, limit);
            (0, response_1.paginated)(res, applications, total, page, limit);
        }
        catch (err) {
            next(err);
        }
    }
    async getMyApplications(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const { applications, total } = await campaignService.getMyApplications(req.user.id, page, limit);
            (0, response_1.paginated)(res, applications, total, page, limit);
        }
        catch (err) {
            next(err);
        }
    }
    async payForCampaign(req, res, next) {
        try {
            const { method } = req.body;
            const result = await campaignService.payForCampaign(req.params.id, req.user.id, method ?? 'ESEWA');
            (0, response_1.success)(res, result, 'Payment successful');
        }
        catch (err) {
            next(err);
        }
    }
    async submitWork(req, res, next) {
        try {
            const result = await campaignService.submitWork(req.params.appId, req.user.id, req.body);
            (0, response_1.success)(res, result, 'Work submitted successfully');
        }
        catch (err) {
            next(err);
        }
    }
    async approveWork(req, res, next) {
        try {
            const result = await campaignService.approveWork(req.params.appId, req.user.id);
            (0, response_1.success)(res, result, 'Work approved');
        }
        catch (err) {
            next(err);
        }
    }
    async requestRevision(req, res, next) {
        try {
            const { note } = req.body;
            const result = await campaignService.requestRevision(req.params.appId, req.user.id, note ?? '');
            (0, response_1.success)(res, result, 'Revision requested');
        }
        catch (err) {
            next(err);
        }
    }
    async payForApplication(req, res, next) {
        try {
            const result = await campaignService.payForApplication(req.params.appId, req.user.id);
            res.json({ success: true, data: result });
        }
        catch (e) {
            next(e);
        }
    }
    async startWork(req, res, next) {
        try {
            const result = await campaignService.startWork(req.params.appId, req.user.id);
            (0, response_1.success)(res, result, 'Work started');
        }
        catch (err) {
            next(err);
        }
    }
    async cancelCampaign(req, res, next) {
        try {
            const result = await campaignService.cancelCampaign(req.params.id, req.user.id);
            (0, response_1.success)(res, result, 'Campaign cancelled');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.CampaignController = CampaignController;
//# sourceMappingURL=campaign.controller.js.map