import { Router } from 'express';
import { RedemptionController } from './redemption.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { issueRedemptionSchema, enterBillSchema, cancelRedemptionSchema } from './redemption.schema';

const router = Router();
const ctrl = new RedemptionController();

router.use(authenticate);

// Creator — open a QR for a promotion, confirm once the business has entered a bill.
router.post('/', authorize('CREATOR'), validate(issueRedemptionSchema), ctrl.issue.bind(ctrl));
router.post('/:id/confirm', authorize('CREATOR'), ctrl.confirm.bind(ctrl));

// Business — scan a creator's QR (by its opaque token, not the session id) then enter the bill.
router.post('/scan/:token', authorize('BUSINESS'), ctrl.scan.bind(ctrl));
router.post('/:id/bill', authorize('BUSINESS'), validate(enterBillSchema), ctrl.enterBill.bind(ctrl));

// Either party can back out of a live session.
router.post('/:id/cancel', authorize('CREATOR', 'BUSINESS'), validate(cancelRedemptionSchema), ctrl.cancel.bind(ctrl));

export default router;
