import { Request, Response, NextFunction } from 'express';
import { ConversationStatus } from '@prisma/client';
import { MessagingService } from './messaging.service';
import { success, paginated } from '../../utils/response';
import { AppError } from '../../middleware/error';
import { getDict } from '../../i18n';

import { HttpStatus } from '../../constants/httpStatus';

const messagingService = new MessagingService();

export class MessagingController {
  async listConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as ConversationStatus | undefined;
      const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
      const { conversations, total } = await messagingService.listConversations(
        req.user!.id, req.user!.role, status, page, limit,
      );
      paginated(res, conversations, total, page, limit);
    } catch (err) { next(err); }
  }

  async startConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const conversation = await messagingService.startConversation(req.user!.id, req.user!.role, req.body);
      success(res, conversation, getDict().messaging.messageRequestSent, 201);
    } catch (err) { next(err); }
  }

  async checkConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await messagingService.checkConversation(req.user!.id, req.user!.role, req.params.creatorProfileId);
      success(res, result ?? null);
    } catch (err) { next(err); }
  }

  async startCreatorConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const conversation = await messagingService.startCreatorConversation(
        req.user!.id, req.body.otherUserId, req.body.requestMessage,
      );
      success(res, conversation, getDict().messaging.messageRequestSent, 201);
    } catch (err) { next(err); }
  }

  async checkCreatorConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await messagingService.checkCreatorConversation(req.user!.id, req.params.creatorProfileId);
      success(res, result ?? null);
    } catch (err) { next(err); }
  }

  async blockConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await messagingService.blockInConversation(req.params.id, req.user!.id, req.user!.role);
      success(res, result, getDict().messaging.blocked);
    } catch (err) { next(err); }
  }

  async unblockConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await messagingService.unblockInConversation(req.params.id, req.user!.id, req.user!.role);
      success(res, result, getDict().messaging.unblocked);
    } catch (err) { next(err); }
  }

  async getBlockStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await messagingService.getBlockStatus(req.params.id, req.user!.id, req.user!.role);
      success(res, result);
    } catch (err) { next(err); }
  }

  async respondToRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = req.params.action as 'accept' | 'decline';
      if (action !== 'accept' && action !== 'decline') {
        res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: getDict().messaging.invalidAction });
        return;
      }
      const result = await messagingService.respondToRequest(req.params.id, req.user!.id, req.user!.role, action);
      success(res, result, getDict().messaging.requestResponded(action));
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
      success(res, message, getDict().messaging.messageSent, 201);
    } catch (err) { next(err); }
  }

  async sendAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError(getDict().messaging.noFileProvided, HttpStatus.BAD_REQUEST);
      const message = await messagingService.sendAttachment(
        req.params.id, req.user!.id, req.user!.role, req.file, req.body?.caption,
      );
      success(res, message, getDict().messaging.attachmentSent, 201);
    } catch (err) { next(err); }
  }

  async getVoiceUploadSignature(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = await messagingService.requestVoiceUploadSignature(req.params.id, req.user!.id, req.user!.role);
      success(res, signature, getDict().messaging.signatureGenerated);
    } catch (err) { next(err); }
  }

  async completeVoiceAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const message = await messagingService.completeVoiceAttachment(
        req.params.id, req.user!.id, req.user!.role,
        { publicId: req.body.publicId, key: req.body.key },
        req.body.clientDurationSec, req.body.waveform,
      );
      success(res, message, getDict().messaging.voiceMessageSent, 201);
    } catch (err) { next(err); }
  }

  async getVideoUploadSignature(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = await messagingService.requestVideoUploadSignature(
        req.params.id, req.user!.id, req.user!.role, req.body.sizeBytes, req.body.mimeType,
      );
      success(res, signature, getDict().messaging.signatureGenerated);
    } catch (err) { next(err); }
  }

  async completeVideoAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const message = await messagingService.completeVideoAttachment(
        req.params.id, req.user!.id, req.user!.role,
        { publicId: req.body.publicId, key: req.body.key, uploadId: req.body.uploadId, thumbnailKey: req.body.thumbnailKey },
        req.body.caption, req.body.clientDurationSec,
      );
      success(res, message, getDict().messaging.videoSent, 201);
    } catch (err) { next(err); }
  }

  async markSeen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await messagingService.markSeen(req.params.id, req.user!.id, req.user!.role);
      success(res, null, getDict().messaging.markedAsSeen);
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
      success(res, null, getDict().messaging.messageDeleted);
    } catch (err) { next(err); }
  }

  async editMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const message = await messagingService.editMessage(req.params.id, req.params.messageId, req.user!.id, req.user!.role, req.body.content);
      success(res, message, getDict().messaging.messageUpdated);
    } catch (err) { next(err); }
  }

  async deleteConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await messagingService.deleteConversationForMe(req.params.id, req.user!.id, req.user!.role);
      success(res, null, getDict().messaging.conversationDeleted);
    } catch (err) { next(err); }
  }
}
