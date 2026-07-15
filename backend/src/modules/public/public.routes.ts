import { Router } from 'express';
import { PublicController } from './public.controller';

const router = Router();
const ctrl = new PublicController();

// Public — no auth. Aggregate counts for the marketing landing page.
router.get('/landing-stats', ctrl.landingStats.bind(ctrl));

export default router;
