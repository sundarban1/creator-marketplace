import { Router } from 'express';
import { MeetupController } from './meetup.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createMeetupSchema, updateMeetupSchema, listRegistrationsQuerySchema } from './meetup.schema';

const router = Router();
const ctrl = new MeetupController();

router.use(authenticate, authorize('ADMIN'));

router.get('/', ctrl.listForAdmin.bind(ctrl));
router.post('/', validate(createMeetupSchema), ctrl.create.bind(ctrl));
router.get('/:id', ctrl.getForAdmin.bind(ctrl));
router.patch('/:id', validate(updateMeetupSchema), ctrl.update.bind(ctrl));
router.get('/:id/registrations', validate(listRegistrationsQuerySchema, 'query'), ctrl.listRegistrations.bind(ctrl));
router.patch('/:id/registrations/:registrationId/accept', ctrl.acceptRegistration.bind(ctrl));
router.patch('/:id/registrations/:registrationId/reject', ctrl.rejectRegistration.bind(ctrl));
router.patch('/:id/registrations/:registrationId/check-in', ctrl.checkInRegistration.bind(ctrl));
router.patch('/:id/registrations/:registrationId/undo-check-in', ctrl.undoCheckInRegistration.bind(ctrl));

export default router;
