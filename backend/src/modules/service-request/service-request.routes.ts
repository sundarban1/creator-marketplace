import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ServiceRequestController } from './service-request.controller';
import { createServiceRequestSchema, respondServiceRequestSchema } from './service-request.schema';

const router = Router();
const ctrl = new ServiceRequestController();

router.use(authenticate);

// Business — send a request, view requests sent. Mounted at /api/service-requests.
router.post('/', authorize('BUSINESS'), validate(createServiceRequestSchema), ctrl.create.bind(ctrl));
router.get('/sent', authorize('BUSINESS'), ctrl.listSent.bind(ctrl));

// Provider — view requests received, accept/decline.
router.get('/received', authorize('CREATOR'), ctrl.listReceived.bind(ctrl));
router.put('/:id/respond', authorize('CREATOR'), validate(respondServiceRequestSchema), ctrl.respond.bind(ctrl));

export default router;
