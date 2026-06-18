import { Request, Response, NextFunction } from 'express';
import { notificationService } from './notification.service';

export class NotificationController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notifications = await notificationService.getForUser(req.user!.id);
      res.json({ success: true, data: notifications });
    } catch (err) { next(err); }
  }

  async badge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.getBadge(req.user!.id);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationService.markRead(req.params.id, req.user!.id);
      res.json({ success: true });
    } catch (err) { next(err); }
  }

  async markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationService.markAllRead(req.user!.id);
      res.json({ success: true });
    } catch (err) { next(err); }
  }

  async markReadByRef(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationService.markReadByRef(req.user!.id, req.params.refId);
      res.json({ success: true });
    } catch (err) { next(err); }
  }
}
