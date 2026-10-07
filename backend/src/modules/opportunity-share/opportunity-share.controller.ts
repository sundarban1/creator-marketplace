import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { opportunityShareService } from './opportunity-share.service';

export class OpportunityShareController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // The sharer is always the signed-in creator — never taken from the body.
      const share = await opportunityShareService.createShare(req.user!.id, req.body);
      success(res, share, 'Share link ready', 201);
    } catch (err) {
      next(err);
    }
  }

  async visit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await opportunityShareService.recordVisit(req.params.token, {
        userId: req.user?.id,
        // De-dup key only (hashed, Redis, 30 min) — never persisted.
        viewerKey: `${req.ip ?? ''}|${req.get('user-agent') ?? ''}`,
      });
      success(res, result);
    } catch (err) {
      next(err);
    }
  }

  async claimSignup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await opportunityShareService.claimSignup(req.user!.id, req.body.receipt);
      success(res, result);
    } catch (err) {
      next(err);
    }
  }

  async summary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await opportunityShareService.summary(Number(req.query.limit ?? 50));
      success(res, result);
    } catch (err) {
      next(err);
    }
  }
}
