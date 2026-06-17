"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoriteRepository = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
class FavoriteRepository {
    async toggle(creatorId, businessId) {
        const existing = await prisma_1.default.favoriteBusiness.findUnique({
            where: { creatorId_businessId: { creatorId, businessId } },
        });
        if (existing) {
            await prisma_1.default.favoriteBusiness.delete({ where: { id: existing.id } });
            return { isFavorited: false };
        }
        await prisma_1.default.favoriteBusiness.create({ data: { creatorId, businessId } });
        return { isFavorited: true };
    }
    async getFavoriteIds(creatorId) {
        const rows = await prisma_1.default.favoriteBusiness.findMany({
            where: { creatorId },
            select: { businessId: true },
        });
        return rows.map((r) => r.businessId);
    }
    async isFavorited(creatorId, businessId) {
        const row = await prisma_1.default.favoriteBusiness.findUnique({
            where: { creatorId_businessId: { creatorId, businessId } },
        });
        return row !== null;
    }
    async getCreatorUserIdsForBusiness(businessId) {
        const rows = await prisma_1.default.favoriteBusiness.findMany({
            where: { businessId },
            include: { creator: { select: { userId: true } } },
        });
        return rows.map((r) => r.creator.userId);
    }
}
exports.FavoriteRepository = FavoriteRepository;
//# sourceMappingURL=favorite.repository.js.map