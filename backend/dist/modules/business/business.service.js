"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessService = void 0;
const error_1 = require("../../middleware/error");
const business_dto_1 = require("./business.dto");
const business_repository_1 = require("./business.repository");
const translation_1 = require("../../utils/translation");
const BUSINESS_FIELDS = ['description', 'location', 'categories'];
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
        return (0, business_dto_1.toBusinessProfileDto)(profile);
    }
    async updateProfile(userId, input) {
        const profile = await this.repo.findByUserId(userId);
        if (!profile) {
            throw new error_1.AppError('Business profile not found', 404);
        }
        return (0, business_dto_1.toBusinessProfileDto)(await this.repo.update(userId, input));
    }
    async listBusinesses(params) {
        const { lang = 'en', ...rest } = params;
        const { businesses, total } = await this.repo.findMany(rest);
        const dtos = businesses.map(business_dto_1.toBusinessListItemDto);
        const translated = await (0, translation_1.translateMany)(dtos, [...BUSINESS_FIELDS], lang);
        return { businesses: translated, total };
    }
    async getBusinessPublic(id, lang = 'en') {
        const business = await this.repo.findPublicById(id);
        if (!business || !business.showPublicProfile)
            throw new error_1.AppError('Business not found', 404);
        const dto = (0, business_dto_1.toPublicBusinessDto)(business);
        return (0, translation_1.translateFields)(dto, [...BUSINESS_FIELDS], lang);
    }
}
exports.BusinessService = BusinessService;
//# sourceMappingURL=business.service.js.map