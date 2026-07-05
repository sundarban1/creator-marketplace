import { Router } from 'express';
import { CategoryController } from './category.controller';

const router = Router();
const ctrl = new CategoryController();

// Public — no auth. Categories aren't sensitive, and onboarding needs to read them.
router.get('/', ctrl.listPublic.bind(ctrl));

export default router;
