import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { AppError } from '../../middleware/error';
import { WithdrawalAdminService } from './withdrawal.admin.service';

const service = new WithdrawalAdminService();

function parsePagination(req: Request) {
  const page  = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(100, parseInt(req.query['limit'] as string) || 20);
  return { page, limit };
}

export class WithdrawalAdminController {
  // Returns { withdrawals, total, counts } — the per-status counts drive the
  // admin dashboard tab badges, so the list can't use the bare paginated().
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = parsePagination(req);
      const status = req.query['status'] as string | undefined;
      const search = req.query['search'] as string | undefined;
      const result = await service.list(page, limit, status, search);
      success(res, { ...result, page, limit }, 'Withdrawals retrieved');
    } catch (err) {
      next(err);
    }
  }

  async detail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await service.detail(req.params.id), 'Withdrawal retrieved');
    } catch (err) {
      next(err);
    }
  }

  async process(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await service.startProcessing(req.params.id, req.user!.id), 'Withdrawal moved to processing');
    } catch (err) {
      next(err);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await service.reject(req.params.id, req.user!.id, req.body), 'Withdrawal rejected');
    } catch (err) {
      next(err);
    }
  }

  async markPaid(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError('A transaction screenshot is required', 400);
      success(res, await service.markPaid(req.params.id, req.user!.id, req.body, req.file.buffer), 'Withdrawal marked as paid');
    } catch (err) {
      next(err);
    }
  }
}
