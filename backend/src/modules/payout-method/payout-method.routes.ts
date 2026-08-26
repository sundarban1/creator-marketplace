import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { PayoutMethodController } from './payout-method.controller';
import { createPayoutMethodSchema, updatePayoutMethodSchema } from './payout-method.schema';

// Mounted under /api/creator/wallet/payout-methods — the parent wallet router
// already applies `authenticate, authorize('CREATOR')`.
const router = Router();
const ctrl = new PayoutMethodController();

router.get('/',       ctrl.list.bind(ctrl));
router.post('/',       validate(createPayoutMethodSchema), ctrl.create.bind(ctrl));
router.put('/:id',     validate(updatePayoutMethodSchema), ctrl.update.bind(ctrl));
router.delete('/:id',  ctrl.remove.bind(ctrl));

export default router;
