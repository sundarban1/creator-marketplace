import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { PayoutMethodService } from './payout-method.service';
import { toPayoutMethodDto } from './payout-method.dto';

const service = new PayoutMethodService();

export class PayoutMethodController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const methods = await service.list(req.user!.id);
      success(res, methods.map(toPayoutMethodDto), 'Payout methods retrieved');
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const method = await service.create(req.user!.id, req.body);
      success(res, toPayoutMethodDto(method), 'Payout method added', 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const method = await service.update(req.user!.id, req.params.id, req.body);
      success(res, toPayoutMethodDto(method), 'Payout method updated');
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await service.remove(req.user!.id, req.params.id);
      success(res, null, 'Payout method removed');
    } catch (err) {
      next(err);
    }
  }
}
