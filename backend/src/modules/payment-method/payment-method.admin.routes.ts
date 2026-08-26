import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { uploadImage } from '../../middleware/upload';
import { PaymentMethodController } from './payment-method.controller';
import { createPaymentMethodSchema, updatePaymentMethodSchema, updatePaymentMethodStatusSchema } from './payment-method.schema';

const router = Router();
const ctrl = new PaymentMethodController();

router.use(authenticate, authorize(Role.ADMIN));

router.get('/',    ctrl.listForAdmin.bind(ctrl));
router.post('/',   validate(createPaymentMethodSchema), ctrl.create.bind(ctrl));
router.post('/icon', uploadImage.single('icon'), ctrl.uploadIcon.bind(ctrl));
router.put('/:id', validate(updatePaymentMethodSchema), ctrl.update.bind(ctrl));
router.patch('/:id/status', validate(updatePaymentMethodStatusSchema), ctrl.updateStatus.bind(ctrl));
router.delete('/:id', ctrl.remove.bind(ctrl));

export default router;
