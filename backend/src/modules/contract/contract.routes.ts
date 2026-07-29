import { Router } from 'express';
import { Role } from '@prisma/client';
import { ContractController } from './contract.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { previewContractSchema, updateContractTemplateSchema } from './contract.schema';

const router = Router();
const ctrl = new ContractController();

/**
 * @swagger
 * /api/contracts/preview:
 *   post:
 *     tags: [Contract]
 *     summary: Render a contract preview from in-progress proposal form values (CREATOR only, no DB write)
 *     security:
 *       - bearerAuth: []
 */
router.post('/preview', authenticate, authorize(Role.CREATOR), validate(previewContractSchema), ctrl.preview.bind(ctrl));

/**
 * @swagger
 * /api/contracts/application/{applicationId}:
 *   get:
 *     tags: [Contract]
 *     summary: Get the persisted contract for an application (creator or business party, or admin)
 *     security:
 *       - bearerAuth: []
 */
router.get('/application/:applicationId', authenticate, ctrl.getByApplication.bind(ctrl));

/**
 * @swagger
 * /api/contracts/{id}/pdf:
 *   get:
 *     tags: [Contract]
 *     summary: Get (generating on first request if needed) the contract's PDF URL
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/pdf', authenticate, ctrl.getPdf.bind(ctrl));

// ── Admin: base contract template (paid campaigns only) ──────────────────────

router.get('/admin/template', authenticate, authorize(Role.ADMIN), ctrl.getTemplate.bind(ctrl));
router.put('/admin/template', authenticate, authorize(Role.ADMIN), validate(updateContractTemplateSchema), ctrl.updateTemplate.bind(ctrl));

export default router;
