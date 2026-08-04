import { Request, Response, NextFunction } from 'express';
import { CampaignAiService } from './campaign-ai.service';
import { success } from '../../utils/response';
import type { SuggestDescriptionInput, GenerateCampaignInput } from './campaign-ai.schema';

const campaignAiService = new CampaignAiService();

export class CampaignAiController {
  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { prompt, inputSource } = req.body as GenerateCampaignInput;
      const draft = await campaignAiService.generateDraft(prompt, req.language, req.user!.id, inputSource);
      success(res, draft, 'Campaign draft generated');
    } catch (err) {
      next(err);
    }
  }

  async generateEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { prompt, inputSource } = req.body as GenerateCampaignInput;
      const draft = await campaignAiService.generateEventDraft(prompt, req.language, req.user!.id, inputSource);
      success(res, draft, 'Event draft generated');
    } catch (err) {
      next(err);
    }
  }

  async suggestDescription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const description = await campaignAiService.suggestDescription(req.body as SuggestDescriptionInput, req.language);
      success(res, { description }, 'Description suggested');
    } catch (err) {
      next(err);
    }
  }
}
