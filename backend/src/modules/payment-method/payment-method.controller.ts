import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { AppError } from '../../middleware/error';
import { uploadImage as uploadToCloudinary } from '../../utils/cloudinary';
import { PaymentMethodService } from './payment-method.service';
import { getDict } from '../../i18n';

import { HttpStatus } from '../../constants/httpStatus';

const paymentMethodService = new PaymentMethodService();
const ICON_TRANSFORMATION = [{ width: 200, height: 200, crop: 'fit' }];

export class PaymentMethodController {
  async listPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const methods = await paymentMethodService.listPublic();
      success(res, methods, getDict().paymentMethod.paymentMethodsRetrieved);
    } catch (err) {
      next(err);
    }
  }

  async listForAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const methods = await paymentMethodService.listForAdmin();
      success(res, methods, 'Payment methods retrieved');
    } catch (err) {
      next(err);
    }
  }

  async uploadIcon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError('No image file provided', HttpStatus.BAD_REQUEST);
      const iconUrl = await uploadToCloudinary(
        req.file.buffer,
        'payment-methods/icons',
        `method_${Date.now()}`,
        ICON_TRANSFORMATION,
      );
      success(res, { iconUrl }, 'Icon uploaded');
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const method = await paymentMethodService.create(req.body);
      success(res, method, 'Payment method created', 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const method = await paymentMethodService.update(req.params.id, req.body);
      success(res, method, 'Payment method updated');
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const method = await paymentMethodService.updateStatus(req.params.id, req.body.status);
      success(res, method, 'Payment method status updated');
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await paymentMethodService.remove(req.params.id);
      success(res, null, 'Payment method deleted');
    } catch (err) {
      next(err);
    }
  }
}
