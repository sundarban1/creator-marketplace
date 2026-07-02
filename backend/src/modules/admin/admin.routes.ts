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
  getSettings,
  updateSettings,
  getConversationStats,
  getConversations,
  deleteConversation,
} from './admin.controller';

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate, authorize(Role.ADMIN));

// ── Core ────────────────────────────────────────────────────────────────────────

router.get('/stats', getStats);

router.get('/users', getUsers);
router.patch('/users/:id/verify', verifyUser);
router.delete('/users/:id', deleteUser);

router.get('/creators',  getCreators);
router.get('/businesses', getBusinesses);

router.get('/campaigns', getCampaigns);
router.patch('/campaigns/:id/status', updateCampaignStatus);

// ── Platform Settings ───────────────────────────────────────────────────────────

router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// ── Conversations (Messaging) ───────────────────────────────────────────────────

router.get('/conversations/stats', getConversationStats);
router.get('/conversations',       getConversations);
router.delete('/conversations/:id', deleteConversation);

export default router;
