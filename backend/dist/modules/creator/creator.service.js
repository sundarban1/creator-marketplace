"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatorService = void 0;
const crypto_1 = require("crypto");
const error_1 = require("../../middleware/error");
const creator_repository_1 = require("./creator.repository");
class CreatorService {
    repo;
    constructor() {
        this.repo = new creator_repository_1.CreatorRepository();
    }
    async getProfile(userId) {
        const profile = await this.repo.findByUserId(userId);
        if (!profile) {
            throw new error_1.AppError('Creator profile not found', 404);
        }
        return profile;
    }
    async updateProfile(userId, input) {
        const profile = await this.repo.findByUserId(userId);
        if (!profile) {
            throw new error_1.AppError('Creator profile not found', 404);
        }
        const updated = await this.repo.update(userId, input);
        return updated;
    }
    async addPortfolioLink(userId, input) {
        const profile = await this.repo.findByUserId(userId);
        if (!profile) {
            throw new error_1.AppError('Creator profile not found', 404);
        }
        const currentLinks = profile.portfolioLinks || [];
        const newLink = { id: (0, crypto_1.randomUUID)(), label: input.label, url: input.url };
        const updated = await this.repo.addPortfolioLink(userId, newLink, currentLinks);
        return updated;
    }
    async removePortfolioLink(userId, linkId) {
        const profile = await this.repo.findByUserId(userId);
        if (!profile) {
            throw new error_1.AppError('Creator profile not found', 404);
        }
        const currentLinks = profile.portfolioLinks || [];
        const linkExists = currentLinks.some((l) => l.id === linkId);
        if (!linkExists) {
            throw new error_1.AppError('Portfolio link not found', 404);
        }
        const updated = await this.repo.removePortfolioLink(userId, linkId, currentLinks);
        return updated;
    }
    async updateSocialLinks(userId, input) {
        const profile = await this.repo.findByUserId(userId);
        if (!profile) {
            throw new error_1.AppError('Creator profile not found', 404);
        }
        const currentLinks = profile.socialLinks || {};
        const mergedLinks = {
            ...currentLinks,
            ...input,
        };
        const updated = await this.repo.updateSocialLinks(userId, mergedLinks);
        return updated;
    }
}
exports.CreatorService = CreatorService;
//# sourceMappingURL=creator.service.js.map