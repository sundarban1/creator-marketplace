import { Request, Response, NextFunction } from 'express';
import { CampaignAiService } from './campaign-ai.service';
import { success } from '../../utils/response';

const campaignAiService = new CampaignAiService();

export class CampaignAiController {
  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { prompt } = req.body as { prompt: string };
      const draft = await campaignAiService.generateDraft(prompt);
      success(res, draft, 'Campaign draft generated');
    } catch (err) {
      next(err);
    }
  }
}
