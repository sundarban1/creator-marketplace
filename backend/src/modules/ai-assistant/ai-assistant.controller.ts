import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/error';
import { AiAssistantService } from './ai-assistant.service';
import { success } from '../../utils/response';
import { getDict } from '../../i18n';

import { HttpStatus } from '../../constants/httpStatus';

const aiAssistantService = new AiAssistantService();

export class AiAssistantController {
  async transcribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError(getDict().aiAssistant.noAudioFileProvided, HttpStatus.BAD_REQUEST);
      const text = await aiAssistantService.transcribeAudio(req.file.buffer, req.file.mimetype);
      success(res, { text }, getDict().aiAssistant.transcribed);
    } catch (err) {
      next(err);
    }
  }
}
