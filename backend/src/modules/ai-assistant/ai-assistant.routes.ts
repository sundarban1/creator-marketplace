import { Router } from 'express';
import { AiAssistantController } from './ai-assistant.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { uploadAudio } from '../../middleware/upload';

const router = Router();
const ctrl = new AiAssistantController();

/**
 * @swagger
 * /api/ai-assistant/transcribe:
 *   post:
 *     tags: [AI Assistant]
 *     summary: Transcribe a short voice recording to text for the create-event Audio prompt mode (BUSINESS only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [audio]
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Transcribed text
 */
router.post('/transcribe', authenticate, authorize('BUSINESS'), uploadAudio.single('audio'), ctrl.transcribe.bind(ctrl));

export default router;
