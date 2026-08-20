import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { uploadImage } from '../../middleware/upload';
import { PortfolioController } from './portfolio.controller';
import { createPortfolioItemSchema, updatePortfolioItemSchema } from './portfolio.schema';

const router = Router();
const ctrl = new PortfolioController();

// Structured portfolio entries (§18) — deliberately mounted at a distinct path
// from the legacy /api/creator/portfolio (CreatorProfile.portfolioLinks Json,
// see creator.routes.ts) rather than replacing it, so existing portfolio
// links keep working untouched while new uploads use this richer model.
router.use(authenticate, authorize('CREATOR'));

router.get('/', ctrl.listMine.bind(ctrl));
router.post('/upload', uploadImage.single('media'), ctrl.uploadMedia.bind(ctrl));
router.post('/', validate(createPortfolioItemSchema), ctrl.create.bind(ctrl));
router.put('/:id', validate(updatePortfolioItemSchema), ctrl.update.bind(ctrl));
router.delete('/:id', ctrl.remove.bind(ctrl));

export default router;
