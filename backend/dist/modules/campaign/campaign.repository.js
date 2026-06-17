"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignRepository = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
class CampaignRepository {
    async create(data) {
        return prisma_1.default.campaign.create({
            data,
            include: {
                business: { select: { businessName: true, logoUrl: true } },
                _count: { select: { applications: true } },
            },
        });
    }
    async findMany(filters) {
        const where = {};
        if (filters.category) {
            where.category = { contains: filters.category, mode: 'insensitive' };
        }
        if (filters.platform) {
            where.platform = { contains: filters.platform, mode: 'insensitive' };
        }
        if (filters.minBudget !== undefined) {
            where.budgetMax = { gte: filters.minBudget };
        }
        if (filters.maxBudget !== undefined) {
            where.budgetMin = { ...(where.budgetMin || {}), lte: filters.maxBudget };
        }
        if (filters.status) {
            where.status = filters.status;
        }
        else {
            where.status = 'ACTIVE'; // default to active for public listing
        }
        if (filters.isFeatured !== undefined) {
            where.isFeatured = filters.isFeatured;
        }
        if (filters.deadlineFrom !== undefined || filters.deadlineTo !== undefined) {
            where.deadline = {};
            if (filters.deadlineFrom)
                where.deadline.gte = filters.deadlineFrom;
            if (filters.deadlineTo)
                where.deadline.lte = filters.deadlineTo;
        }
        const skip = (filters.page - 1) * filters.limit;
        const [campaigns, total] = await Promise.all([
            prisma_1.default.campaign.findMany({
                where,
                skip,
                take: filters.limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    business: { select: { businessName: true, logoUrl: true } },
                    _count: { select: { applications: true } },
                },
            }),
            prisma_1.default.campaign.count({ where }),
        ]);
        return { campaigns, total };
    }
    async findById(id) {
        return prisma_1.default.campaign.findUnique({
            where: { id },
            include: {
                business: {
                    select: { businessName: true, logoUrl: true, website: true, description: true },
                },
                _count: { select: { applications: true } },
            },
        });
    }
    async findByBusinessId(businessId, page, limit) {
        const skip = (page - 1) * limit;
        const [campaigns, total] = await Promise.all([
            prisma_1.default.campaign.findMany({
                where: { businessId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { _count: { select: { applications: true } } },
            }),
            prisma_1.default.campaign.count({ where: { businessId } }),
        ]);
        return { campaigns, total };
    }
    async update(id, data) {
        return prisma_1.default.campaign.update({
            where: { id },
            data,
        });
    }
    async delete(id) {
        return prisma_1.default.campaign.delete({ where: { id } });
    }
    async getDistinctCategories() {
        const rows = await prisma_1.default.campaign.findMany({
            where: { status: 'ACTIVE' },
            select: { category: true },
            distinct: ['category'],
            orderBy: { category: 'asc' },
        });
        return rows.map((r) => r.category);
    }
    async findApplication(campaignId, creatorId) {
        return prisma_1.default.application.findUnique({
            where: { campaignId_creatorId: { campaignId, creatorId } },
        });
    }
    async createApplication(data) {
        return prisma_1.default.application.create({
            data,
            include: {
                campaign: { select: { title: true } },
                creator: { select: { fullName: true } },
            },
        });
    }
    async findApplicationsByCampaign(campaignId, page, limit) {
        const skip = (page - 1) * limit;
        const [applications, total] = await Promise.all([
            prisma_1.default.application.findMany({
                where: { campaignId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    creator: {
                        select: {
                            fullName: true,
                            avatarUrl: true,
                            location: true,
                            categories: true,
                            socialLinks: true,
                        },
                    },
                },
            }),
            prisma_1.default.application.count({ where: { campaignId } }),
        ]);
        return { applications, total };
    }
    async findApplicationsByBusinessId(businessId, page, limit) {
        const skip = (page - 1) * limit;
        const [applications, total] = await Promise.all([
            prisma_1.default.application.findMany({
                where: { campaign: { businessId } },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    creator: {
                        select: { id: true, fullName: true, avatarUrl: true, location: true },
                    },
                    campaign: {
                        select: { id: true, title: true, platform: true },
                    },
                },
            }),
            prisma_1.default.application.count({ where: { campaign: { businessId } } }),
        ]);
        return { applications, total };
    }
    async findApplicationById(id) {
        return prisma_1.default.application.findUnique({
            where: { id },
            include: {
                campaign: true,
                creator: { select: { userId: true, fullName: true } },
            },
        });
    }
    async updateApplicationStatus(id, status) {
        return prisma_1.default.application.update({
            where: { id },
            data: { status },
        });
    }
    async findPendingApplicationsByCampaign(campaignId, excludeAppId) {
        return prisma_1.default.application.findMany({
            where: { campaignId, id: { not: excludeAppId }, status: 'PENDING' },
            include: { creator: { select: { userId: true } } },
        });
    }
    async findApplicationsByCreator(creatorId, page, limit) {
        const skip = (page - 1) * limit;
        const [applications, total] = await Promise.all([
            prisma_1.default.application.findMany({
                where: { creatorId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    campaign: {
                        select: {
                            id: true,
                            title: true,
                            category: true,
                            platform: true,
                            budgetMin: true,
                            budgetMax: true,
                            deadline: true,
                            status: true,
                            business: { select: { businessName: true, logoUrl: true } },
                        },
                    },
                },
            }),
            prisma_1.default.application.count({ where: { creatorId } }),
        ]);
        return { applications, total };
    }
}
exports.CampaignRepository = CampaignRepository;
//# sourceMappingURL=campaign.repository.js.map