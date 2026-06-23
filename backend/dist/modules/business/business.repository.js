"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessRepository = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
class BusinessRepository {
    async findMany(params) {
        const where = { showPublicProfile: true };
        if (params.search) {
            where.businessName = { contains: params.search, mode: 'insensitive' };
        }
        if (params.category) {
            where.categories = { has: params.category };
        }
        if (params.platform || (params.locations && params.locations.length > 0)) {
            const campaignWhere = { status: 'ACTIVE' };
            if (params.platform)
                campaignWhere.platform = params.platform;
            if (params.locations && params.locations.length > 0) {
                campaignWhere.OR = params.locations.map((loc) => ({
                    location: { contains: loc, mode: 'insensitive' },
                }));
            }
            where.campaigns = { some: campaignWhere };
        }
        const skip = (params.page - 1) * params.limit;
        const [businesses, total] = await Promise.all([
            prisma_1.default.businessProfile.findMany({
                where,
                skip,
                take: params.limit,
                orderBy: [{ isVerified: 'desc' }, { businessName: 'asc' }],
                select: {
                    id: true,
                    businessName: true,
                    description: true,
                    logoUrl: true,
                    website: true,
                    categories: true,
                    isVerified: true,
                    _count: { select: { campaigns: { where: { status: 'ACTIVE' } } } },
                },
            }),
            prisma_1.default.businessProfile.count({ where }),
        ]);
        return { businesses, total };
    }
    async findPublicById(id) {
        return prisma_1.default.businessProfile.findUnique({
            where: { id },
            select: {
                id: true,
                businessName: true,
                description: true,
                logoUrl: true,
                website: true,
                categories: true,
                isVerified: true,
                createdAt: true,
                showPublicProfile: true,
                hideContactDetails: true,
                allowDirectMessages: true,
                userId: true,
                campaigns: {
                    where: { status: 'ACTIVE' },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    select: {
                        id: true,
                        title: true,
                        platform: true,
                        category: true,
                        budgetMin: true,
                        budgetMax: true,
                        deadline: true,
                        contentType: true,
                        isFeatured: true,
                        location: true,
                        _count: { select: { applications: true } },
                    },
                },
                _count: { select: { campaigns: { where: { status: 'ACTIVE' } } } },
            },
        });
    }
    async findByUserId(userId) {
        return prisma_1.default.businessProfile.findUnique({
            where: { userId },
            include: {
                user: { select: { id: true, email: true, role: true, isEmailVerified: true } },
            },
        });
    }
    async findById(id) {
        return prisma_1.default.businessProfile.findUnique({
            where: { id },
        });
    }
    async update(userId, data) {
        return prisma_1.default.businessProfile.update({
            where: { userId },
            data,
        });
    }
}
exports.BusinessRepository = BusinessRepository;
//# sourceMappingURL=business.repository.js.map