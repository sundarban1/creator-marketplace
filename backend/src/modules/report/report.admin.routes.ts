import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ReportController } from './report.controller';
import { updateReportStatusSchema } from './report.schema';

const router = Router();
const ctrl = new ReportController();

router.use(authenticate, authorize('ADMIN'));

router.get('/', ctrl.listForAdmin.bind(ctrl));
router.put('/:id/status', validate(updateReportStatusSchema), ctrl.updateStatus.bind(ctrl));

export default router;
