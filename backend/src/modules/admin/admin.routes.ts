import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import {
  getStats,
  getUsers,
  verifyUser,
  deleteUser,
  getCreators,
  getBusinesses,
  getCampaigns,
  updateCampaignStatus,
} from './admin.controller';

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate, authorize(Role.ADMIN));

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
router.get('/stats', getStats);

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
router.get('/users', getUsers);
router.patch('/users/:id/verify', verifyUser);
router.delete('/users/:id', deleteUser);

/**
 * @swagger
 * /api/admin/creators:
 *   get:
 *     tags: [Admin]
 *     summary: List all creators (paginated)
 *     security:
 *       - bearerAuth: []
 */
router.get('/creators', getCreators);

/**
 * @swagger
 * /api/admin/businesses:
 *   get:
 *     tags: [Admin]
 *     summary: List all businesses (paginated)
 *     security:
 *       - bearerAuth: []
 */
router.get('/businesses', getBusinesses);

/**
 * @swagger
 * /api/admin/campaigns:
 *   get:
 *     tags: [Admin]
 *     summary: List all campaigns (paginated)
 *     security:
 *       - bearerAuth: []
 */
router.get('/campaigns', getCampaigns);
router.patch('/campaigns/:id/status', updateCampaignStatus);

export default router;
