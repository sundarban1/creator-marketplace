"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessService = void 0;
const error_1 = require("../../middleware/error");
const business_repository_1 = require("./business.repository");
class BusinessService {
    repo;
    constructor() {
        this.repo = new business_repository_1.BusinessRepository();
    }
    async getProfile(userId) {
        const profile = await this.repo.findByUserId(userId);
        if (!profile) {
            throw new error_1.AppError('Business profile not found', 404);
        }
        return profile;
    }
    async updateProfile(userId, input) {
        const profile = await this.repo.findByUserId(userId);
        if (!profile) {
            throw new error_1.AppError('Business profile not found', 404);
        }
        const updated = await this.repo.update(userId, input);
        return updated;
    }
    async listBusinesses(params) {
        return this.repo.findMany(params);
    }
    async getBusinessPublic(id) {
        const business = await this.repo.findPublicById(id);
        if (!business || !business.showPublicProfile)
            throw new error_1.AppError('Business not found', 404);
        return business;
    }
}
exports.BusinessService = BusinessService;
//# sourceMappingURL=business.service.js.map