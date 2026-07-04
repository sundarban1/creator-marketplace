import { Router } from 'express';
import { CreatorController } from './creator.controller';
import { BusinessController } from '../business/business.controller';
import { FavoriteController } from './favorite.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { uploadImage } from '../../middleware/upload';
import {
  updateCreatorProfileSchema,
  addPortfolioLinkSchema,
  updateSocialLinksSchema,
  addSocialAccountSchema,
  updateSocialAccountSchema,
  updatePaymentMethodsSchema,
  updateCampaignPrefsSchema,
} from './creator.schema';

const router = Router();
const ctrl = new CreatorController();
const businessCtrl = new BusinessController();
const favoriteCtrl = new FavoriteController();

// All creator routes require authentication and CREATOR role
router.use(authenticate, authorize('CREATOR'));

/**
 * @swagger
 * /api/creator/profile:
 *   get:
 *     tags: [Creator]
 *     summary: Get current creator's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Creator profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CreatorProfile'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (wrong role)
 */
router.get('/profile', ctrl.getProfile.bind(ctrl));
router.get('/username-available', ctrl.checkUsernameAvailability.bind(ctrl));

/**
 * @swagger
 * /api/creator/profile:
 *   put:
 *     tags: [Creator]
 *     summary: Update creator profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Jane Doe
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *                 example: Lifestyle creator passionate about travel and food
 *               location:
 *                 type: string
 *                 example: Mumbai, India
 *               avatarUrl:
 *                 type: string
 *                 format: uri
 *                 example: https://example.com/avatar.jpg
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Lifestyle", "Travel", "Food"]
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CreatorProfile'
 */
router.put('/profile', validate(updateCreatorProfileSchema), ctrl.updateProfile.bind(ctrl));
router.post('/avatar', uploadImage.single('avatar'), ctrl.uploadAvatar.bind(ctrl));

/**
 * @swagger
 * /api/creator/portfolio:
 *   post:
 *     tags: [Creator]
 *     summary: Add a portfolio link
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - label
 *               - url
 *             properties:
 *               label:
 *                 type: string
 *                 example: My Travel Blog
 *               url:
 *                 type: string
 *                 format: uri
 *                 example: https://myportfolio.com/travel
 *     responses:
 *       201:
 *         description: Portfolio link added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CreatorProfile'
 */
router.post('/portfolio', validate(addPortfolioLinkSchema), ctrl.addPortfolioLink.bind(ctrl));

/**
 * @swagger
 * /api/creator/portfolio/{id}:
 *   delete:
 *     tags: [Creator]
 *     summary: Remove a portfolio link
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Portfolio link ID
 *     responses:
 *       200:
 *         description: Portfolio link removed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CreatorProfile'
 *       404:
 *         description: Portfolio link not found
 */
router.delete('/portfolio/:id', ctrl.removePortfolioLink.bind(ctrl));

/**
 * @swagger
 * /api/creator/social-links:
 *   put:
 *     tags: [Creator]
 *     summary: Update social media links
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               instagram:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *                 example: https://instagram.com/janedoe
 *               tiktok:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *                 example: https://tiktok.com/@janedoe
 *               youtube:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *                 example: https://youtube.com/c/janedoe
 *               facebook:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *                 example: https://facebook.com/janedoe
 *     responses:
 *       200:
 *         description: Social links updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CreatorProfile'
 */
router.put('/social-links', validate(updateSocialLinksSchema), ctrl.updateSocialLinks.bind(ctrl));

router.get('/social-accounts',             ctrl.getSocialAccounts.bind(ctrl));
router.post('/social-accounts',            validate(addSocialAccountSchema),    ctrl.addSocialAccount.bind(ctrl));
router.put('/social-accounts/:id',         validate(updateSocialAccountSchema), ctrl.updateSocialAccount.bind(ctrl));
router.delete('/social-accounts/:id',      ctrl.deleteSocialAccount.bind(ctrl));

router.get('/earnings',                    ctrl.getEarnings.bind(ctrl));
router.put('/payment-methods',             validate(updatePaymentMethodsSchema),  ctrl.updatePaymentMethods.bind(ctrl));
router.put('/campaign-preferences',        validate(updateCampaignPrefsSchema),   ctrl.updateCampaignPrefs.bind(ctrl));

// Explore businesses (creator browsing businesses)
router.get('/businesses',                                 businessCtrl.listBusinesses.bind(businessCtrl));
router.get('/businesses/favorites',                       favoriteCtrl.listFavorites.bind(favoriteCtrl));
router.get('/businesses/favorites/list',                  favoriteCtrl.listFavoriteBusinesses.bind(favoriteCtrl));
router.post('/businesses/:businessId/favorite',           favoriteCtrl.toggle.bind(favoriteCtrl));
router.get('/businesses/:id',                             businessCtrl.getBusinessPublic.bind(businessCtrl));

export default router;
