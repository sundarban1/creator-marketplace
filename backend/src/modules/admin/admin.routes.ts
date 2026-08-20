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
  getActivityLogs,
  getAuditLogs,
  getCampaigns,
  getCampaignDetail,
  updateCampaign,
  updateCampaignStatus,
  approveCampaign,
  rejectCampaign,
  deleteCampaign,
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
  rejectCreator,
  verifyBusiness,
  setBusinessDocumentStatus,
  rejectBusiness,
  getProviderVerificationQueue,
  getBusinessVerificationQueue,
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
router.patch('/creators/:id/reject', rejectCreator);
router.get('/businesses', getBusinesses);
router.patch('/businesses/:id/verify', verifyBusiness);
router.patch('/businesses/:id/documents/:doc', setBusinessDocumentStatus);
router.patch('/businesses/:id/reject', rejectBusiness);

router.get('/verification/providers', getProviderVerificationQueue);
router.get('/verification/businesses', getBusinessVerificationQueue);

router.get('/activity-logs', getActivityLogs);
router.get('/audit-logs',    getAuditLogs);

router.get('/campaigns', getCampaigns);
router.get('/campaigns/:id', getCampaignDetail);
router.put('/campaigns/:id', validate(updateCampaignSchema), updateCampaign);
router.patch('/campaigns/:id/status', updateCampaignStatus);
router.post('/campaigns/:id/approve', approveCampaign);
router.post('/campaigns/:id/reject', rejectCampaign);
router.delete('/campaigns/:id', deleteCampaign);
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
