import { Router } from 'express';
import { CampaignAiController } from './campaign-ai.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { generateCampaignSchema, suggestDescriptionSchema } from './campaign-ai.schema';

const router = Router();
const ctrl = new CampaignAiController();

/**
 * @swagger
 * /api/campaigns/ai/generate:
 *   post:
 *     tags: [Campaign]
 *     summary: Generate a complete campaign draft from a short prompt (BUSINESS only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt:
 *                 type: string
 *                 example: I want to promote my cafe's new iced coffee
 *     responses:
 *       200:
 *         description: AI-generated campaign draft
 */
router.post('/generate', authenticate, authorize('BUSINESS'), validate(generateCampaignSchema), ctrl.generate.bind(ctrl));

/**
 * @swagger
 * /api/campaigns/ai/generate-event:
 *   post:
 *     tags: [Campaign]
 *     summary: Generate a complete free/open event draft from a short prompt (BUSINESS only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt:
 *                 type: string
 *                 example: Inviting food creators to a tasting night at our new restaurant
 *     responses:
 *       200:
 *         description: AI-generated event draft
 */
router.post('/generate-event', authenticate, authorize('BUSINESS'), validate(generateCampaignSchema), ctrl.generateEvent.bind(ctrl));

/**
 * @swagger
 * /api/campaigns/ai/suggest-description:
 *   post:
 *     tags: [Campaign]
 *     summary: Suggest a campaign description from title/category/platform/deliverables (BUSINESS only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI-suggested description
 */
router.post('/suggest-description', authenticate, authorize('BUSINESS'), validate(suggestDescriptionSchema), ctrl.suggestDescription.bind(ctrl));

export default router;
