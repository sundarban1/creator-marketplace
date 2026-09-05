import { Request, Response, NextFunction } from 'express';
import { contractService } from './contract.service';
import { success } from '../../utils/response';
import type { PreviewContractInput, UpdateContractTemplateInput } from './contract.schema';
import { getDict } from '../../i18n';

export class ContractController {
  async preview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campaignId, proposedRate, timeline, requirementId } = req.body as PreviewContractInput;
      const draft = await contractService.previewForCampaign(campaignId, req.user!.id, proposedRate, timeline, requirementId);
      success(res, draft, getDict().contract.contractPreviewGenerated);
    } catch (err) {
      next(err);
    }
  }

  async getByApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const contract = await contractService.getByApplicationId(req.params.applicationId, req.user!.id, req.user!.role);
      success(res, contract, getDict().contract.contractRetrieved);
    } catch (err) {
      next(err);
    }
  }

  async getPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const url = await contractService.getPdfUrl(req.params.id, req.user!.id, req.user!.role);
      success(res, { pdfUrl: url }, getDict().contract.contractPdfReady);
    } catch (err) {
      next(err);
    }
  }

  async getTemplate(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await contractService.getTemplate();
      success(res, template, getDict().contract.templateRetrieved);
    } catch (err) {
      next(err);
    }
  }

  async updateTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await contractService.updateTemplate(req.body as UpdateContractTemplateInput);
      success(res, template, getDict().contract.templateUpdated);
    } catch (err) {
      next(err);
    }
  }
}
