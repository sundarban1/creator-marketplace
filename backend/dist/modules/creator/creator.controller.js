"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatorController = void 0;
const creator_service_1 = require("./creator.service");
const response_1 = require("../../utils/response");
const cloudinary_1 = require("../../utils/cloudinary");
const error_1 = require("../../middleware/error");
const creatorService = new creator_service_1.CreatorService();
class CreatorController {
    async listCreators(req, res, next) {
        try {
            const page = parseInt(String(req.query.page ?? '1'), 10);
            const limit = parseInt(String(req.query.limit ?? '10'), 10);
            const search = req.query.search;
            const location = req.query.location;
            const categoriesRaw = req.query.categories;
            const platformsRaw = req.query.platforms;
            const categories = categoriesRaw ? categoriesRaw.split(',').filter(Boolean) : undefined;
            const platforms = platformsRaw ? platformsRaw.split(',').filter(Boolean) : undefined;
            const priceMin = req.query.priceMin ? parseFloat(String(req.query.priceMin)) : undefined;
            const priceMax = req.query.priceMax ? parseFloat(String(req.query.priceMax)) : undefined;
            const result = await creatorService.listCreators({ page, limit, search, categories, location, platforms, priceMin, priceMax, lang: req.language });
            (0, response_1.success)(res, result, 'Creators retrieved');
        }
        catch (err) {
            next(err);
        }
    }
    async getCreatorPublicProfile(req, res, next) {
        try {
            const profile = await creatorService.getCreatorPublicProfile(req.params.id, req.language);
            (0, response_1.success)(res, profile, 'Creator profile retrieved');
        }
        catch (err) {
            next(err);
        }
    }
    async getCreatorFilterOptions(req, res, next) {
        try {
            const options = await creatorService.getFilterOptions();
            (0, response_1.success)(res, options, 'Filter options retrieved');
        }
        catch (err) {
            next(err);
        }
    }
    async getProfile(req, res, next) {
        try {
            const profile = await creatorService.getProfile(req.user.id);
            (0, response_1.success)(res, profile, 'Profile retrieved successfully');
        }
        catch (err) {
            next(err);
        }
    }
    async updateProfile(req, res, next) {
        try {
            const profile = await creatorService.updateProfile(req.user.id, req.body);
            (0, response_1.success)(res, profile, 'Profile updated successfully');
        }
        catch (err) {
            next(err);
        }
    }
    async addPortfolioLink(req, res, next) {
        try {
            const profile = await creatorService.addPortfolioLink(req.user.id, req.body);
            (0, response_1.success)(res, profile, 'Portfolio link added', 201);
        }
        catch (err) {
            next(err);
        }
    }
    async removePortfolioLink(req, res, next) {
        try {
            const profile = await creatorService.removePortfolioLink(req.user.id, req.params.id);
            (0, response_1.success)(res, profile, 'Portfolio link removed');
        }
        catch (err) {
            next(err);
        }
    }
    async updateSocialLinks(req, res, next) {
        try {
            const profile = await creatorService.updateSocialLinks(req.user.id, req.body);
            (0, response_1.success)(res, profile, 'Social links updated');
        }
        catch (err) {
            next(err);
        }
    }
    async getSocialAccounts(req, res, next) {
        try {
            const accounts = await creatorService.getSocialAccounts(req.user.id);
            (0, response_1.success)(res, accounts, 'Social accounts retrieved');
        }
        catch (err) {
            next(err);
        }
    }
    async addSocialAccount(req, res, next) {
        try {
            const account = await creatorService.addSocialAccount(req.user.id, req.body);
            (0, response_1.success)(res, account, 'Social account added', 201);
        }
        catch (err) {
            next(err);
        }
    }
    async updateSocialAccount(req, res, next) {
        try {
            const account = await creatorService.updateSocialAccount(req.user.id, req.params.id, req.body);
            (0, response_1.success)(res, account, 'Social account updated');
        }
        catch (err) {
            next(err);
        }
    }
    async deleteSocialAccount(req, res, next) {
        try {
            await creatorService.deleteSocialAccount(req.user.id, req.params.id);
            (0, response_1.success)(res, null, 'Social account removed');
        }
        catch (err) {
            next(err);
        }
    }
    async getEarnings(req, res, next) {
        try {
            const summary = await creatorService.getEarningsSummary(req.user.id);
            (0, response_1.success)(res, summary, 'Earnings retrieved');
        }
        catch (err) {
            next(err);
        }
    }
    async updatePaymentMethods(req, res, next) {
        try {
            const profile = await creatorService.updatePaymentMethods(req.user.id, req.body);
            (0, response_1.success)(res, { paymentMethods: profile.paymentMethods }, 'Payment methods updated');
        }
        catch (err) {
            next(err);
        }
    }
    async updateCampaignPrefs(req, res, next) {
        try {
            const profile = await creatorService.updateCampaignPrefs(req.user.id, req.body);
            (0, response_1.success)(res, {
                categories: profile.categories,
                prefPlatforms: profile.prefPlatforms,
                prefLocations: profile.prefLocations,
                prefBudgetMin: profile.prefBudgetMin,
                prefBudgetMax: profile.prefBudgetMax,
            }, 'Campaign preferences updated');
        }
        catch (err) {
            next(err);
        }
    }
    async uploadAvatar(req, res, next) {
        try {
            if (!req.file)
                throw new error_1.AppError('No image file provided', 400);
            const avatarUrl = await (0, cloudinary_1.uploadImage)(req.file.buffer, 'creators/avatars', `creator_${req.user.id}`);
            const profile = await creatorService.updateProfile(req.user.id, { avatarUrl });
            (0, response_1.success)(res, { avatarUrl: profile.avatarUrl }, 'Avatar updated');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.CreatorController = CreatorController;
//# sourceMappingURL=creator.controller.js.map