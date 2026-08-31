import { Request, Response, NextFunction } from 'express';
import { CampaignStatus, ApplicationStatus, CampaignType } from '@prisma/client';
import { CampaignService } from './campaign.service';
import { analyticsService } from '../analytics/analytics.service';
import { success, paginated } from '../../utils/response';
import { uploadImage as uploadToCloudinary } from '../../utils/cloudinary';
import { AppError } from '../../middleware/error';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { buildEsewaCheckoutHtml, decodeEsewaResponse } from '../../utils/esewa';
import type { SubmitReviewInput, DeliverableVideoSignatureRequestInput, DeliverableVideoCompleteInput, RenameDeliverableVideoInput, AskEventQuestionInput, AnswerEventQuestionInput } from './campaign.schema';

const campaignService = new CampaignService();
const FEATURE_IMAGE_TRANSFORMATION = [{ width: 800, height: 450, crop: 'fill' }];

export class CampaignController {
  async uploadFeatureImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError('No image file provided', 400);
      const imageUrl = await uploadToCloudinary(
        req.file.buffer,
        'campaigns/features',
        `feature_${req.user!.id}_${Date.now()}`,
        FEATURE_IMAGE_TRANSFORMATION,
      );
      success(res, { imageUrl }, 'Image uploaded');
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await campaignService.create(req.user!.id, req.body);
      success(res, campaign, 'Campaign created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await campaignService.getCategories();
      success(res, categories, 'Categories retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  getMasterCategories(req: Request, res: Response, next: NextFunction): void {
    try {
      const categories = campaignService.getMasterCategories();
      success(res, categories, 'Master categories retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getPlatforms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const platforms = await campaignService.getPlatforms();
      success(res, platforms, 'Platforms retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campaigns, total, page, limit } = await campaignService.list(req.query as any, req.language);
      paginated(res, campaigns, total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async nearby(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campaigns, total, page, limit } = await campaignService.nearby(req.query as any, req.language);
      paginated(res, campaigns, total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async getRecommended(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const campaigns = await campaignService.getRecommendedForCreator(req.user!.id, limit, req.language);
      paginated(res, campaigns, campaigns.length, 1, campaigns.length);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await campaignService.getById(req.params.id, req.language);
      success(res, campaign, 'Campaign retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await campaignService.update(req.params.id, req.user!.id, req.body);
      success(res, campaign, 'Campaign updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.delete(req.params.id, req.user!.id);
      success(res, result, 'Campaign deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  async getMyCampaigns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as CampaignStatus | undefined;
      const search = (req.query.search as string)?.trim() || undefined;
      const { campaigns, total } = await campaignService.getMyCampaigns(req.user!.id, page, limit, req.language, status, search);
      paginated(res, campaigns, total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async getFeaturedQuota(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const quota = await campaignService.getFeaturedQuota(req.user!.id);
      success(res, quota);
    } catch (err) {
      next(err);
    }
  }

  async apply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const application = await campaignService.apply(req.params.id, req.user!.id, req.body);
      success(res, application, 'Application submitted successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getCampaignApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const { applications, total } = await campaignService.getCampaignApplications(
        req.params.id,
        req.user!.id,
        page,
        limit
      );
      paginated(res, applications, total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async acceptApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const application = await campaignService.acceptApplication(
        req.params.id,
        req.params.appId,
        req.user!.id
      );
      success(res, application, 'Application accepted');
    } catch (err) {
      next(err);
    }
  }

  async rejectApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const application = await campaignService.rejectApplication(
        req.params.id,
        req.params.appId,
        req.user!.id
      );
      success(res, application, 'Application rejected');
    } catch (err) {
      next(err);
    }
  }

  async shortlistApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const application = await campaignService.shortlistApplication(
        req.params.id,
        req.params.appId,
        req.user!.id
      );
      success(res, application, 'Application shortlist status updated');
    } catch (err) {
      next(err);
    }
  }

  async getBusinessApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as ApplicationStatus | undefined;
      const campaignType = req.query.campaignType as CampaignType | undefined;
      const { applications, total } = await campaignService.getBusinessApplications(
        req.user!.id, page, limit, status, campaignType
      );
      paginated(res, applications, total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async getMyApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as ApplicationStatus | undefined;
      const { applications, total } = await campaignService.getMyApplications(
        req.user!.id,
        page,
        limit,
        status,
      );
      paginated(res, applications, total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async payForCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { method } = req.body as { method?: string };
      const result = await campaignService.payForCampaign(
        req.params.id,
        req.user!.id,
        method ?? 'ESEWA'
      );
      success(res, result, 'Payment successful');
    } catch (err) {
      next(err);
    }
  }

  async submitWork(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.submitWork(
        req.params.appId,
        req.user!.id,
        req.body as { note?: string; urls?: string }
      );
      success(res, result, 'Work submitted successfully');
    } catch (err) {
      next(err);
    }
  }

  async approveWork(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.approveWork(req.params.appId, req.user!.id);
      success(res, result, 'Work approved');
    } catch (err) {
      next(err);
    }
  }

  async reportIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason } = req.body as { reason?: string };
      const result = await campaignService.reportIssue(req.params.appId, req.user!.id, reason ?? '');
      success(res, result, 'Issue reported');
    } catch (err) {
      next(err);
    }
  }

  async requestRevision(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { note } = req.body as { note?: string };
      const result = await campaignService.requestRevision(
        req.params.appId,
        req.user!.id,
        note ?? ''
      );
      success(res, result, 'Feedback sent');
    } catch (err) {
      next(err);
    }
  }

  async getDeliverableVideoSignature(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sizeBytes, mimeType } = req.body as DeliverableVideoSignatureRequestInput;
      const result = await campaignService.requestDeliverableVideoSignature(req.params.appId, req.user!.id, sizeBytes, mimeType);
      success(res, result, 'Upload signature issued');
    } catch (err) {
      next(err);
    }
  }

  async completeDeliverableVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { publicId, key, uploadId, thumbnailKey, clientDurationSec } = req.body as DeliverableVideoCompleteInput;
      const result = await campaignService.completeDeliverableVideo(req.params.appId, req.user!.id, { publicId, key, uploadId, thumbnailKey }, clientDurationSec);
      success(res, result, 'Video attached', 201);
    } catch (err) {
      next(err);
    }
  }

  // publicId is folder-qualified (e.g. "campaigns/deliverables/deliverable_xxx")
  // — it contains a literal "/", so it travels as a query param rather than a
  // path segment (an Express path param would only capture up to the first "/").
  async removeDeliverableVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const publicId = req.query.publicId as string;
      if (!publicId) throw new AppError('publicId is required', 400);
      const result = await campaignService.removeDeliverableVideo(req.params.appId, req.user!.id, publicId);
      success(res, result, 'Video removed');
    } catch (err) {
      next(err);
    }
  }

  async renameDeliverableVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { publicId, label } = req.body as RenameDeliverableVideoInput;
      const result = await campaignService.renameDeliverableVideo(req.params.appId, req.user!.id, publicId, label);
      success(res, result, 'Video renamed');
    } catch (err) {
      next(err);
    }
  }

  async uploadDeliverableFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError('No file provided', 400);
      // Must listen on res (not req) for 'close': by this point multer has
      // already fully consumed the request body, so req's readable stream
      // closes on its own almost immediately regardless of the socket —
      // listening there fires a false positive on every single upload. res
      // stays tied to the actual outgoing connection, so its 'close' only
      // fires early (before writableEnded) on a genuine client disconnect.
      let clientDisconnected = false;
      res.on('close', () => { if (!res.writableEnded) clientDisconnected = true; });
      const result = await campaignService.uploadDeliverableFile(
        req.params.appId, req.user!.id, req.file, () => clientDisconnected,
      );
      success(res, result, 'File uploaded', 201);
    } catch (err) {
      next(err);
    }
  }

  // fileId is our own generated id (not a Cloudinary publicId), but travels as
  // a query param for the same reason removeDeliverableVideo's publicId does —
  // consistency with that endpoint's shape rather than a technical necessity here.
  async removeDeliverableFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const fileId = req.query.fileId as string;
      if (!fileId) throw new AppError('fileId is required', 400);
      const result = await campaignService.removeDeliverableFile(req.params.appId, req.user!.id, fileId);
      success(res, result, 'File removed');
    } catch (err) {
      next(err);
    }
  }

  async payForApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { method } = req.body as { method?: string };
      const result = await campaignService.payForApplication(req.params.appId, req.user!.id, method);
      res.json({ success: true, data: result });
    } catch (e) { next(e); }
  }

  async initiateKhaltiPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.initiateKhaltiPayment(req.params.appId, req.user!.id);
      success(res, result, 'Khalti payment initiated');
    } catch (err) {
      next(err);
    }
  }

  // Public — Khalti redirects the user's browser here directly after payment,
  // with no Authorization header (same pattern as CreatorController.tiktokCallback).
  // Identity is carried via `purchase_order_id`, which is the application id we
  // passed at initiate time; the pidx query param is then verified against
  // Application.khaltiPidx and re-checked with Khalti's own lookup API before
  // anything is marked paid — see CampaignService.confirmKhaltiPayment.
  async khaltiCallback(req: Request, res: Response): Promise<void> {
    const { pidx, purchase_order_id: appId } = req.query as { pidx?: string; purchase_order_id?: string };
    const redirectBase = `${env.APP_SCHEME}://khalti-callback`;

    if (!pidx || !appId) {
      res.redirect(`${redirectBase}?success=false&error=${encodeURIComponent('missing_payment_reference')}`);
      return;
    }
    try {
      await campaignService.confirmKhaltiPayment(appId, pidx);
      res.redirect(`${redirectBase}?success=true`);
    } catch (err) {
      const message = err instanceof AppError ? err.message : 'Could not confirm the Khalti payment';
      res.redirect(`${redirectBase}?success=false&error=${encodeURIComponent(message)}`);
    }
  }

  async initiateEsewaPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.initiateEsewaPayment(req.params.appId, req.user!.id);
      success(res, result, 'eSewa payment initiated');
    } catch (err) {
      next(err);
    }
  }

  // Public — this is the page the mobile WebBrowser session actually opens: an
  // auto-submitting HTML form that POSTs straight to eSewa's hosted checkout
  // (eSewa's ePay v2 flow has no "give me a hosted URL" API the way Khalti does).
  // Errors here render as a plain HTML message rather than going through the
  // JSON error handler — the user is looking at a browser tab, not an API call.
  async esewaCheckoutPage(req: Request, res: Response): Promise<void> {
    try {
      const fields = await campaignService.getEsewaCheckoutForm(req.params.appId);
      logger.info(
        {
          appId:            req.params.appId,
          esewaFormAction:  env.ESEWA_BASE_URL,
          total_amount:     fields.total_amount,
          transaction_uuid: fields.transaction_uuid,
          product_code:     fields.product_code,
          success_url:      fields.success_url,
          failure_url:      fields.failure_url,
        },
        'eSewa checkout page rendered — auto-submitting form to eSewa',
      );
      res.type('html').send(buildEsewaCheckoutHtml(fields));
    } catch (err) {
      logger.warn({ appId: req.params.appId, err }, 'eSewa checkout page could not render');
      const message = err instanceof AppError ? err.message : 'Could not start the eSewa payment. Please try again.';
      res.status(err instanceof AppError ? err.statusCode : 500).type('html').send(
        `<!doctype html><html><head><meta charset="utf-8" /><title>Payment error</title></head><body style="font-family:sans-serif;text-align:center;padding:48px 24px;color:#374151;"><p>${message}</p></body></html>`
      );
    }
  }

  // Public — eSewa redirects the user's browser here directly after payment,
  // with no Authorization header (same pattern as khaltiCallback above). The
  // appId travels in the URL path (not the query string) since eSewa appends
  // its own `data` query param to whatever success_url we gave it.
  async esewaSuccessCallback(req: Request, res: Response): Promise<void> {
    const { appId } = req.params;
    const { data } = req.query as { data?: string };
    const redirectBase = `${env.APP_SCHEME}://esewa-callback`;

    logger.info({ appId, hasData: !!data }, 'eSewa success callback hit');

    if (!data) {
      res.redirect(`${redirectBase}?success=false&error=${encodeURIComponent('missing_payment_reference')}`);
      return;
    }
    try {
      await campaignService.confirmEsewaPayment(appId, data);
      res.redirect(`${redirectBase}?success=true`);
    } catch (err) {
      const message = err instanceof AppError ? err.message : 'Could not confirm the eSewa payment';
      logger.warn({ appId, err }, 'eSewa success callback: confirmation failed');
      res.redirect(`${redirectBase}?success=false&error=${encodeURIComponent(message)}`);
    }
  }

  // Public — eSewa's failure redirect. The payment didn't complete, so there's
  // nothing to finalize — decode eSewa's `data` payload (when present) into the
  // logs for diagnosis, then bounce straight back into the app, which shows a
  // generic "eSewa is having issues" toast (the raw reason isn't user-facing).
  async esewaFailureCallback(req: Request, res: Response): Promise<void> {
    const { appId } = req.params;
    const { data } = req.query as { data?: string };

    if (data) {
      try {
        const decoded = decodeEsewaResponse(data);
        logger.warn({ appId, esewa: decoded }, 'eSewa payment failed / not completed');
      } catch (err) {
        logger.warn({ appId, err, rawData: data }, 'eSewa failure callback: could not decode data payload');
      }
    } else {
      logger.warn({ appId, query: req.query }, 'eSewa failure callback with no data payload');
    }

    res.redirect(`${env.APP_SCHEME}://esewa-callback?success=false&error=${encodeURIComponent('payment_failed')}`);
  }

  async getApplicationActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.getApplicationActivity(req.params.appId, req.user!.id);
      success(res, result);
    } catch (err) {
      next(err);
    }
  }

  async startWork(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.startWork(req.params.appId, req.user!.id);
      success(res, result, 'Work started');
    } catch (err) {
      next(err);
    }
  }

  async cancelCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.cancelCampaign(req.params.id, req.user!.id);
      success(res, result, 'Campaign cancelled');
    } catch (err) {
      next(err);
    }
  }

  async submitReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { rating, comment } = req.body as SubmitReviewInput;
      const result = await analyticsService.submitReview(req.params.appId, req.user!.id, rating, comment);
      success(res, result, 'Review submitted', 201);
    } catch (err) {
      next(err);
    }
  }

  // Lets the client show "Leave a review" vs. the already-submitted review
  // without a blind POST-then-409 — returns null rather than 404 when the
  // caller hasn't reviewed yet, since "not reviewed" is a normal state here.
  async getMyReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const review = await analyticsService.getMyReview(req.params.appId, req.user!.id);
      success(res, review, 'Review fetched');
    } catch (err) {
      next(err);
    }
  }

  // The review the other party left for the caller on this application — null
  // when they haven't rated yet. Feeds the "review received" card on the
  // activity timeline (and the review_received bell notification lands here).
  async getReviewReceived(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const review = await analyticsService.getReviewReceivedForApp(req.params.appId, req.user!.id);
      success(res, review, 'Review fetched');
    } catch (err) {
      next(err);
    }
  }

  async listEventQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const questions = await campaignService.listEventQuestions(req.params.id, req.user!.id);
      success(res, questions, 'Questions fetched');
    } catch (err) {
      next(err);
    }
  }

  async getInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invitation = await campaignService.getInvitation(req.params.id, req.user!.id);
      success(res, { invitation }, 'Invitation ready');
    } catch (err) {
      next(err);
    }
  }

  async askEventQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { question } = req.body as AskEventQuestionInput;
      const created = await campaignService.askEventQuestion(req.params.id, req.user!.id, question);
      success(res, created, 'Question posted', 201);
    } catch (err) {
      next(err);
    }
  }

  async answerEventQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { answer } = req.body as AnswerEventQuestionInput;
      const updated = await campaignService.answerEventQuestion(
        req.params.id,
        req.params.questionId,
        req.user!.id,
        answer,
      );
      success(res, updated, 'Answer saved');
    } catch (err) {
      next(err);
    }
  }
}
