import { Router } from 'express';
import { PlatformController } from './platform.controller';

const router = Router();
const ctrl = new PlatformController();

// Public — no auth. Platforms aren't sensitive, and campaign creation / onboarding
// / creator preferences all need to read the active list.
router.get('/', ctrl.listPublic.bind(ctrl));

export default router;
