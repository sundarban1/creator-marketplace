import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { AppError } from '../../middleware/error';
import { uploadImage as uploadToCloudinary } from '../../utils/cloudinary';
import { PortfolioService } from './portfolio.service';

const portfolioService = new PortfolioService();

export class PortfolioController {
  async listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const items = await portfolioService.listMine(req.user!.id);
      success(res, items, 'Portfolio items retrieved');
    } catch (err) { next(err); }
  }

  // Standalone upload step, separate from create/update — the mobile client
  // uploads the picked image first and gets a URL back, then submits the rest
  // of the form fields as normal JSON, same two-step flow as avatar/feature
  // image uploads elsewhere. Response key matches campaign-feature's
  // `imageUrl` convention (see uploadImage.ts's uploadAsset on mobile) so the
  // shared client-side parser needs no changes for this new upload target.
  async uploadMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError('No image file provided', 400);
      const imageUrl = await uploadToCloudinary(
        req.file.buffer,
        'creators/portfolio',
        `portfolio_${req.user!.id}_${randomUUID()}`,
        [{ width: 1200, crop: 'limit' }],
      );
      success(res, { imageUrl }, 'Media uploaded');
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const item = await portfolioService.create(req.user!.id, req.body);
      success(res, item, 'Portfolio item added', 201);
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const item = await portfolioService.update(req.user!.id, req.params.id, req.body);
      success(res, item, 'Portfolio item updated');
    } catch (err) { next(err); }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await portfolioService.remove(req.user!.id, req.params.id);
      success(res, null, 'Portfolio item removed');
    } catch (err) { next(err); }
  }
}
