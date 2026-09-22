import { Router } from 'express';
import { MeetupController } from './meetup.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { registerForMeetupSchema } from './meetup.schema';

const router = Router();
const ctrl = new MeetupController();

router.use(authenticate, authorize('CREATOR'));

router.get('/', ctrl.listVisible.bind(ctrl));
router.get('/my-registrations', ctrl.listMyRegistrations.bind(ctrl));
router.get('/:idOrSlug', ctrl.getById.bind(ctrl));
router.post('/:id/register', validate(registerForMeetupSchema), ctrl.register.bind(ctrl));

export default router;
