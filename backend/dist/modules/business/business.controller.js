"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessController = void 0;
const business_service_1 = require("./business.service");
const response_1 = require("../../utils/response");
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
}
exports.BusinessController = BusinessController;
//# sourceMappingURL=business.controller.js.map