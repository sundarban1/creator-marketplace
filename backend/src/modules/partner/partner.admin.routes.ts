import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { uploadImage } from '../../middleware/upload';
import { PartnerController } from './partner.controller';
import { createPartnerSchema, updatePartnerSchema, updatePartnerStatusSchema } from './partner.schema';

const router = Router();
const ctrl = new PartnerController();

router.use(authenticate, authorize(Role.ADMIN));

router.get('/',    ctrl.listForAdmin.bind(ctrl));
router.post('/',   validate(createPartnerSchema), ctrl.create.bind(ctrl));
router.post('/logo', uploadImage.single('logo'), ctrl.uploadLogo.bind(ctrl));
router.put('/:id', validate(updatePartnerSchema), ctrl.update.bind(ctrl));
router.patch('/:id/status', validate(updatePartnerStatusSchema), ctrl.updateStatus.bind(ctrl));
router.delete('/:id', ctrl.remove.bind(ctrl));

export default router;
