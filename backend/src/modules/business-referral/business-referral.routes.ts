import { Router } from 'express';
import { BusinessReferralController } from './business-referral.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { applyBusinessReferralCodeSchema } from './business-referral.schema';

const router = Router();
const ctrl = new BusinessReferralController();

router.use(authenticate, authorize('BUSINESS'));

router.get('/', ctrl.getMyReferralOverview.bind(ctrl));
router.post('/apply-code', validate(applyBusinessReferralCodeSchema), ctrl.applyReferralCode.bind(ctrl));
router.post('/:id/resend', ctrl.resendReferral.bind(ctrl));

export default router;
