import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { uploadImage } from '../../middleware/upload';
import { WithdrawalAdminController } from './withdrawal.admin.controller';
import { markWithdrawalPaidSchema, rejectWithdrawalSchema } from './withdrawal.admin.schema';

const router = Router();
const ctrl = new WithdrawalAdminController();

router.use(authenticate, authorize(Role.ADMIN));

router.get('/',        ctrl.list.bind(ctrl));
router.get('/:id',     ctrl.detail.bind(ctrl));
router.post('/:id/process', ctrl.process.bind(ctrl));
router.post('/:id/reject',  validate(rejectWithdrawalSchema), ctrl.reject.bind(ctrl));
// multer parses the multipart body first so the text fields land in req.body
// for the validator; the 5 MB / jpg-png-webp limits are enforced by uploadImage.
router.post('/:id/mark-paid',
  uploadImage.single('screenshot'),
  validate(markWithdrawalPaidSchema),
  ctrl.markPaid.bind(ctrl),
);

export default router;
