import { Request, Response, NextFunction } from 'express';
import { ConversationStatus } from '@prisma/client';
import { MessagingService } from './messaging.service';
import { success, paginated } from '../../utils/response';
import { AppError } from '../../middleware/error';

const messagingService = new MessagingService();

export class MessagingController {
  async listConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as ConversationStatus | undefined;
      const conversations = await messagingService.listConversations(req.user!.id, req.user!.role, status);
      success(res, conversations);
    } catch (err) { next(err); }
  }

  async startConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const conversation = await messagingService.startConversation(req.user!.id, req.user!.role, req.body);
      success(res, conversation, 'Message request sent', 201);
    } catch (err) { next(err); }
  }

  async checkConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await messagingService.checkConversation(req.user!.id, req.user!.role, req.params.creatorProfileId);
      success(res, result ?? null);
    } catch (err) { next(err); }
  }

  async respondToRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = req.params.action as 'accept' | 'decline';
      if (action !== 'accept' && action !== 'decline') {
        res.status(400).json({ success: false, message: 'Invalid action' });
        return;
      }
      const result = await messagingService.respondToRequest(req.params.id, req.user!.id, req.user!.role, action);
      success(res, result, `Request ${action}ed`);
    } catch (err) { next(err); }
  }

  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
      const limit = Math.min(200, parseInt(req.query.limit as string) || 50);
      const { messages, total } = await messagingService.getMessages(
        req.params.id, req.user!.id, req.user!.role, page, limit,
      );
      paginated(res, messages, total, page, limit);
    } catch (err) { next(err); }
  }

  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const message = await messagingService.sendMessage(
        req.params.id, req.user!.id, req.user!.role, req.body,
      );
      success(res, message, 'Message sent', 201);
    } catch (err) { next(err); }
  }

  async sendAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError('No file provided', 400);
      const message = await messagingService.sendAttachment(
        req.params.id, req.user!.id, req.user!.role, req.file, req.body?.caption,
      );
      success(res, message, 'Attachment sent', 201);
    } catch (err) { next(err); }
  }

  async markSeen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await messagingService.markSeen(req.params.id, req.user!.id, req.user!.role);
      success(res, null, 'Marked as seen');
    } catch (err) { next(err); }
  }

  async getBadgeCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await messagingService.getBadgeCount(req.user!.id, req.user!.role);
      success(res, result);
    } catch (err) { next(err); }
  }

  async deleteMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const forEveryone = req.body?.forEveryone === true;
      if (forEveryone) {
        await messagingService.deleteMessageForEveryone(req.params.id, req.params.messageId, req.user!.id, req.user!.role);
      } else {
        await messagingService.deleteMessageForMe(req.params.id, req.params.messageId, req.user!.id, req.user!.role);
      }
      success(res, null, 'Message deleted');
    } catch (err) { next(err); }
  }

  async deleteConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await messagingService.deleteConversationForMe(req.params.id, req.user!.id, req.user!.role);
      success(res, null, 'Conversation deleted');
    } catch (err) { next(err); }
  }
}
