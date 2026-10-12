import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { AppError } from '../../middleware/error';
import { uploadImage as uploadToCloudinary } from '../../utils/cloudinary';
import { PartnerService } from './partner.service';

import { HttpStatus } from '../../constants/httpStatus';

const partnerService = new PartnerService();
// Logos keep their own aspect ratio (wordmarks are wide) — bounded, never cropped.
const LOGO_TRANSFORMATION = [{ width: 600, height: 300, crop: 'limit' }];

export class PartnerController {
  async listPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await partnerService.listPublic(), 'Partners retrieved');
    } catch (err) {
      next(err);
    }
  }

  async listForAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await partnerService.listForAdmin(), 'Partners retrieved');
    } catch (err) {
      next(err);
    }
  }

  async uploadLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError('No image file provided', HttpStatus.BAD_REQUEST);
      const logoUrl = await uploadToCloudinary(req.file.buffer, 'partners/logos', `partner_${Date.now()}`, LOGO_TRANSFORMATION);
      success(res, { logoUrl }, 'Logo uploaded');
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await partnerService.create(req.body), 'Partner created', 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await partnerService.update(req.params.id, req.body), 'Partner updated');
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await partnerService.updateStatus(req.params.id, req.body.status), 'Partner status updated');
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await partnerService.remove(req.params.id);
      success(res, null, 'Partner deleted');
    } catch (err) {
      next(err);
    }
  }
}
