import { Request, Response, NextFunction } from 'express';
import { contractService } from './contract.service';
import { success } from '../../utils/response';
import type { PreviewContractInput, UpdateContractTemplateInput } from './contract.schema';

export class ContractController {
  async preview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campaignId, proposedRate, timeline, requirementId } = req.body as PreviewContractInput;
      const draft = await contractService.previewForCampaign(campaignId, req.user!.id, proposedRate, timeline, requirementId);
      success(res, draft, 'Contract preview generated');
    } catch (err) {
      next(err);
    }
  }

  async getByApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const contract = await contractService.getByApplicationId(req.params.applicationId, req.user!.id, req.user!.role);
      success(res, contract, 'Contract retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const url = await contractService.getPdfUrl(req.params.id, req.user!.id, req.user!.role);
      success(res, { pdfUrl: url }, 'Contract PDF ready');
    } catch (err) {
      next(err);
    }
  }

  async getTemplate(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await contractService.getTemplate();
      success(res, template, 'Template retrieved');
    } catch (err) {
      next(err);
    }
  }

  async updateTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await contractService.updateTemplate(req.body as UpdateContractTemplateInput);
      success(res, template, 'Template updated');
    } catch (err) {
      next(err);
    }
  }
}
