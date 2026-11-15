import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { reportSubmitLimiter } from '../../middleware/rateLimit';
import { ReportController } from './report.controller';
import { createReportSchema } from './report.schema';

const router = Router();
const ctrl = new ReportController();

// §75 — any authenticated user (provider or business) can file a report.
// Mounted at /api/reports.
router.post('/', authenticate, reportSubmitLimiter, validate(createReportSchema), ctrl.create.bind(ctrl));

export default router;

// Admin review lives at /api/admin/moderation — see modules/moderation.
