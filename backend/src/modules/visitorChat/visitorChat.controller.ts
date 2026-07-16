import { Request, Response, NextFunction } from 'express';
import { success, paginated } from '../../utils/response';
import { AppError } from '../../middleware/error';
import { VisitorChatService } from './visitorChat.service';
import type { VisitorChatStatus } from '@prisma/client';

const visitorChatService = new VisitorChatService();

export class VisitorChatController {
  // ── Public (visitor) ────────────────────────────────────────────────────

  async start(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { chat, token } = await visitorChatService.startChat(req.body);
      success(res, { chat, token }, 'Chat started', 201);
    } catch (err) { next(err); }
  }

  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const messages = await visitorChatService.listMessages(req.params['chatId']!);
      success(res, messages, 'Messages retrieved');
    } catch (err) { next(err); }
  }

  async sendVisitorMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const message = await visitorChatService.sendVisitorMessage(req.params['chatId']!, req.body.content);
      success(res, message, 'Message sent', 201);
    } catch (err) { next(err); }
  }

  async markSeenByVisitor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chat = await visitorChatService.markSeen(req.params['chatId']!, 'visitor');
      success(res, chat, 'Marked as seen');
    } catch (err) { next(err); }
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  async listForAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page  = Math.max(1, parseInt(req.query['page'] as string) || 1);
      const limit = Math.min(100, parseInt(req.query['limit'] as string) || 20);
      const status = req.query['status'] as VisitorChatStatus | undefined;
      const { items, total } = await visitorChatService.listChatsForAdmin({ status, page, limit });
      paginated(res, items, total, page, limit);
    } catch (err) { next(err); }
  }

  async getMessagesForAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const messages = await visitorChatService.listMessages(req.params['chatId']!);
      success(res, messages, 'Messages retrieved');
    } catch (err) { next(err); }
  }

  async sendAdminMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const message = await visitorChatService.sendAdminMessage(req.params['chatId']!, req.user.id, req.body.content);
      success(res, message, 'Message sent', 201);
    } catch (err) { next(err); }
  }

  async markSeenByAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chat = await visitorChatService.markSeen(req.params['chatId']!, 'admin');
      success(res, chat, 'Marked as seen');
    } catch (err) { next(err); }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chat = await visitorChatService.updateStatus(req.params['chatId']!, req.body.status);
      success(res, chat, 'Status updated');
    } catch (err) { next(err); }
  }
}
