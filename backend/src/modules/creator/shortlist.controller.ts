import { Request, Response, NextFunction } from 'express';
import { ShortlistRepository } from './shortlist.repository';
import { CreatorRepository } from './creator.repository';
import { toCampaignDto } from '../campaign/campaign.dto';
import { AppError } from '../../middleware/error';
import { getDict } from '../../i18n';

import { HttpStatus } from '../../constants/httpStatus';

const shortlistRepo = new ShortlistRepository();
const creatorRepo   = new CreatorRepository();

export class ShortlistController {
  // Toggling is silent by design — unlike favoriting a business, a shortlist
  // is private to the creator, so the business is never notified.
  async toggle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const creator = await creatorRepo.findByUserId(req.user!.id);
      if (!creator) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);
      const result = await shortlistRepo.toggle(creator.id, req.params.campaignId);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  async listIds(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const creator = await creatorRepo.findByUserId(req.user!.id);
      if (!creator) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);
      const ids = await shortlistRepo.getIds(creator.id);
      res.json({ success: true, data: { ids } });
    } catch (err) { next(err); }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const creator = await creatorRepo.findByUserId(req.user!.id);
      if (!creator) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);
      const campaigns = await shortlistRepo.listCampaigns(creator.id);
      res.json({ success: true, data: { campaigns: campaigns.map(toCampaignDto) } });
    } catch (err) { next(err); }
  }
}
