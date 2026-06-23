"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SavedCreatorRepository = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
class SavedCreatorRepository {
    async toggle(businessId, creatorId) {
        const existing = await prisma_1.default.savedCreator.findUnique({
            where: { businessId_creatorId: { businessId, creatorId } },
        });
        if (existing) {
            await prisma_1.default.savedCreator.delete({ where: { id: existing.id } });
            return { isSaved: false };
        }
        await prisma_1.default.savedCreator.create({ data: { businessId, creatorId } });
        return { isSaved: true };
    }
    async listSaved(businessId) {
        return prisma_1.default.savedCreator.findMany({
            where: { businessId },
            orderBy: { createdAt: 'desc' },
            include: {
                creator: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true,
                        location: true,
                        categories: true,
                        isVerified: true,
                        socialAccounts: { select: { platform: true, followers: true } },
                    },
                },
            },
        });
    }
    async getSavedIds(businessId) {
        const rows = await prisma_1.default.savedCreator.findMany({
            where: { businessId },
            select: { creatorId: true },
        });
        return rows.map((r) => r.creatorId);
    }
}
exports.SavedCreatorRepository = SavedCreatorRepository;
//# sourceMappingURL=saved-creator.repository.js.map