import { Request, Response, NextFunction } from 'express';
import { CampaignAiService } from './campaign-ai.service';
import { success } from '../../utils/response';
import type { SuggestDescriptionInput } from './campaign-ai.schema';

const campaignAiService = new CampaignAiService();

export class CampaignAiController {
  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { prompt } = req.body as { prompt: string };
      const draft = await campaignAiService.generateDraft(prompt, req.language);
      success(res, draft, 'Campaign draft generated');
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
