import { Router } from 'express';
import { CreditsController } from './credits.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
const ctrl = new CreditsController();

router.use(authenticate, authorize('BUSINESS'));

router.get('/', ctrl.getBalance.bind(ctrl));
router.get('/history', ctrl.listHistory.bind(ctrl));

export default router;
