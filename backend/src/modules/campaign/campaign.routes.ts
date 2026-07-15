import { Router } from 'express';
import { CampaignController } from './campaign.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { uploadImage } from '../../middleware/upload';
import {
  createCampaignSchema,
  updateCampaignSchema,
  campaignListQuerySchema,
  applyToCampaignSchema,
  nearbyQuerySchema,
  submitReviewSchema,
} from './campaign.schema';

const router = Router();
const ctrl = new CampaignController();

/**
 * @swagger
 * /api/campaigns/feature-image:
 *   post:
 *     tags: [Campaign]
 *     summary: Upload a campaign feature image (BUSINESS only). Not tied to a
 *       specific campaign — used to pre-upload the image while composing a new
 *       campaign, before it has an id.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded
 */
router.post(
  '/feature-image',
  authenticate,
  authorize('BUSINESS'),
  uploadImage.single('image'),
  ctrl.uploadFeatureImage.bind(ctrl)
);

/**
 * @swagger
 * /api/campaigns:
 *   post:
 *     tags: [Campaign]
 *     summary: Create a new campaign (BUSINESS only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - category
 *               - contentType
 *               - deliverables
 *               - deadline
 *               - budgetMin
 *               - budgetMax
 *               - paymentType
 *             properties:
 *               title:
 *                 type: string
 *                 example: Summer Fashion Campaign
 *               description:
 *                 type: string
 *                 example: Promote our new summer collection across Instagram
 *               category:
 *                 type: string
 *                 example: Fashion
 *               platforms:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 3
 *                 example: ["Instagram", "TikTok"]
 *               minFollowers:
 *                 type: integer
 *                 default: 0
 *                 example: 10000
 *               contentType:
 *                 type: string
 *                 example: Reel
 *               deliverables:
 *                 type: string
 *                 example: "3 Reels, 5 Stories"
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-08-31T00:00:00.000Z"
 *               location:
 *                 type: string
 *                 example: Mumbai
 *               budgetMin:
 *                 type: number
 *                 example: 10000
 *               budgetMax:
 *                 type: number
 *                 example: 50000
 *               paymentType:
 *                 type: string
 *                 example: Fixed
 *     responses:
 *       201:
 *         description: Campaign created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Campaign'
 *       403:
 *         description: Not authorized (must be BUSINESS role)
 */
router.post(
  '/',
  authenticate,
  authorize('BUSINESS'),
  validate(createCampaignSchema),
  ctrl.create.bind(ctrl)
);

/**
 * @swagger
 * /api/campaigns:
 *   get:
 *     tags: [Campaign]
 *     summary: List campaigns (public, filterable)
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *         example: Fashion
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *         description: Filter by platform
 *         example: Instagram
 *       - in: query
 *         name: minBudget
 *         schema:
 *           type: number
 *         description: Minimum budget filter
 *         example: 5000
 *       - in: query
 *         name: maxBudget
 *         schema:
 *           type: number
 *         description: Maximum budget filter
 *         example: 100000
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, PAUSED, CLOSED]
 *         description: Filter by campaign status (defaults to ACTIVE)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Paginated campaign list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get('/', validate(campaignListQuerySchema, 'query'), ctrl.list.bind(ctrl));
router.get('/categories', ctrl.getCategories.bind(ctrl));
router.get('/master-categories', ctrl.getMasterCategories.bind(ctrl));
router.get('/platforms', ctrl.getPlatforms.bind(ctrl));

/**
 * @swagger
 * /api/campaigns/nearby:
 *   get:
 *     tags: [Campaign]
 *     summary: Active campaigns within a radius of a point, sorted by distance
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: lng
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: radiusKm
 *         schema: { type: number, default: 25 }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Nearby campaigns, each with a distanceKm field
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get('/nearby', validate(nearbyQuerySchema, 'query'), ctrl.nearby.bind(ctrl));

/**
 * @swagger
 * /api/campaigns/my:
 *   get:
 *     tags: [Campaign]
 *     summary: Get own campaigns (BUSINESS only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated list of own campaigns
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get('/my', authenticate, authorize('BUSINESS'), ctrl.getMyCampaigns.bind(ctrl));

/**
 * @swagger
 * /api/campaigns/applications/my:
 *   get:
 *     tags: [Campaign]
 *     summary: Get own applications (CREATOR only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated list of creator's applications
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get(
  '/applications/my',
  authenticate,
  authorize('CREATOR'),
  ctrl.getMyApplications.bind(ctrl)
);

router.get(
  '/applications/business',
  authenticate,
  authorize('BUSINESS'),
  ctrl.getBusinessApplications.bind(ctrl)
);

router.put(
  '/applications/:appId/pay',
  authenticate,
  authorize('BUSINESS'),
  ctrl.payForApplication.bind(ctrl)
);

router.put(
  '/applications/:appId/submit',
  authenticate,
  authorize('CREATOR'),
  ctrl.submitWork.bind(ctrl)
);

router.put(
  '/applications/:appId/approve',
  authenticate,
  authorize('BUSINESS'),
  ctrl.approveWork.bind(ctrl)
);

router.put(
  '/applications/:appId/request-revision',
  authenticate,
  authorize('BUSINESS'),
  ctrl.requestRevision.bind(ctrl)
);

router.post(
  '/applications/:appId/review',
  authenticate,
  authorize('CREATOR', 'BUSINESS'),
  validate(submitReviewSchema),
  ctrl.submitReview.bind(ctrl)
);

router.put(
  '/applications/:appId/start',
  authenticate,
  authorize('CREATOR'),
  ctrl.startWork.bind(ctrl)
);

router.put(
  '/:id/cancel',
  authenticate,
  authorize('BUSINESS'),
  ctrl.cancelCampaign.bind(ctrl)
);

/**
 * @swagger
 * /api/campaigns/{id}:
 *   get:
 *     tags: [Campaign]
 *     summary: Get campaign by ID (public)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Campaign details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Campaign'
 *       404:
 *         description: Campaign not found
 */
router.get('/:id', ctrl.getById.bind(ctrl));

/**
 * @swagger
 * /api/campaigns/{id}:
 *   put:
 *     tags: [Campaign]
 *     summary: Update a campaign (BUSINESS only, own campaigns)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, PAUSED, CLOSED]
 *               budgetMin:
 *                 type: number
 *               budgetMax:
 *                 type: number
 *               deadline:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Campaign updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Campaign'
 *       403:
 *         description: Not authorized (not your campaign)
 *       404:
 *         description: Campaign not found
 */
router.put(
  '/:id',
  authenticate,
  authorize('BUSINESS'),
  validate(updateCampaignSchema),
  ctrl.update.bind(ctrl)
);

/**
 * @swagger
 * /api/campaigns/{id}:
 *   delete:
 *     tags: [Campaign]
 *     summary: Delete a campaign (BUSINESS only, own campaigns)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Campaign deleted
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Campaign not found
 */
router.delete('/:id', authenticate, authorize('BUSINESS'), ctrl.delete.bind(ctrl));

/**
 * @swagger
 * /api/campaigns/{id}/apply:
 *   post:
 *     tags: [Campaign]
 *     summary: Apply to a campaign (CREATOR only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - coverLetter
 *               - proposedRate
 *               - timeline
 *             properties:
 *               coverLetter:
 *                 type: string
 *                 minLength: 50
 *                 example: I am a lifestyle creator with 50K followers on Instagram...
 *               proposedRate:
 *                 type: number
 *                 example: 25000
 *               timeline:
 *                 type: string
 *                 example: "2 weeks after approval"
 *               socialHandles:
 *                 type: object
 *                 example: { "instagram": "@janedoe", "tiktok": "@janedoe" }
 *               portfolioUrl:
 *                 type: string
 *                 format: uri
 *                 example: https://portfolio.janedoe.com
 *     responses:
 *       201:
 *         description: Application submitted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Application'
 *       409:
 *         description: Already applied to this campaign
 */
router.post(
  '/:id/apply',
  authenticate,
  authorize('CREATOR'),
  validate(applyToCampaignSchema),
  ctrl.apply.bind(ctrl)
);

router.post(
  '/:id/pay',
  authenticate,
  authorize('BUSINESS'),
  ctrl.payForCampaign.bind(ctrl)
);

/**
 * @swagger
 * /api/campaigns/{id}/applications:
 *   get:
 *     tags: [Campaign]
 *     summary: List applications for a campaign (BUSINESS only, own campaigns)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated applications
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get(
  '/:id/applications',
  authenticate,
  authorize('BUSINESS'),
  ctrl.getCampaignApplications.bind(ctrl)
);

/**
 * @swagger
 * /api/campaigns/{id}/applications/{appId}/accept:
 *   put:
 *     tags: [Campaign]
 *     summary: Accept an application (BUSINESS only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Application accepted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Application'
 */
router.put(
  '/:id/applications/:appId/accept',
  authenticate,
  authorize('BUSINESS'),
  ctrl.acceptApplication.bind(ctrl)
);

/**
 * @swagger
 * /api/campaigns/{id}/applications/{appId}/reject:
 *   put:
 *     tags: [Campaign]
 *     summary: Reject an application (BUSINESS only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Application rejected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Application'
 */
router.put(
  '/:id/applications/:appId/reject',
  authenticate,
  authorize('BUSINESS'),
  ctrl.rejectApplication.bind(ctrl)
);

export default router;
