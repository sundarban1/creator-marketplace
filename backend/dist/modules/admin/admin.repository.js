"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminRepository = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../prisma"));
class AdminRepository {
    async getStats() {
        const [totalUsers, totalCreators, totalBusinesses, activeCampaigns, totalCampaigns, pendingApplications] = await Promise.all([
            prisma_1.default.user.count(),
            prisma_1.default.user.count({ where: { role: client_1.Role.CREATOR } }),
            prisma_1.default.user.count({ where: { role: client_1.Role.BUSINESS } }),
            prisma_1.default.campaign.count({ where: { status: client_1.CampaignStatus.ACTIVE } }),
            prisma_1.default.campaign.count(),
            prisma_1.default.application.count({ where: { status: 'PENDING' } }),
        ]);
        const recentUsers = await prisma_1.default.user.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                creatorProfile: { select: { fullName: true } },
                businessProfile: { select: { businessName: true } },
            },
        });
        return {
            totalUsers,
            totalCreators,
            totalBusinesses,
            activeCampaigns,
            totalCampaigns,
            pendingApplications,
            recentUsers,
        };
    }
    async getAllUsers(page, limit, role, search) {
        const where = {};
        if (role)
            where['role'] = role;
        if (search) {
            where['OR'] = [
                { email: { contains: search, mode: 'insensitive' } },
                { creatorProfile: { fullName: { contains: search, mode: 'insensitive' } } },
                { businessProfile: { businessName: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const [users, total] = await Promise.all([
            prisma_1.default.user.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    isEmailVerified: true,
                    createdAt: true,
                    creatorProfile: { select: { fullName: true, avatarUrl: true, isVerified: true } },
                    businessProfile: { select: { businessName: true, logoUrl: true, isVerified: true } },
                },
            }),
            prisma_1.default.user.count({ where }),
        ]);
        return { users, total };
    }
    async getAllCreators(page, limit, search) {
        const where = {};
        if (search) {
            where['OR'] = [
                { fullName: { contains: search, mode: 'insensitive' } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const [creators, total] = await Promise.all([
            prisma_1.default.creatorProfile.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { email: true, isEmailVerified: true, createdAt: true } },
                    _count: { select: { applications: true } },
                },
            }),
            prisma_1.default.creatorProfile.count({ where }),
        ]);
        return { creators, total };
    }
    async getAllBusinesses(page, limit, search) {
        const where = {};
        if (search) {
            where['OR'] = [
                { businessName: { contains: search, mode: 'insensitive' } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const [businesses, total] = await Promise.all([
            prisma_1.default.businessProfile.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { email: true, isEmailVerified: true, createdAt: true } },
                    _count: { select: { campaigns: true } },
                },
            }),
            prisma_1.default.businessProfile.count({ where }),
        ]);
        return { businesses, total };
    }
    async getAllCampaigns(page, limit, status, search) {
        const where = {};
        if (status)
            where['status'] = status;
        if (search) {
            where['OR'] = [
                { title: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
                { business: { businessName: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const [campaigns, total] = await Promise.all([
            prisma_1.default.campaign.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
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
    async updateUserVerification(userId, isEmailVerified) {
        return prisma_1.default.user.update({
            where: { id: userId },
            data: { isEmailVerified },
            select: { id: true, email: true, isEmailVerified: true },
        });
    }
    async updateCampaignStatus(campaignId, status) {
        return prisma_1.default.campaign.update({
            where: { id: campaignId },
            data: { status },
            select: { id: true, title: true, status: true },
        });
    }
    async deleteUser(userId) {
        return prisma_1.default.user.delete({ where: { id: userId } });
    }
}
exports.AdminRepository = AdminRepository;
//# sourceMappingURL=admin.repository.js.map