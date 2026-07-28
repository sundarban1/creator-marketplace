import { Router } from 'express';
import { SuccessStoryController } from './success-story.controller';

const router = Router();
const ctrl = new SuccessStoryController();

// Public — no auth. Only ACTIVE stories are returned (see repository).
router.get('/', ctrl.listPublic.bind(ctrl));

export default router;
