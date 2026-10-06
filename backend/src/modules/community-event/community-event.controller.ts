import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { AppError } from '../../middleware/error';
import { HttpStatus } from '../../constants/httpStatus';
import { uploadImage as uploadToCloudinary, type UploadFolder } from '../../utils/cloudinary';
import { CommunityEventService } from './community-event.service';

const service = new CommunityEventService();

// Per-kind Cloudinary folder + upload transformation. Event photos keep their
// aspect ratio (crop: 'limit' only caps the long edge); speaker headshots are
// face-cropped squares like other avatars; partner logos stay small.
const UPLOAD_KINDS: Record<string, { folder: UploadFolder; transformation: Record<string, unknown>[] }> = {
  cover:     { folder: 'community-events/covers',     transformation: [{ width: 2400, height: 2400, crop: 'limit' }] },
  gallery:   { folder: 'community-events/gallery',    transformation: [{ width: 2400, height: 2400, crop: 'limit' }] },
  highlight: { folder: 'community-events/highlights', transformation: [{ width: 1200, height: 1200, crop: 'limit' }] },
  speaker:   { folder: 'community-events/speakers',   transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }] },
  partner:   { folder: 'community-events/partners',   transformation: [{ width: 600, height: 300, crop: 'limit' }] },
};

export class CommunityEventController {
  async listPublic(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await service.listPublic(), 'Events retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await service.getPublicBySlug(req.params.slug), 'Event retrieved');
    } catch (err) {
      next(err);
    }
  }

  async listForAdmin(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await service.listForAdmin(), 'Events retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getForAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await service.getForAdmin(req.params.id), 'Event retrieved');
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await service.create(req.body), 'Event created', 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await service.update(req.params.id, req.body), 'Event updated');
    } catch (err) {
      next(err);
    }
  }

  async setPublished(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await service.setPublished(req.params.id, req.body.published);
      success(res, event, req.body.published ? 'Event published' : 'Event unpublished');
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await service.remove(req.params.id);
      success(res, null, 'Event deleted');
    } catch (err) {
      next(err);
    }
  }

  /** Multi-file image upload → Cloudinary URLs, in the order the files were sent. */
  async uploadImages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      if (files.length === 0) throw new AppError('No image file provided', HttpStatus.BAD_REQUEST);
      const { folder, transformation } = UPLOAD_KINDS[req.query.kind as string] ?? UPLOAD_KINDS.gallery;
      const stamp = Date.now();
      const urls = await Promise.all(
        files.map((f, i) => uploadToCloudinary(f.buffer, folder, `event_${stamp}_${i}`, transformation)),
      );
      success(res, { urls }, 'Images uploaded');
    } catch (err) {
      next(err);
    }
  }
}
