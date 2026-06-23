import { Router } from 'express';
import { BusinessController } from './business.controller';
import { CreatorController } from '../creator/creator.controller';
import { SavedCreatorController } from './saved-creator.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { updateBusinessProfileSchema } from './business.schema';
import { uploadImage } from '../../middleware/upload';

const router      = Router();
const ctrl        = new BusinessController();
const creatorCtrl = new CreatorController();
const savedCtrl   = new SavedCreatorController();

// All business routes require authentication and BUSINESS role
router.use(authenticate, authorize('BUSINESS'));

// Creator discovery & saving
router.get('/creators/filter-options', creatorCtrl.getCreatorFilterOptions.bind(creatorCtrl));
router.get('/creators/saved',          savedCtrl.listSaved.bind(savedCtrl));
router.get('/creators/saved-ids',      savedCtrl.getSavedIds.bind(savedCtrl));
router.get('/creators/:id',            creatorCtrl.getCreatorPublicProfile.bind(creatorCtrl));
router.get('/creators',                creatorCtrl.listCreators.bind(creatorCtrl));
router.post('/creators/:id/save',      savedCtrl.toggle.bind(savedCtrl));

// Campaign invitations
router.post('/campaigns/:campaignId/invite', savedCtrl.inviteCreators.bind(savedCtrl));

// Profile
router.get('/profile', ctrl.getProfile.bind(ctrl));
router.put('/profile', validate(updateBusinessProfileSchema), ctrl.updateProfile.bind(ctrl));
router.post('/logo', uploadImage.single('logo'), ctrl.uploadLogo.bind(ctrl));

export default router;
