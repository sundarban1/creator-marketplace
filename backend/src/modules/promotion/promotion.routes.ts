import { Router } from 'express';
import { PromotionController } from './promotion.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createPromotionSchema, updatePromotionSchema } from './promotion.schema';

const router = Router();
const ctrl = new PromotionController();

router.use(authenticate);

// Business-only management.
router.post('/', authorize('BUSINESS'), validate(createPromotionSchema), ctrl.create.bind(ctrl));
router.get('/mine', authorize('BUSINESS'), ctrl.listMine.bind(ctrl));
router.put('/:id', authorize('BUSINESS'), validate(updatePromotionSchema), ctrl.update.bind(ctrl));
router.post('/:id/publish', authorize('BUSINESS'), ctrl.publish.bind(ctrl));
router.post('/:id/pause', authorize('BUSINESS'), ctrl.pause.bind(ctrl));
router.delete('/:id', authorize('BUSINESS'), ctrl.delete.bind(ctrl));

// Shared — creator discovery + either role's detail view (getById varies the
// response shape by ownership, see promotion.service.ts).
router.get('/', ctrl.listDiscoverable.bind(ctrl));
router.get('/:id', ctrl.getById.bind(ctrl));

export default router;
