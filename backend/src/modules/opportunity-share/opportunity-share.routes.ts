import { Router } from 'express';
import { OpportunityShareController } from './opportunity-share.controller';
import { authenticate, authorize, optionalAuthenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { opportunityShareCreateLimiter, opportunityShareVisitLimiter } from '../../middleware/rateLimit';
import { createShareSchema, claimSignupSchema, summaryQuerySchema } from './opportunity-share.schema';

// Share Opportunity — opportunity distribution + analytics attribution only.
// There is intentionally no reward, points or referral-code endpoint here.
const router = Router();
const ctrl = new OpportunityShareController();

/**
 * @swagger
 * /api/opportunity-shares:
 *   post:
 *     tags: [Opportunity Share]
 *     summary: Get a tracked share link for an event/campaign (CREATOR only)
 *     description: Returns `{ shareToken, shareUrl }`. Re-sharing the same opportunity on the same platform reuses the existing link. Creates no reward or referral record.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [campaignId]
 *             properties:
 *               campaignId: { type: string }
 *               platform: { type: string, enum: [WHATSAPP, SMS, COPY_LINK, NATIVE_SHARE, OTHER] }
 */
router.post(
  '/',
  authenticate,
  authorize('CREATOR'),
  opportunityShareCreateLimiter,
  validate(createShareSchema),
  ctrl.create.bind(ctrl),
);

/**
 * @swagger
 * /api/opportunity-shares/attribution/signup:
 *   post:
 *     tags: [Opportunity Share]
 *     summary: Attribute a just-created account to the share link it opened before registering
 *     description: Body `{ receipt }` (from the visit call). Always 200 with `{ attributed }` — an invalid claim never errors.
 *     security:
 *       - bearerAuth: []
 */
router.post('/attribution/signup', authenticate, validate(claimSignupSchema), ctrl.claimSignup.bind(ctrl));

/**
 * @swagger
 * /api/opportunity-shares/admin/summary:
 *   get:
 *     tags: [Opportunity Share]
 *     summary: Shares / clicks / registrations / applications per opportunity and per platform (ADMIN only)
 *     security:
 *       - bearerAuth: []
 */
router.get('/admin/summary', authenticate, authorize('ADMIN'), validate(summaryQuerySchema, 'query'), ctrl.summary.bind(ctrl));

/**
 * @swagger
 * /api/opportunity-shares/{token}/visit:
 *   post:
 *     tags: [Opportunity Share]
 *     summary: Record that a share link was opened (public; auth optional)
 *     description: Always 200. `{ valid: false }` for an unknown token; otherwise `{ valid, campaignId, receipt }` — `receipt` only for anonymous visitors, to be passed to /attribution/signup after registering.
 */
router.post('/:token/visit', opportunityShareVisitLimiter, optionalAuthenticate, ctrl.visit.bind(ctrl));

export default router;
