import { Router } from 'express';
import { CampaignController } from './campaign.controller';

const router = Router();
const ctrl = new CampaignController();

// Public — Khalti redirects the user's browser here directly after payment,
// with no Authorization header. See CampaignController.khaltiCallback.
router.get('/callback', ctrl.khaltiCallback.bind(ctrl));

export default router;
