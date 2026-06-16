import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { NotificationController } from './notification.controller';

const router = Router();
const ctrl   = new NotificationController();

router.use(authenticate);

router.get('/',              ctrl.list.bind(ctrl));
router.get('/badge',         ctrl.badge.bind(ctrl));
router.patch('/read-all',    ctrl.markAllRead.bind(ctrl));
router.patch('/:id/read',    ctrl.markRead.bind(ctrl));

export default router;
