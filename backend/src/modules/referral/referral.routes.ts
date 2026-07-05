import { Router } from 'express';
import { ReferralController } from './referral.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { applyReferralCodeSchema } from './referral.schema';

const router = Router();
const ctrl = new ReferralController();

router.use(authenticate, authorize('CREATOR'));

router.get('/', ctrl.getMyReferralOverview.bind(ctrl));
router.post('/apply-code', validate(applyReferralCodeSchema), ctrl.applyReferralCode.bind(ctrl));

export default router;
