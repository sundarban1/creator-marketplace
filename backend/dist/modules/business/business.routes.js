"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const business_controller_1 = require("./business.controller");
const creator_controller_1 = require("../creator/creator.controller");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const business_schema_1 = require("./business.schema");
const router = (0, express_1.Router)();
const ctrl = new business_controller_1.BusinessController();
const creatorCtrl = new creator_controller_1.CreatorController();
// All business routes require authentication and BUSINESS role
router.use(auth_1.authenticate, (0, auth_1.authorize)('BUSINESS'));
/**
 * @swagger
 * /api/business/profile:
 *   get:
 *     tags: [Business]
 *     summary: Get current business profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Business profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/BusinessProfile'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (wrong role)
 */
router.get('/creators/filter-options', creatorCtrl.getCreatorFilterOptions.bind(creatorCtrl));
router.get('/creators/:id', creatorCtrl.getCreatorPublicProfile.bind(creatorCtrl));
router.get('/creators', creatorCtrl.listCreators.bind(creatorCtrl));
router.get('/profile', ctrl.getProfile.bind(ctrl));
/**
 * @swagger
 * /api/business/profile:
 *   put:
 *     tags: [Business]
 *     summary: Update business profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *                 example: Acme Corp
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 example: We make innovative software products
 *               logoUrl:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *                 example: https://example.com/logo.png
 *               website:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *                 example: https://acme.com
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Technology", "SaaS"]
 *               panNo:
 *                 type: string
 *                 nullable: true
 *                 example: ABCDE1234F
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
 *                   $ref: '#/components/schemas/BusinessProfile'
 */
router.put('/profile', (0, validate_1.validate)(business_schema_1.updateBusinessProfileSchema), ctrl.updateProfile.bind(ctrl));
exports.default = router;
//# sourceMappingURL=business.routes.js.map