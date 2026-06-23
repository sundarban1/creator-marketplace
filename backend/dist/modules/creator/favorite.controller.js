"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoriteController = void 0;
const favorite_repository_1 = require("./favorite.repository");
const creator_repository_1 = require("./creator.repository");
const notification_service_1 = require("../notifications/notification.service");
const error_1 = require("../../middleware/error");
const prisma_1 = __importDefault(require("../../prisma"));
const favoriteRepo = new favorite_repository_1.FavoriteRepository();
const creatorRepo = new creator_repository_1.CreatorRepository();
class FavoriteController {
    async toggle(req, res, next) {
        try {
            const creator = await creatorRepo.findByUserId(req.user.id);
            if (!creator)
                throw new error_1.AppError('Creator profile not found', 404);
            const businessId = req.params.businessId;
            const result = await favoriteRepo.toggle(creator.id, businessId);
            if (result.isFavorited) {
                const business = await prisma_1.default.businessProfile.findUnique({
                    where: { id: businessId },
                    select: { userId: true, businessName: true },
                });
                if (business) {
                    notification_service_1.notificationService.create({
                        userId: business.userId,
                        type: 'business_favorited',
                        title: `${creator.fullName} added you to favorites`,
                        body: `${creator.fullName} is interested in your business.`,
                        refId: creator.id,
                        refType: 'creator_profile',
                    }).catch(() => { });
                }
            }
            res.json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    async listFavorites(req, res, next) {
        try {
            const creator = await creatorRepo.findByUserId(req.user.id);
            if (!creator)
                throw new error_1.AppError('Creator profile not found', 404);
            const ids = await favoriteRepo.getFavoriteIds(creator.id);
            res.json({ success: true, data: { ids } });
        }
        catch (err) {
            next(err);
        }
    }
    async listFavoriteBusinesses(req, res, next) {
        try {
            const creator = await creatorRepo.findByUserId(req.user.id);
            if (!creator)
                throw new error_1.AppError('Creator profile not found', 404);
            const rows = await favoriteRepo.getFavoriteBusinesses(creator.id);
            const businesses = rows.map((r) => r.business);
            res.json({ success: true, data: businesses });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.FavoriteController = FavoriteController;
//# sourceMappingURL=favorite.controller.js.map