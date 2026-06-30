"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignRepository = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../prisma"));
class CampaignRepository {
    async create(data) {
        return prisma_1.default.campaign.create({
            data: {
                ...data,
                campaignType: data.campaignType ?? 'PAID_CAMPAIGN',
                capacity: data.capacity ?? null,
                eventDate: data.eventDate ?? null,
                venue: data.venue ?? null,
                benefits: data.benefits ?? [],
                eventStatus: 'OPEN',
            },
            include: {
                business: { select: { businessName: true, logoUrl: true } },
                _count: { select: { applications: true } },
            },
        });
    }
    async findMany(filters) {
        const where = {};
        if (filters.search) {
            where.OR = [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { business: { businessName: { contains: filters.search, mode: 'insensitive' } } },
            ];
        }
        if (filters.category) {
            where.category = { contains: filters.category, mode: 'insensitive' };
        }
        if (filters.platform) {
            where.platform = { contains: filters.platform, mode: 'insensitive' };
        }
        if (filters.campaignType) {
            where.campaignType = filters.campaignType;
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
        return rows.map((r) => r.category).filter(Boolean);
    }
    async getDistinctPlatforms() {
        const rows = await prisma_1.default.campaign.findMany({
            where: { status: 'ACTIVE' },
            select: { platform: true },
            distinct: ['platform'],
            orderBy: { platform: 'asc' },
        });
        return rows.map((r) => r.platform).filter(Boolean);
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
                            id: true,
                            userId: true,
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
    // Alias used by getCampaignApplications (campaign-proposals page)
    async findApplicationsByCampaignId(campaignId, page, limit) {
        return this.findApplicationsByCampaign(campaignId, page, limit);
    }
    async findApplicationsByBusinessId(businessId, page, limit) {
        const skip = (page - 1) * limit;
        const [applications, total] = await Promise.all([
            prisma_1.default.application.findMany({
                where: { campaign: { businessId } },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    campaignId: true,
                    coverLetter: true,
                    proposedRate: true,
                    timeline: true,
                    socialHandles: true,
                    portfolioUrl: true,
                    status: true,
                    workStatus: true,
                    workNote: true,
                    submittedAt: true,
                    deliverableUrls: true,
                    paymentStatus: true,
                    paidAt: true,
                    createdAt: true,
                    creator: {
                        select: { id: true, fullName: true, avatarUrl: true, location: true },
                    },
                    campaign: {
                        select: { id: true, title: true, platform: true, campaignType: true, paymentStatus: true },
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
                campaign: { include: { business: { select: { id: true, userId: true, businessName: true } } } },
                creator: { select: { id: true, userId: true, fullName: true } },
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
                select: {
                    id: true,
                    campaignId: true,
                    coverLetter: true,
                    proposedRate: true,
                    timeline: true,
                    socialHandles: true,
                    portfolioUrl: true,
                    status: true,
                    workStatus: true,
                    workNote: true,
                    submittedAt: true,
                    deliverableUrls: true,
                    paymentStatus: true,
                    paidAt: true,
                    createdAt: true,
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
                            campaignType: true,
                            paymentStatus: true,
                            paidAt: true,
                            business: { select: { id: true, businessName: true, logoUrl: true } },
                        },
                    },
                },
            }),
            prisma_1.default.application.count({ where: { creatorId } }),
        ]);
        return { applications, total };
    }
    async payForCampaign(campaignId, method) {
        return prisma_1.default.campaign.update({
            where: { id: campaignId },
            data: {
                paymentStatus: client_1.PaymentStatus.PAID,
                paidAt: new Date(),
                paymentMethod: method,
            },
        });
    }
    async startWork(appId) {
        return prisma_1.default.application.update({
            where: { id: appId },
            data: { workStatus: client_1.WorkStatus.IN_PROGRESS },
        });
    }
    async submitWork(appId, data) {
        return prisma_1.default.application.update({
            where: { id: appId },
            data: {
                workStatus: client_1.WorkStatus.SUBMITTED,
                workNote: data.note ?? null,
                deliverableUrls: data.urls ?? null,
                submittedAt: new Date(),
            },
        });
    }
    async approveWork(appId) {
        return prisma_1.default.application.update({
            where: { id: appId },
            data: { workStatus: client_1.WorkStatus.APPROVED },
        });
    }
    async requestRevision(appId, note) {
        return prisma_1.default.application.update({
            where: { id: appId },
            data: { workStatus: client_1.WorkStatus.IN_PROGRESS, workNote: note },
        });
    }
    async payForApplication(appId) {
        return prisma_1.default.application.update({
            where: { id: appId },
            data: { paymentStatus: 'PAID', paidAt: new Date() },
        });
    }
    async releaseApplicationPayment(appId) {
        return prisma_1.default.application.update({
            where: { id: appId },
            data: { paymentStatus: 'RELEASED' },
        });
    }
    async countAcceptedApplications(campaignId) {
        return prisma_1.default.application.count({
            where: { campaignId, status: 'ACCEPTED' },
        });
    }
    async rejectPendingApplications(campaignId, excludeAppId) {
        const pending = await prisma_1.default.application.findMany({
            where: { campaignId, id: { not: excludeAppId }, status: 'PENDING' },
            select: { id: true, creator: { select: { userId: true } } },
        });
        if (pending.length === 0)
            return [];
        await prisma_1.default.application.updateMany({
            where: { id: { in: pending.map((a) => a.id) } },
            data: { status: 'REJECTED' },
        });
        return pending;
    }
    async closeCampaign(campaignId) {
        await prisma_1.default.campaign.update({
            where: { id: campaignId },
            data: { status: 'CLOSED' },
        });
    }
    async cancelCampaign(campaignId) {
        return prisma_1.default.campaign.update({
            where: { id: campaignId },
            data: { status: 'CLOSED' },
        });
    }
    async getUserEmails(userIds) {
        const users = await prisma_1.default.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true },
        });
        return new Map(users.map((u) => [u.id, u.email]));
    }
}
exports.CampaignRepository = CampaignRepository;
//# sourceMappingURL=campaign.repository.js.map