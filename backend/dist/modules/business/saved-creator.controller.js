"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SavedCreatorController = void 0;
const saved_creator_repository_1 = require("./saved-creator.repository");
const business_repository_1 = require("./business.repository");
const notification_service_1 = require("../notifications/notification.service");
const error_1 = require("../../middleware/error");
const prisma_1 = __importDefault(require("../../prisma"));
const savedRepo = new saved_creator_repository_1.SavedCreatorRepository();
const businessRepo = new business_repository_1.BusinessRepository();
class SavedCreatorController {
    async toggle(req, res, next) {
        try {
            const business = await businessRepo.findByUserId(req.user.id);
            if (!business)
                throw new error_1.AppError('Business profile not found', 404);
            const creatorId = req.params.id;
            const result = await savedRepo.toggle(business.id, creatorId);
            if (result.isSaved) {
                const creator = await prisma_1.default.creatorProfile.findUnique({
                    where: { id: creatorId },
                    select: { userId: true },
                });
                if (creator) {
                    notification_service_1.notificationService.create({
                        userId: creator.userId,
                        type: 'creator_saved',
                        title: `${business.businessName} saved your profile`,
                        body: 'A business is interested in working with you!',
                        refId: business.id,
                        refType: 'business_profile',
                    }).catch(() => { });
                }
            }
            res.json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    async listSaved(req, res, next) {
        try {
            const business = await businessRepo.findByUserId(req.user.id);
            if (!business)
                throw new error_1.AppError('Business profile not found', 404);
            const saved = await savedRepo.listSaved(business.id);
            res.json({ success: true, data: saved });
        }
        catch (err) {
            next(err);
        }
    }
    async getSavedIds(req, res, next) {
        try {
            const business = await businessRepo.findByUserId(req.user.id);
            if (!business)
                throw new error_1.AppError('Business profile not found', 404);
            const ids = await savedRepo.getSavedIds(business.id);
            res.json({ success: true, data: { ids } });
        }
        catch (err) {
            next(err);
        }
    }
    async inviteCreators(req, res, next) {
        try {
            const business = await businessRepo.findByUserId(req.user.id);
            if (!business)
                throw new error_1.AppError('Business profile not found', 404);
            const { campaignId } = req.params;
            const { creatorIds, message } = req.body;
            if (!Array.isArray(creatorIds) || creatorIds.length === 0) {
                throw new error_1.AppError('creatorIds must be a non-empty array', 400);
            }
            const campaign = await prisma_1.default.campaign.findUnique({
                where: { id: campaignId },
                select: { id: true, title: true, businessId: true },
            });
            if (!campaign || campaign.businessId !== business.id) {
                throw new error_1.AppError('Campaign not found', 404);
            }
            await Promise.all(creatorIds.map((creatorId) => prisma_1.default.campaignInvitation.upsert({
                where: { campaignId_creatorId: { campaignId, creatorId } },
                update: { message: message ?? null, businessId: business.id },
                create: { campaignId, creatorId, businessId: business.id, message: message ?? null },
            })));
            await Promise.all(creatorIds.map(async (creatorId) => {
                const creator = await prisma_1.default.creatorProfile.findUnique({
                    where: { id: creatorId },
                    select: { userId: true },
                });
                if (creator) {
                    notification_service_1.notificationService.create({
                        userId: creator.userId,
                        type: 'campaign_invitation',
                        title: `${business.businessName} invited you to a campaign`,
                        body: `You've been invited to: ${campaign.title}`,
                        refId: campaignId,
                        refType: 'campaign',
                    }).catch(() => { });
                }
            }));
            res.json({ success: true, data: { invited: creatorIds.length } });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.SavedCreatorController = SavedCreatorController;
//# sourceMappingURL=saved-creator.controller.js.map