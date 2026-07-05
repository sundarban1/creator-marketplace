import { Router } from 'express';
import { WalletController } from './wallet.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { withdrawSchema } from './wallet.schema';

const router = Router();
const ctrl = new WalletController();

router.use(authenticate, authorize('CREATOR'));

router.get('/', ctrl.getSummary.bind(ctrl));
router.post('/withdraw', validate(withdrawSchema), ctrl.withdraw.bind(ctrl));
router.get('/transactions', ctrl.listTransactions.bind(ctrl));

export default router;
