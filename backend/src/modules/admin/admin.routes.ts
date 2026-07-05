import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import {
  getStats,
  getUsers,
  verifyUser,
  suspendUser,
  deleteUser,
  getCreators,
  getBusinesses,
  getCampaigns,
  getCampaignDetail,
  updateCampaignStatus,
  getSettings,
  updateSettings,
  getConversationStats,
  getConversations,
  deleteConversation,
  getReferrals,
  releaseReferral,
  verifyCreator,
  verifyBusiness,
  getBusinessReferrals,
  releaseBusinessReferral,
} from './admin.controller';

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate, authorize(Role.ADMIN));

// ── Core ────────────────────────────────────────────────────────────────────────

router.get('/stats', getStats);

router.get('/users', getUsers);
router.patch('/users/:id/verify', verifyUser);
router.patch('/users/:id/suspend', suspendUser);
router.delete('/users/:id', deleteUser);

router.get('/creators',  getCreators);
router.patch('/creators/:id/verify', verifyCreator);
router.get('/businesses', getBusinesses);
router.patch('/businesses/:id/verify', verifyBusiness);

router.get('/campaigns', getCampaigns);
router.get('/campaigns/:id', getCampaignDetail);
router.patch('/campaigns/:id/status', updateCampaignStatus);

// ── Platform Settings ───────────────────────────────────────────────────────────

router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// ── Conversations (Messaging) ───────────────────────────────────────────────────

router.get('/conversations/stats', getConversationStats);
router.get('/conversations',       getConversations);
router.delete('/conversations/:id', deleteConversation);

// ── Referrals ───────────────────────────────────────────────────────────────────

router.get('/referrals',              getReferrals);
router.patch('/referrals/:id/release', releaseReferral);

router.get('/business-referrals',              getBusinessReferrals);
router.patch('/business-referrals/:id/release', releaseBusinessReferral);

export default router;
