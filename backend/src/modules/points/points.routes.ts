import { Router } from 'express';
import { PointsController } from './points.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
const ctrl = new PointsController();

router.use(authenticate, authorize('CREATOR'));

router.get('/', ctrl.getBalance.bind(ctrl));
router.get('/history', ctrl.listHistory.bind(ctrl));

export default router;
