import { Router } from 'express';
import { CommunityEventController } from './community-event.controller';

const router = Router();
const ctrl = new CommunityEventController();

// Public — no auth. Only published events are ever returned (see service).
router.get('/', ctrl.listPublic.bind(ctrl));
router.get('/:slug', ctrl.getPublic.bind(ctrl));

export default router;
