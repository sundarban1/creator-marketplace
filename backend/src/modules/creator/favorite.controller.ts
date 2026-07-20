import { Request, Response, NextFunction } from 'express';
import { FavoriteRepository } from './favorite.repository';
import { CreatorRepository } from './creator.repository';
import { notificationService } from '../notifications/notification.service';
import { AppError } from '../../middleware/error';
import prisma from '../../prisma';

const favoriteRepo = new FavoriteRepository();
const creatorRepo  = new CreatorRepository();

export class FavoriteController {
  async toggle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const creator = await creatorRepo.findByUserId(req.user!.id);
      if (!creator) throw new AppError('Creator profile not found', 404);

      const businessId = req.params.businessId;
      const result = await favoriteRepo.toggle(creator.id, businessId);

      if (result.isFavorited) {
        const business = await prisma.businessProfile.findUnique({
          where: { id: businessId },
          select: { userId: true, businessName: true },
        });
        if (business) {
          notificationService.create({
            userId:  business.userId,
            type:    'business_favorited',
            title:   `${creator.fullName} added you to favorites`,
            body:    `${creator.fullName} is interested in your business.`,
            refId:   creator.id,
            refType: 'creator_profile',
          }).catch(() => {});
        }
      }

      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  async listFavorites(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const creator = await creatorRepo.findByUserId(req.user!.id);
      if (!creator) throw new AppError('Creator profile not found', 404);
      const ids = await favoriteRepo.getFavoriteIds(creator.id);
      res.json({ success: true, data: { ids } });
    } catch (err) { next(err); }
  }

  async listFavoriteBusinesses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const creator = await creatorRepo.findByUserId(req.user!.id);
      if (!creator) throw new AppError('Creator profile not found', 404);
      const { category, platform, locations } = req.query as Record<string, string>;
      const locationList = locations
        ? locations.split(',').map((l) => l.trim()).filter(Boolean)
        : undefined;
      const rows = await favoriteRepo.getFavoriteBusinesses(creator.id, {
        category:  category || undefined,
        platform:  platform || undefined,
        locations: locationList && locationList.length > 0 ? locationList : undefined,
      });
      const businesses = rows.map((r) => r.business);
      res.json({ success: true, data: businesses });
    } catch (err) { next(err); }
  }
}
