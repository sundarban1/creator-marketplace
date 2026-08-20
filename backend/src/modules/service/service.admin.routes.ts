import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ServiceController } from './service.controller';
import { updateServiceStatusSchema } from './service.schema';

const router = Router();
const ctrl = new ServiceController();

// Moderation (§69) — admin can hide/remove a service but not edit its content.
router.use(authenticate, authorize(Role.ADMIN));

router.get('/', ctrl.listForAdmin.bind(ctrl));
router.patch('/:id/status', validate(updateServiceStatusSchema), ctrl.updateStatusAsAdmin.bind(ctrl));

export default router;
