import { Request, Response, NextFunction } from 'express';
import { SavedCreatorRepository } from './saved-creator.repository';
import { BusinessRepository } from './business.repository';
import { notificationService } from '../notifications/notification.service';
import { analyticsService } from '../analytics/analytics.service';
import { AppError } from '../../middleware/error';
import prisma from '../../prisma';

const savedRepo   = new SavedCreatorRepository();
const businessRepo = new BusinessRepository();

export class SavedCreatorController {
  async toggle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const business = await businessRepo.findByUserId(req.user!.id);
      if (!business) throw new AppError('Business profile not found', 404);

      const creatorId = req.params.id;
      const result = await savedRepo.toggle(business.id, creatorId);

      if (result.isSaved) {
        const creator = await prisma.creatorProfile.findUnique({
          where: { id: creatorId },
          select: { userId: true },
        });
        if (creator) {
          notificationService.create({
            userId:  creator.userId,
            type:    'creator_saved',
            title:   `${business.businessName} saved your profile`,
            body:    'A business is interested in working with you!',
            refId:   business.id,
            refType: 'business_profile',
          }).catch(() => {});
        }
      }

      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  async listSaved(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const business = await businessRepo.findByUserId(req.user!.id);
      if (!business) throw new AppError('Business profile not found', 404);
      const search = req.query.search as string | undefined;
      const location = req.query.location as string | undefined;
      const categoriesRaw = req.query.categories as string | undefined;
      const platformsRaw = req.query.platforms as string | undefined;
      const categories = categoriesRaw ? categoriesRaw.split(',').filter(Boolean) : undefined;
      const platforms = platformsRaw ? platformsRaw.split(',').filter(Boolean) : undefined;
      const priceMin = req.query.priceMin ? parseFloat(String(req.query.priceMin)) : undefined;
      const priceMax = req.query.priceMax ? parseFloat(String(req.query.priceMax)) : undefined;
      const saved = await savedRepo.listSaved(business.id, { search, categories, location, platforms, priceMin, priceMax });
      res.json({ success: true, data: saved });
    } catch (err) { next(err); }
  }

  async getSavedIds(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const business = await businessRepo.findByUserId(req.user!.id);
      if (!business) throw new AppError('Business profile not found', 404);
      const ids = await savedRepo.getSavedIds(business.id);
      res.json({ success: true, data: { ids } });
    } catch (err) { next(err); }
  }

  async inviteCreators(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const business = await businessRepo.findByUserId(req.user!.id);
      if (!business) throw new AppError('Business profile not found', 404);

      const { campaignId } = req.params;
      const { creatorIds, message } = req.body as { creatorIds: string[]; message?: string };

      if (!Array.isArray(creatorIds) || creatorIds.length === 0) {
        throw new AppError('creatorIds must be a non-empty array', 400);
      }

      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true, title: true, businessId: true },
      });
      if (!campaign || campaign.businessId !== business.id) {
        throw new AppError('Campaign not found', 404);
      }

      // A creator can only be invited to a campaign once. Anyone who already has
      // an invitation — however they responded, or still pending — is skipped:
      // re-sending must not overwrite their message or fire a second notification.
      const requestedIds = [...new Set(creatorIds)];
      const existing = await prisma.campaignInvitation.findMany({
        where: { campaignId, creatorId: { in: requestedIds } },
        select: { creatorId: true },
      });
      const alreadyInvited = new Set(existing.map((e) => e.creatorId));
      const newCreatorIds = requestedIds.filter((id) => !alreadyInvited.has(id));

      if (newCreatorIds.length > 0) {
        await prisma.campaignInvitation.createMany({
          data: newCreatorIds.map((creatorId) => ({
            campaignId,
            creatorId,
            businessId: business.id,
            message: message ?? null,
          })),
          skipDuplicates: true,
        });

        await Promise.all(
          newCreatorIds.map(async (creatorId) => {
            const creator = await prisma.creatorProfile.findUnique({
              where: { id: creatorId },
              select: { userId: true },
            });
            if (creator) {
              analyticsService.incrInvitationReceived(creator.userId);
              notificationService.create({
                userId:  creator.userId,
                type:    'campaign_invitation',
                title:   `${business.businessName} invited you to a campaign`,
                body:    `You've been invited to: ${campaign.title}`,
                refId:   campaignId,
                refType: 'campaign',
              }).catch(() => {});
            }
          })
        );
      }

      res.json({
        success: true,
        data: { invited: newCreatorIds.length, skipped: alreadyInvited.size },
      });
    } catch (err) { next(err); }
  }

  // Everyone this business has invited to one campaign, with how each creator
  // responded — powers the "Invited" tab of a free event's proposals screen
  // (campaign-proposals.tsx), which lists invitees separately from the
  // creators who applied on their own.
  async listCampaignInvitations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const business = await businessRepo.findByUserId(req.user!.id);
      if (!business) throw new AppError('Business profile not found', 404);

      const { campaignId } = req.params;
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true, businessId: true },
      });
      if (!campaign || campaign.businessId !== business.id) {
        throw new AppError('Campaign not found', 404);
      }

      const invitations = await prisma.campaignInvitation.findMany({
        where: { campaignId },
        orderBy: { createdAt: 'desc' },
        select: {
          id:          true,
          status:      true,
          message:     true,
          createdAt:   true,
          respondedAt: true,
          creator: {
            select: { id: true, userId: true, fullName: true, avatarUrl: true, location: true },
          },
        },
      });

      res.json({
        success: true,
        data: invitations.map((i) => ({
          id:          i.id,
          status:      i.status,
          message:     i.message,
          createdAt:   i.createdAt,
          respondedAt: i.respondedAt,
          creator: {
            id:        i.creator.id,
            userId:    i.creator.userId,
            fullName:  i.creator.fullName ?? 'Creator',
            avatarUrl: i.creator.avatarUrl,
            location:  i.creator.location,
          },
        })),
      });
    } catch (err) { next(err); }
  }
}
