import { Router } from 'express';
import { BusinessController } from './business.controller';
import { CreatorController } from '../creator/creator.controller';
import { SavedCreatorController } from './saved-creator.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  updateBusinessProfileSchema,
  addSocialAccountSchema,
  updateSocialAccountSchema,
  connectYoutubeAccountSchema,
  listFacebookPagesSchema,
  connectFacebookPageSchema,
  connectInstagramAccountSchema,
} from './business.schema';
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
router.get('/creators/recommended',    creatorCtrl.getRecommendedCreators.bind(creatorCtrl));
router.get('/creators/:id',            creatorCtrl.getCreatorPublicProfile.bind(creatorCtrl));
router.get('/creators',                creatorCtrl.listCreators.bind(creatorCtrl));
router.post('/creators/:id/save',      savedCtrl.toggle.bind(savedCtrl));

// Campaign invitations
router.post('/campaigns/:campaignId/invite', savedCtrl.inviteCreators.bind(savedCtrl));

// Profile
router.get('/profile', ctrl.getProfile.bind(ctrl));
router.put('/profile', validate(updateBusinessProfileSchema), ctrl.updateProfile.bind(ctrl));
router.post('/logo', uploadImage.single('logo'), ctrl.uploadLogo.bind(ctrl));
router.post('/documents/pan',         uploadImage.single('document'), ctrl.uploadPanDoc.bind(ctrl));
router.post('/documents/company-reg', uploadImage.single('document'), ctrl.uploadCompanyRegDoc.bind(ctrl));
router.get('/payment-history', ctrl.getPaymentHistory.bind(ctrl));
router.get('/analytics', ctrl.getMyAnalytics.bind(ctrl));

// Social Accounts — mirrors /api/creator/social-accounts (see creator.routes.ts).
// TikTok/Instagram-direct-login callbacks are NOT duplicated here: both providers
// only have one registered redirect URI, so those two flows still land on
// /api/creator/social-accounts/{tiktok,instagram-login}/callback, which is already
// role-aware (see creator.service.ts).
router.get('/social-accounts',             ctrl.getSocialAccounts.bind(ctrl));
router.post('/social-accounts',            validate(addSocialAccountSchema),    ctrl.addSocialAccount.bind(ctrl));
router.put('/social-accounts/:id',         validate(updateSocialAccountSchema), ctrl.updateSocialAccount.bind(ctrl));
router.delete('/social-accounts/:id',      ctrl.deleteSocialAccount.bind(ctrl));
router.post('/social-accounts/youtube/connect', validate(connectYoutubeAccountSchema), ctrl.connectYoutubeAccount.bind(ctrl));
router.get('/social-accounts/tiktok/authorize', ctrl.getTiktokAuthorizeUrl.bind(ctrl));
router.post('/social-accounts/facebook/pages',    validate(listFacebookPagesSchema),       ctrl.getFacebookPages.bind(ctrl));
router.post('/social-accounts/facebook/connect',  validate(connectFacebookPageSchema),     ctrl.connectFacebookPage.bind(ctrl));
router.post('/social-accounts/instagram/connect', validate(connectInstagramAccountSchema), ctrl.connectInstagramAccount.bind(ctrl));
router.get('/social-accounts/instagram-login/authorize', ctrl.getInstagramLoginAuthorizeUrl.bind(ctrl));

export default router;
