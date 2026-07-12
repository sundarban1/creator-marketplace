import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { PlatformController } from './platform.controller';
import { createPlatformSchema, updatePlatformSchema, updatePlatformStatusSchema } from './platform.schema';

const router = Router();
const ctrl = new PlatformController();

router.use(authenticate, authorize(Role.ADMIN));

router.get('/',    ctrl.listForAdmin.bind(ctrl));
router.post('/',   validate(createPlatformSchema), ctrl.create.bind(ctrl));
router.put('/:id', validate(updatePlatformSchema), ctrl.update.bind(ctrl));
router.patch('/:id/status', validate(updatePlatformStatusSchema), ctrl.updateStatus.bind(ctrl));
router.delete('/:id', ctrl.remove.bind(ctrl));

export default router;
