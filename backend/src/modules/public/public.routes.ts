import { Router } from 'express';
import { PublicController } from './public.controller';

const router = Router();
const ctrl = new PublicController();

// Public — no auth. Aggregate counts for the marketing landing page.
router.get('/landing-stats', ctrl.landingStats.bind(ctrl));
// Public — no auth. Whether the landing page should show "Coming Soon" instead of download buttons.
router.get('/coming-soon', ctrl.comingSoon.bind(ctrl));

export default router;
