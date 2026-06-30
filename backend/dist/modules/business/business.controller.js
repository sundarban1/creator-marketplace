"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessController = void 0;
const business_service_1 = require("./business.service");
const response_1 = require("../../utils/response");
const cloudinary_1 = require("../../utils/cloudinary");
const error_1 = require("../../middleware/error");
const businessService = new business_service_1.BusinessService();
class BusinessController {
    async getProfile(req, res, next) {
        try {
            const profile = await businessService.getProfile(req.user.id);
            (0, response_1.success)(res, profile, 'Profile retrieved successfully');
        }
        catch (err) {
            next(err);
        }
    }
    async updateProfile(req, res, next) {
        try {
            const profile = await businessService.updateProfile(req.user.id, req.body);
            (0, response_1.success)(res, profile, 'Profile updated successfully');
        }
        catch (err) {
            next(err);
        }
    }
    async listBusinesses(req, res, next) {
        try {
            const { search, category, platform, locations, page = '1', limit = '20' } = req.query;
            const locationList = locations
                ? locations.split(',').map((l) => l.trim()).filter(Boolean)
                : undefined;
            const result = await businessService.listBusinesses({
                search: search || undefined,
                category: category || undefined,
                platform: platform || undefined,
                locations: locationList && locationList.length > 0 ? locationList : undefined,
                page: parseInt(page, 10) || 1,
                limit: parseInt(limit, 10) || 20,
                lang: req.language,
            });
            (0, response_1.success)(res, result, 'Businesses retrieved successfully');
        }
        catch (err) {
            next(err);
        }
    }
    async getBusinessPublic(req, res, next) {
        try {
            const business = await businessService.getBusinessPublic(req.params.id, req.language);
            (0, response_1.success)(res, business, 'Business retrieved successfully');
        }
        catch (err) {
            next(err);
        }
    }
    async uploadLogo(req, res, next) {
        try {
            if (!req.file)
                throw new error_1.AppError('No image file provided', 400);
            const logoUrl = await (0, cloudinary_1.uploadImage)(req.file.buffer, 'businesses/logos', `business_${req.user.id}`);
            const profile = await businessService.updateProfile(req.user.id, { logoUrl });
            (0, response_1.success)(res, { logoUrl: profile.logoUrl }, 'Logo updated');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.BusinessController = BusinessController;
//# sourceMappingURL=business.controller.js.map