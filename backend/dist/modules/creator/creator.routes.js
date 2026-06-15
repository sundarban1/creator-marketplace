"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const creator_controller_1 = require("./creator.controller");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const creator_schema_1 = require("./creator.schema");
const router = (0, express_1.Router)();
const ctrl = new creator_controller_1.CreatorController();
// All creator routes require authentication and CREATOR role
router.use(auth_1.authenticate, (0, auth_1.authorize)('CREATOR'));
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
router.put('/profile', (0, validate_1.validate)(creator_schema_1.updateCreatorProfileSchema), ctrl.updateProfile.bind(ctrl));
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
router.post('/portfolio', (0, validate_1.validate)(creator_schema_1.addPortfolioLinkSchema), ctrl.addPortfolioLink.bind(ctrl));
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
router.put('/social-links', (0, validate_1.validate)(creator_schema_1.updateSocialLinksSchema), ctrl.updateSocialLinks.bind(ctrl));
exports.default = router;
//# sourceMappingURL=creator.routes.js.map