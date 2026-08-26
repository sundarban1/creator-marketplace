import { Router } from 'express';
import { WalletController } from './wallet.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createWithdrawalSchema } from './wallet.schema';
import payoutMethodRoutes from '../payout-method/payout-method.routes';

const router = Router();
const ctrl = new WalletController();

router.use(authenticate, authorize('CREATOR'));

router.get('/', ctrl.getSummary.bind(ctrl));
router.get('/transactions', ctrl.listTransactions.bind(ctrl));
router.get('/withdrawals', ctrl.listWithdrawals.bind(ctrl));
router.post('/withdrawals', validate(createWithdrawalSchema), ctrl.createWithdrawal.bind(ctrl));
router.use('/payout-methods', payoutMethodRoutes);

export default router;
