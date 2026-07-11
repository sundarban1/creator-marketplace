import { Router } from 'express';
import { CreatorController } from './creator.controller';

const router = Router();
const ctrl = new CreatorController();

// Public — TikTok redirects the user's browser here directly after they approve
// access, with no Authorization header. Identity is carried instead via the signed
// `state` JWT that was minted when the authorize URL was generated.
router.get('/callback', ctrl.tiktokCallback.bind(ctrl));

export default router;
