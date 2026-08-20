import { Router } from 'express';
import { ServiceController } from './service.controller';

const router = Router();
const ctrl = new ServiceController();

// Public discovery — businesses browsing provider services (§33/34). No auth,
// same convention as category.routes.ts's public listing.
router.get('/', ctrl.listPublic.bind(ctrl));
router.get('/:id', ctrl.getPublicDetail.bind(ctrl));

export default router;
