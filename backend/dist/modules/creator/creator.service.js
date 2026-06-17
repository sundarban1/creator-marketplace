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
    async listCreators(params) {
        const { page, limit, search, categories, location, platforms, priceMin, priceMax } = params;
        const { creators, total } = await this.repo.findMany({
            page, limit: Math.min(limit, 20),
            search, categories, location, platforms, priceMin, priceMax,
        });
        return { creators, total, page, limit };
    }
    async getCreatorPublicProfile(creatorId) {
        const profile = await this.repo.findByIdPublic(creatorId);
        if (!profile)
            throw new error_1.AppError('Creator not found', 404);
        return profile;
    }
    async getFilterOptions() {
        return this.repo.getFilterOptions();
    }
    async getProfile(userId) {
        const profile = await this.repo.findByUserId(userId);
        if (!profile)
            throw new error_1.AppError('Creator profile not found', 404);
        return profile;
    }
    async updateProfile(userId, input) {
        const profile = await this.repo.findByUserId(userId);
        if (!profile)
            throw new error_1.AppError('Creator profile not found', 404);
        // Enforce username uniqueness (only if changing)
        if (input.username && input.username !== profile.username) {
            const taken = await this.repo.findByUsername(input.username);
            if (taken)
                throw new error_1.AppError('This username is already taken', 409);
        }
        return this.repo.update(userId, input);
    }
    async addPortfolioLink(userId, input) {
        const profile = await this.repo.findByUserId(userId);
        if (!profile)
            throw new error_1.AppError('Creator profile not found', 404);
        const currentLinks = profile.portfolioLinks || [];
        const newLink = { id: (0, crypto_1.randomUUID)(), label: input.label, url: input.url };
        return this.repo.addPortfolioLink(userId, newLink, currentLinks);
    }
    async removePortfolioLink(userId, linkId) {
        const profile = await this.repo.findByUserId(userId);
        if (!profile)
            throw new error_1.AppError('Creator profile not found', 404);
        const currentLinks = profile.portfolioLinks || [];
        if (!currentLinks.some((l) => l.id === linkId))
            throw new error_1.AppError('Portfolio link not found', 404);
        return this.repo.removePortfolioLink(userId, linkId, currentLinks);
    }
    async updateSocialLinks(userId, input) {
        const profile = await this.repo.findByUserId(userId);
        if (!profile)
            throw new error_1.AppError('Creator profile not found', 404);
        const currentLinks = profile.socialLinks || {};
        return this.repo.updateSocialLinks(userId, { ...currentLinks, ...input });
    }
    // ── Social Accounts ────────────────────────────────────────────────────────
    async getSocialAccounts(userId) {
        return this.repo.findSocialAccountsByUserId(userId);
    }
    async addSocialAccount(userId, input) {
        const profile = await this.repo.findByUserId(userId);
        if (!profile)
            throw new error_1.AppError('Creator profile not found', 404);
        const existing = await this.repo.findSocialAccountByPlatform(profile.id, input.platform);
        if (existing)
            throw new error_1.AppError(`${input.platform} account is already added`, 409);
        return this.repo.addSocialAccount(profile.id, input);
    }
    async updateSocialAccount(userId, accountId, input) {
        const profile = await this.repo.findByUserId(userId);
        if (!profile)
            throw new error_1.AppError('Creator profile not found', 404);
        const account = await this.repo.findSocialAccountById(accountId);
        if (!account || account.creatorProfileId !== profile.id)
            throw new error_1.AppError('Social account not found', 404);
        return this.repo.updateSocialAccount(accountId, input);
    }
    async deleteSocialAccount(userId, accountId) {
        const profile = await this.repo.findByUserId(userId);
        if (!profile)
            throw new error_1.AppError('Creator profile not found', 404);
        const account = await this.repo.findSocialAccountById(accountId);
        if (!account || account.creatorProfileId !== profile.id)
            throw new error_1.AppError('Social account not found', 404);
        await this.repo.deleteSocialAccount(accountId);
    }
    // ── Payment Methods ────────────────────────────────────────────────────────
    async updatePaymentMethods(userId, input) {
        const profile = await this.repo.findByUserId(userId);
        if (!profile)
            throw new error_1.AppError('Creator profile not found', 404);
        return this.repo.updatePaymentMethods(userId, input.methods);
    }
    // ── Campaign Preferences ────────────────────────────────────────────────────
    async updateCampaignPrefs(userId, input) {
        const profile = await this.repo.findByUserId(userId);
        if (!profile)
            throw new error_1.AppError('Creator profile not found', 404);
        return this.repo.updateCampaignPrefs(userId, input);
    }
    // ── Earnings Summary ───────────────────────────────────────────────────────
    async getEarningsSummary(userId) {
        return this.repo.getEarningsSummary(userId);
    }
}
exports.CreatorService = CreatorService;
//# sourceMappingURL=creator.service.js.map