import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { AppError } from '../../middleware/error';
import { uploadImage as uploadToCloudinary } from '../../utils/cloudinary';
import { SuccessStoryService } from './success-story.service';

const successStoryService = new SuccessStoryService();
const PHOTO_TRANSFORMATION = [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }];

export class SuccessStoryController {
  async listPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stories = await successStoryService.listPublic();
      success(res, stories, 'Success stories retrieved');
    } catch (err) {
      next(err);
    }
  }

  async listForAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stories = await successStoryService.listForAdmin();
      success(res, stories, 'Success stories retrieved');
    } catch (err) {
      next(err);
    }
  }

  async uploadPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError('No image file provided', 400);
      const photoUrl = await uploadToCloudinary(
        req.file.buffer,
        'success-stories/photos',
        `story_${Date.now()}`,
        PHOTO_TRANSFORMATION,
      );
      success(res, { photoUrl }, 'Photo uploaded');
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const story = await successStoryService.create(req.body);
      success(res, story, 'Success story created', 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const story = await successStoryService.update(req.params.id, req.body);
      success(res, story, 'Success story updated');
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const story = await successStoryService.updateStatus(req.params.id, req.body.status);
      success(res, story, 'Success story status updated');
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await successStoryService.remove(req.params.id);
      success(res, null, 'Success story deleted');
    } catch (err) {
      next(err);
    }
  }
}
