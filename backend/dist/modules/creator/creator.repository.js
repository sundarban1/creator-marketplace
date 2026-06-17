"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatorRepository = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
class CreatorRepository {
    async findMany(filters) {
        const PRICE_MAX = 1000;
        const where = {};
        if (filters.search) {
            where.fullName = { contains: filters.search, mode: 'insensitive' };
        }
        if (filters.categories?.length)
            where.categories = { hasSome: filters.categories };
        if (filters.location)
            where.location = { contains: filters.location, mode: 'insensitive' };
        if (filters.platforms?.length) {
            where.socialAccounts = { some: { platform: { in: filters.platforms } } };
        }
        const andConditions = [];
        if (filters.priceMin !== undefined && filters.priceMin > 0) {
            andConditions.push({ prefBudgetMax: { gte: filters.priceMin } });
        }
        if (filters.priceMax !== undefined && filters.priceMax < PRICE_MAX) {
            andConditions.push({ prefBudgetMin: { lte: filters.priceMax } });
        }
        if (andConditions.length)
            where.AND = andConditions;
        const skip = (filters.page - 1) * filters.limit;
        const [creators, total] = await Promise.all([
            prisma_1.default.creatorProfile.findMany({
                where,
                skip,
                take: filters.limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true, fullName: true, bio: true, avatarUrl: true,
                    location: true, categories: true, isVerified: true,
                    prefBudgetMin: true, prefBudgetMax: true,
                    socialAccounts: { select: { platform: true, followers: true } },
                },
            }),
            prisma_1.default.creatorProfile.count({ where }),
        ]);
        return { creators, total };
    }
    async getFilterOptions() {
        const [profiles, accounts] = await Promise.all([
            prisma_1.default.creatorProfile.findMany({ select: { categories: true } }),
            prisma_1.default.socialAccount.findMany({ select: { platform: true }, distinct: ['platform'] }),
        ]);
        const categories = [...new Set(profiles.flatMap((p) => p.categories))].sort();
        const platforms = accounts.map((a) => a.platform).sort();
        return { categories, platforms };
    }
    async findByUserId(userId) {
        return prisma_1.default.creatorProfile.findUnique({
            where: { userId },
            include: {
                user: { select: { id: true, email: true, role: true, isEmailVerified: true, isOnboarded: true } },
                socialAccounts: { orderBy: { createdAt: 'asc' } },
            },
        });
    }
    async findById(id) {
        return prisma_1.default.creatorProfile.findUnique({ where: { id } });
    }
    async findByIdPublic(id) {
        return prisma_1.default.creatorProfile.findUnique({
            where: { id },
            select: {
                id: true,
                userId: true,
                fullName: true,
                username: true,
                bio: true,
                avatarUrl: true,
                location: true,
                categories: true,
                isVerified: true,
                prefBudgetMin: true,
                prefBudgetMax: true,
                prefPlatforms: true,
                portfolioLinks: true,
                socialLinks: true,
                socialAccounts: {
                    select: { id: true, platform: true, followers: true, profileUrl: true },
                    orderBy: { followers: 'desc' },
                },
            },
        });
    }
    async findByUsername(username) {
        return prisma_1.default.creatorProfile.findUnique({ where: { username } });
    }
    async update(userId, data) {
        return prisma_1.default.creatorProfile.update({ where: { userId }, data });
    }
    async addPortfolioLink(userId, link, currentLinks) {
        return prisma_1.default.creatorProfile.update({
            where: { userId },
            data: { portfolioLinks: [...currentLinks, link] },
        });
    }
    async removePortfolioLink(userId, linkId, currentLinks) {
        return prisma_1.default.creatorProfile.update({
            where: { userId },
            data: { portfolioLinks: currentLinks.filter((l) => l.id !== linkId) },
        });
    }
    async updateSocialLinks(userId, socialLinks) {
        return prisma_1.default.creatorProfile.update({ where: { userId }, data: { socialLinks } });
    }
    // ── Social Accounts (structured table) ──────────────────────────────────────
    async findSocialAccountsByUserId(userId) {
        const profile = await prisma_1.default.creatorProfile.findUnique({ where: { userId }, select: { id: true } });
        if (!profile)
            return [];
        return prisma_1.default.socialAccount.findMany({
            where: { creatorProfileId: profile.id },
            orderBy: { createdAt: 'asc' },
        });
    }
    async findSocialAccountById(id) {
        return prisma_1.default.socialAccount.findUnique({ where: { id } });
    }
    async addSocialAccount(creatorProfileId, data) {
        return prisma_1.default.socialAccount.create({ data: { creatorProfileId, ...data } });
    }
    async updateSocialAccount(id, data) {
        return prisma_1.default.socialAccount.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
    }
    async deleteSocialAccount(id) {
        return prisma_1.default.socialAccount.delete({ where: { id } });
    }
    async findSocialAccountByPlatform(creatorProfileId, platform) {
        return prisma_1.default.socialAccount.findUnique({ where: { creatorProfileId_platform: { creatorProfileId, platform } } });
    }
    // ── Payment Methods ──────────────────────────────────────────────────────────
    async updatePaymentMethods(userId, methods) {
        return prisma_1.default.creatorProfile.update({ where: { userId }, data: { paymentMethods: methods } });
    }
    async updateCampaignPrefs(userId, data) {
        return prisma_1.default.creatorProfile.update({ where: { userId }, data });
    }
    // ── Earnings Summary ─────────────────────────────────────────────────────────
    async getEarningsSummary(userId) {
        const profile = await prisma_1.default.creatorProfile.findUnique({ where: { userId }, select: { id: true } });
        if (!profile)
            return { totalEarned: 0, pendingEarnings: 0, totalApplications: 0 };
        const [accepted, pending, total] = await Promise.all([
            prisma_1.default.application.aggregate({
                where: { creatorId: profile.id, status: 'ACCEPTED' },
                _sum: { proposedRate: true },
            }),
            prisma_1.default.application.aggregate({
                where: { creatorId: profile.id, status: 'PENDING' },
                _sum: { proposedRate: true },
            }),
            prisma_1.default.application.count({ where: { creatorId: profile.id } }),
        ]);
        return {
            totalEarned: accepted._sum.proposedRate ?? 0,
            pendingEarnings: pending._sum.proposedRate ?? 0,
            totalApplications: total,
        };
    }
}
exports.CreatorRepository = CreatorRepository;
//# sourceMappingURL=creator.repository.js.map