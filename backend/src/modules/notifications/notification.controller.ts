import { Request, Response, NextFunction } from 'express';
import { notificationService } from './notification.service';
import { paginated } from '../../utils/response';

import { HttpStatus } from '../../constants/httpStatus';

export class NotificationController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 50));
      const { notifications, total } = await notificationService.getForUser(req.user!.id, req.language, page, limit);
      paginated(res, notifications, total, page, limit);
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

  async registerPushToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body as { token: string };
      if (!token) { res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'token required' }); return; }
      const deviceId = req.headers['x-device-id'] as string | undefined;
      await notificationService.registerPushToken(req.user!.id, token, deviceId);
      res.json({ success: true });
    } catch (err) { next(err); }
  }

  async removePushToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = (req.body ?? {}) as { token?: string };
      const deviceId = req.headers['x-device-id'] as string | undefined;
      await notificationService.removePushToken(req.user!.id, deviceId, token);
      res.json({ success: true });
    } catch (err) { next(err); }
  }

  async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await notificationService.getSettings(req.user!.id);
      res.json({ success: true, data: settings });
    } catch (err) { next(err); }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pushNotificationsEnabled, emailNotificationsEnabled } = req.body as {
        pushNotificationsEnabled?: boolean;
        emailNotificationsEnabled?: boolean;
      };
      const settings = await notificationService.updateSettings(req.user!.id, { pushNotificationsEnabled, emailNotificationsEnabled });
      res.json({ success: true, data: settings });
    } catch (err) { next(err); }
  }
}
