import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { uploadEventImages } from '../../middleware/upload';
import { CommunityEventController } from './community-event.controller';
import { communityEventInputSchema, publishSchema, uploadKindSchema } from './community-event.schema';

const router = Router();
const ctrl = new CommunityEventController();

router.use(authenticate, authorize(Role.ADMIN));

router.get('/', ctrl.listForAdmin.bind(ctrl));
router.post('/', validate(communityEventInputSchema), ctrl.create.bind(ctrl));
router.post('/images', validate(uploadKindSchema, 'query'), uploadEventImages.array('images', 20), ctrl.uploadImages.bind(ctrl));
router.get('/:id', ctrl.getForAdmin.bind(ctrl));
router.put('/:id', validate(communityEventInputSchema), ctrl.update.bind(ctrl));
router.patch('/:id/publish', validate(publishSchema), ctrl.setPublished.bind(ctrl));
router.delete('/:id', ctrl.remove.bind(ctrl));

export default router;
