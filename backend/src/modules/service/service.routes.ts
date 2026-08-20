import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ServiceController } from './service.controller';
import { createServiceSchema, updateServiceSchema } from './service.schema';

const router = Router();
const ctrl = new ServiceController();

// Provider self-service — listing/managing the Services they sell (§14 of the
// provider-marketplace spec). Mounted at /api/creator/services.
router.use(authenticate, authorize('CREATOR'));

router.get('/', ctrl.listMine.bind(ctrl));
router.post('/', validate(createServiceSchema), ctrl.create.bind(ctrl));
router.put('/:id', validate(updateServiceSchema), ctrl.update.bind(ctrl));
router.delete('/:id', ctrl.remove.bind(ctrl));

export default router;
