"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRepository = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
const profileSelect = {
    creatorProfile: { select: { id: true, username: true, fullName: true, avatarUrl: true } },
    businessProfile: { select: { id: true, businessName: true, logoUrl: true } },
};
class AuthRepository {
    async findUserByEmail(email) {
        return prisma_1.default.user.findUnique({ where: { email }, include: profileSelect });
    }
    async findUserById(id) {
        return prisma_1.default.user.findUnique({ where: { id }, include: profileSelect });
    }
    async findUserByPhone(phone) {
        return prisma_1.default.user.findUnique({ where: { phone } });
    }
    async createUserWithCreatorProfile(data) {
        return prisma_1.default.user.create({
            data: {
                email: data.email,
                phone: data.phone,
                password: data.password,
                role: data.role,
                creatorProfile: { create: { fullName: data.fullName } },
            },
            include: { creatorProfile: true },
        });
    }
    async createUserWithBusinessProfile(data) {
        return prisma_1.default.user.create({
            data: {
                email: data.email,
                phone: data.phone,
                password: data.password,
                role: data.role,
                businessProfile: { create: { businessName: data.businessName } },
            },
            include: { businessProfile: true },
        });
    }
    async updateRefreshToken(userId, refreshToken) {
        return prisma_1.default.user.update({ where: { id: userId }, data: { refreshToken } });
    }
    async updatePassword(userId, hashedPassword) {
        return prisma_1.default.user.update({
            where: { id: userId },
            data: { password: hashedPassword, refreshToken: null },
        });
    }
    async verifyEmail(userId) {
        return prisma_1.default.user.update({
            where: { id: userId },
            data: { isEmailVerified: true },
            include: profileSelect,
        });
    }
    async setOnboarded(userId) {
        return prisma_1.default.user.update({
            where: { id: userId },
            data: { isOnboarded: true },
        });
    }
    async deactivateAccount(userId) {
        return prisma_1.default.user.update({
            where: { id: userId },
            data: { isActive: false, refreshToken: null },
        });
    }
    async reactivateAccount(userId) {
        return prisma_1.default.user.update({
            where: { id: userId },
            data: { isActive: true },
            include: profileSelect,
        });
    }
    async deleteAccount(userId) {
        return prisma_1.default.user.delete({ where: { id: userId } });
    }
    async saveOtp(userId, code, expiresAt) {
        await prisma_1.default.otpVerification.deleteMany({ where: { userId } });
        return prisma_1.default.otpVerification.create({ data: { userId, code, expiresAt } });
    }
    async findValidOtp(userId, code) {
        return prisma_1.default.otpVerification.findFirst({
            where: { userId, code, expiresAt: { gt: new Date() } },
        });
    }
    async deleteOtpsByUserId(userId) {
        return prisma_1.default.otpVerification.deleteMany({ where: { userId } });
    }
}
exports.AuthRepository = AuthRepository;
//# sourceMappingURL=auth.repository.js.map