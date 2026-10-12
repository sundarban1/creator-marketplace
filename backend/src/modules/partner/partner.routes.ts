import { Router } from 'express';
import { PartnerController } from './partner.controller';

const router = Router();
const ctrl = new PartnerController();

// Public — no auth. Only ACTIVE partners are returned (see repository).
router.get('/', ctrl.listPublic.bind(ctrl));

export default router;
