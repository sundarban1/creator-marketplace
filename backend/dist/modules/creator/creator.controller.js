"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatorController = void 0;
const creator_service_1 = require("./creator.service");
const response_1 = require("../../utils/response");
const creatorService = new creator_service_1.CreatorService();
class CreatorController {
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
}
exports.CreatorController = CreatorController;
//# sourceMappingURL=creator.controller.js.map