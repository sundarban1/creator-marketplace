"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatorRepository = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
class CreatorRepository {
    async findByUserId(userId) {
        return prisma_1.default.creatorProfile.findUnique({
            where: { userId },
            include: { user: { select: { id: true, email: true, role: true, isEmailVerified: true } } },
        });
    }
    async findById(id) {
        return prisma_1.default.creatorProfile.findUnique({
            where: { id },
        });
    }
    async update(userId, data) {
        return prisma_1.default.creatorProfile.update({
            where: { userId },
            data,
        });
    }
    async addPortfolioLink(userId, link, currentLinks) {
        const updatedLinks = [...currentLinks, link];
        return prisma_1.default.creatorProfile.update({
            where: { userId },
            data: { portfolioLinks: updatedLinks },
        });
    }
    async removePortfolioLink(userId, linkId, currentLinks) {
        const updatedLinks = currentLinks.filter((l) => l.id !== linkId);
        return prisma_1.default.creatorProfile.update({
            where: { userId },
            data: { portfolioLinks: updatedLinks },
        });
    }
    async updateSocialLinks(userId, socialLinks) {
        return prisma_1.default.creatorProfile.update({
            where: { userId },
            data: { socialLinks },
        });
    }
}
exports.CreatorRepository = CreatorRepository;
//# sourceMappingURL=creator.repository.js.map