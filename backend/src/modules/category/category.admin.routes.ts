import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { CategoryController } from './category.controller';
import { createCategorySchema, updateCategorySchema, updateCategoryStatusSchema } from './category.schema';

const router = Router();
const ctrl = new CategoryController();

router.use(authenticate, authorize(Role.ADMIN));

router.get('/',    ctrl.listForAdmin.bind(ctrl));
router.post('/',   validate(createCategorySchema), ctrl.create.bind(ctrl));
router.put('/:id', validate(updateCategorySchema), ctrl.update.bind(ctrl));
router.patch('/:id/status', validate(updateCategoryStatusSchema), ctrl.updateStatus.bind(ctrl));
router.delete('/:id', ctrl.remove.bind(ctrl));

export default router;
