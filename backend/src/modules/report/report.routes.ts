import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ReportController } from './report.controller';
import { createReportSchema } from './report.schema';

const router = Router();
const ctrl = new ReportController();

// §75 — any authenticated user (provider or business) can file a report.
// Mounted at /api/reports.
router.post('/', authenticate, validate(createReportSchema), ctrl.create.bind(ctrl));

export default router;

// Admin routes are mounted separately at /api/admin/reports — see
// report.admin.routes.ts — matching the service/service.admin.routes split
// convention already used elsewhere in this codebase.
