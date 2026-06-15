"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../../middleware/auth");
const admin_controller_1 = require("./admin.controller");
const router = (0, express_1.Router)();
// All admin routes require authentication and ADMIN role
router.use(auth_1.authenticate, (0, auth_1.authorize)(client_1.Role.ADMIN));
/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only endpoints for platform management
 */
/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Platform statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stats retrieved successfully
 */
router.get('/stats', admin_controller_1.getStats);
/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users (paginated)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [CREATOR, BUSINESS, ADMIN] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Users list
 */
router.get('/users', admin_controller_1.getUsers);
router.patch('/users/:id/verify', admin_controller_1.verifyUser);
router.delete('/users/:id', admin_controller_1.deleteUser);
/**
 * @swagger
 * /api/admin/creators:
 *   get:
 *     tags: [Admin]
 *     summary: List all creators (paginated)
 *     security:
 *       - bearerAuth: []
 */
router.get('/creators', admin_controller_1.getCreators);
/**
 * @swagger
 * /api/admin/businesses:
 *   get:
 *     tags: [Admin]
 *     summary: List all businesses (paginated)
 *     security:
 *       - bearerAuth: []
 */
router.get('/businesses', admin_controller_1.getBusinesses);
/**
 * @swagger
 * /api/admin/campaigns:
 *   get:
 *     tags: [Admin]
 *     summary: List all campaigns (paginated)
 *     security:
 *       - bearerAuth: []
 */
router.get('/campaigns', admin_controller_1.getCampaigns);
router.patch('/campaigns/:id/status', admin_controller_1.updateCampaignStatus);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map