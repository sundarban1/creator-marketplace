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

      await Promise.all(
        creatorIds.map((creatorId) =>
          prisma.campaignInvitation.upsert({
            where: { campaignId_creatorId: { campaignId, creatorId } },
            update: { message: message ?? null, businessId: business.id },
            create: { campaignId, creatorId, businessId: business.id, message: message ?? null },
          })
        )
      );

      await Promise.all(
        creatorIds.map(async (creatorId) => {
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

      res.json({ success: true, data: { invited: creatorIds.length } });
    } catch (err) { next(err); }
  }
}
