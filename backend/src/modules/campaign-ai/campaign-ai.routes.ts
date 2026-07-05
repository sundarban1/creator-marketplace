import { Router } from 'express';
import { CampaignAiController } from './campaign-ai.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { generateCampaignSchema } from './campaign-ai.schema';

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

export default router;
