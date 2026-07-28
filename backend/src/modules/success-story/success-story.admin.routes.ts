import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { uploadImage } from '../../middleware/upload';
import { SuccessStoryController } from './success-story.controller';
import { createSuccessStorySchema, updateSuccessStorySchema, updateSuccessStoryStatusSchema } from './success-story.schema';

const router = Router();
const ctrl = new SuccessStoryController();

router.use(authenticate, authorize(Role.ADMIN));

router.get('/',    ctrl.listForAdmin.bind(ctrl));
router.post('/',   validate(createSuccessStorySchema), ctrl.create.bind(ctrl));
router.post('/photo', uploadImage.single('photo'), ctrl.uploadPhoto.bind(ctrl));
router.put('/:id', validate(updateSuccessStorySchema), ctrl.update.bind(ctrl));
router.patch('/:id/status', validate(updateSuccessStoryStatusSchema), ctrl.updateStatus.bind(ctrl));
router.delete('/:id', ctrl.remove.bind(ctrl));

export default router;
