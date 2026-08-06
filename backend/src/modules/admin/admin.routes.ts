import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { updateCampaignSchema } from '../campaign/campaign.schema';
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
  updateCampaign,
  updateCampaignStatus,
  approveCampaign,
  rejectCampaign,
  getSettings,
  updateSettings,
  getConversationStats,
  getConversations,
  deleteConversation,
  getReferrals,
  releaseReferral,
  releasePayment,
  verifyCreator,
  setCreatorDocumentStatus,
  verifyBusiness,
  setBusinessDocumentStatus,
  rejectBusiness,
  getBusinessReferrals,
  releaseBusinessReferral,
  getUserAnalytics,
  getPayments,
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
router.patch('/creators/:id/documents/:doc', setCreatorDocumentStatus);
router.get('/businesses', getBusinesses);
router.patch('/businesses/:id/verify', verifyBusiness);
router.patch('/businesses/:id/documents/:doc', setBusinessDocumentStatus);
router.patch('/businesses/:id/reject', rejectBusiness);

router.get('/campaigns', getCampaigns);
router.get('/campaigns/:id', getCampaignDetail);
router.put('/campaigns/:id', validate(updateCampaignSchema), updateCampaign);
router.patch('/campaigns/:id/status', updateCampaignStatus);
router.post('/campaigns/:id/approve', approveCampaign);
router.post('/campaigns/:id/reject', rejectCampaign);
router.patch('/applications/:id/release-payment', releasePayment);

router.get('/analytics/:userId', getUserAnalytics);

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

// ── Payments ─────────────────────────────────────────────────────────────────

router.get('/payments', getPayments);

export default router;
