import { Request, Response, NextFunction } from 'express';
import { MessagingService } from './messaging.service';
import { success, paginated } from '../../utils/response';

const messagingService = new MessagingService();

export class MessagingController {
  async listConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const conversations = await messagingService.listConversations(
        req.user!.id,
        req.user!.role
      );
      success(res, conversations, 'Conversations retrieved');
    } catch (err) {
      next(err);
    }
  }

  async startConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const conversation = await messagingService.startConversation(
        req.user!.id,
        req.user!.role,
        req.body
      );
      success(res, conversation, 'Conversation started', 201);
    } catch (err) {
      next(err);
    }
  }

  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 30;

      const { messages, total } = await messagingService.getMessages(
        req.params.id,
        req.user!.id,
        req.user!.role,
        page,
        limit
      );
      paginated(res, messages, total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const message = await messagingService.sendMessage(
        req.params.id,
        req.user!.id,
        req.user!.role,
        req.body
      );
      success(res, message, 'Message sent', 201);
    } catch (err) {
      next(err);
    }
  }
}
