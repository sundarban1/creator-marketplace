import { Router } from 'express';
import { authenticate, authorize, optionalAuthenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { uploadImage } from '../../middleware/upload';
import { CompetitionController as c } from './competition.controller';
import { CompetitionPaymentController as pc } from './competition.payments.controller';
import {
  initiateFundingSchema, reportDirectPaymentSchema, disputePayoutSchema, adminPayoutActionSchema, adminRefundSchema,
  paymentsAdminListQuerySchema,
} from './competition.payments.schema';
import {
  createCompetitionSchema, updateCompetitionSchema, publishCompetitionSchema, reasonSchema, optionalReasonSchema,
  registrationDeadlineSchema, stageDeadlineSchema, saveDecisionsSchema, publishDecisionsSchema, saveAwardsSchema,
  publishResultsSchema, participantsQuerySchema, discoverQuerySchema, submitLinkSchema, videoSignatureSchema,
  videoCompleteSchema, adminListQuerySchema, moderationFlagSchema, reviewFeedbackSchema, rejectSchema,
} from './competition.schema';

// ── Organizer (BUSINESS) — mounted at /api/competitions/manage ──────────────
// Ownership is enforced in the service (non-owners get 404).
export const competitionManageRoutes = Router();
competitionManageRoutes.use(authenticate, authorize('BUSINESS'));
competitionManageRoutes.get('/', c.listMine);
competitionManageRoutes.post('/', validate(createCompetitionSchema), c.create);
competitionManageRoutes.get('/:id', c.getManaged);
competitionManageRoutes.patch('/:id', validate(updateCompetitionSchema), c.update);
competitionManageRoutes.delete('/:id', c.remove);
// Every competition goes through admin review before it can go live.
competitionManageRoutes.post('/:id/submit', validate(publishCompetitionSchema), c.submitForReview);
competitionManageRoutes.post('/:id/withdraw', c.withdraw);
competitionManageRoutes.post('/:id/pending-changes/discard', c.discardChanges);
competitionManageRoutes.post('/:id/pause', validate(optionalReasonSchema), c.pause);
competitionManageRoutes.post('/:id/resume', c.resume);
competitionManageRoutes.post('/:id/cancel', validate(reasonSchema), c.cancel);
competitionManageRoutes.post('/:id/close', validate(optionalReasonSchema), c.close);
competitionManageRoutes.post('/:id/registration/close', c.closeRegistration);
competitionManageRoutes.post('/:id/registration/extend', validate(registrationDeadlineSchema), c.extendRegistration);
competitionManageRoutes.post('/:id/stages/:stageId/open', c.openStage);
competitionManageRoutes.post('/:id/stages/:stageId/close', c.closeStage);
competitionManageRoutes.post('/:id/stages/:stageId/extend', validate(stageDeadlineSchema), c.extendStage);
competitionManageRoutes.post('/:id/stages/:stageId/reopen', validate(stageDeadlineSchema), c.reopenStage);
competitionManageRoutes.get('/:id/participants', validate(participantsQuerySchema, 'query'), c.participants);
competitionManageRoutes.get('/:id/stages/:stageId/submissions/:participantId', c.submission);
competitionManageRoutes.get('/:id/stages/:stageId/decisions/summary', c.decisionSummary);
competitionManageRoutes.put('/:id/stages/:stageId/decisions', validate(saveDecisionsSchema), c.saveDecisions);
competitionManageRoutes.post('/:id/stages/:stageId/decisions/publish', validate(publishDecisionsSchema), c.publishDecisions);
competitionManageRoutes.put('/:id/awards', validate(saveAwardsSchema), c.saveAwards);
competitionManageRoutes.post('/:id/results/publish', validate(publishResultsSchema), c.publishResults);
competitionManageRoutes.post('/:id/results/reopen', validate(reasonSchema), c.reopenResults);
competitionManageRoutes.get('/:id/activity', c.activity);
// Prize payments — fund the pool through Kolab, or record direct payments to winners.
competitionManageRoutes.get('/:id/payments', pc.summary);
competitionManageRoutes.post('/:id/payments/funding', validate(initiateFundingSchema), pc.initiateFunding);
// multer first so text fields reach the validator; optional `evidence` image (5 MB, jpg/png/webp).
competitionManageRoutes.post('/:id/payments/payouts/:payoutId/report', uploadImage.single('evidence'), validate(reportDirectPaymentSchema), pc.reportPayment);

// ── Creator + public — mounted at /api/competitions ─────────────────────────
export const competitionRoutes = Router();
competitionRoutes.get('/', optionalAuthenticate, validate(discoverQuerySchema, 'query'), c.discover);
competitionRoutes.get('/payment-config', pc.config);
competitionRoutes.get('/me/joined', authenticate, authorize('CREATOR'), c.listJoined);
competitionRoutes.post('/:id/payouts/:payoutId/confirm', authenticate, authorize('CREATOR'), pc.confirmReceipt);
competitionRoutes.post('/:id/payouts/:payoutId/dispute', authenticate, authorize('CREATOR'), validate(disputePayoutSchema), pc.dispute);
competitionRoutes.post('/:id/join', authenticate, authorize('CREATOR'), c.join);
competitionRoutes.get('/:id/progress', authenticate, authorize('CREATOR'), c.myProgress);
competitionRoutes.post('/:id/stages/:stageId/submissions/link', authenticate, authorize('CREATOR'), validate(submitLinkSchema), c.submitLink);
competitionRoutes.post('/:id/stages/:stageId/submissions/video/signature', authenticate, authorize('CREATOR'), validate(videoSignatureSchema), c.videoSignature);
competitionRoutes.post('/:id/stages/:stageId/submissions/video/complete', authenticate, authorize('CREATOR'), validate(videoCompleteSchema), c.videoComplete);
competitionRoutes.get('/:idOrSlug', optionalAuthenticate, c.getPublic);

// ── Kolab admin — mounted at /api/admin/competitions ────────────────────────
// Oversight endpoints are aggregate-only. Moderation endpoints additionally
// require the admin to be on COMPETITION_MODERATOR_EMAILS (checked in the
// service so a direct API call can't skip it) and are audited.
export const competitionAdminRoutes = Router();
competitionAdminRoutes.use(authenticate, authorize('ADMIN'));
competitionAdminRoutes.get('/', validate(adminListQuerySchema, 'query'), c.adminList);
// Prize payments: any admin reads; actions need COMPETITION_PAYMENT_ADMIN_EMAILS (checked in the service).
competitionAdminRoutes.get('/payments', validate(paymentsAdminListQuerySchema, 'query'), pc.adminList);
competitionAdminRoutes.get('/:id/payments', pc.adminDetail);
competitionAdminRoutes.post('/:id/payments/payouts/:payoutId', validate(adminPayoutActionSchema), pc.adminPayout);
competitionAdminRoutes.post('/:id/payments/refunds', validate(adminRefundSchema), pc.adminRefund);
competitionAdminRoutes.post('/:id/payments/fundings/:fundingId/check', pc.adminCheckFunding);
competitionAdminRoutes.get('/:id', c.adminGet);
// Review — any admin. Organizer-authored content only, no participant data.
competitionAdminRoutes.post('/:id/review/approve', c.adminApprove);
competitionAdminRoutes.post('/:id/review/request-changes', validate(reviewFeedbackSchema), c.adminRequestChanges);
competitionAdminRoutes.post('/:id/review/reject', validate(rejectSchema), c.adminReject);
competitionAdminRoutes.post('/:id/review/changes/approve', c.adminApproveEdit);
competitionAdminRoutes.post('/:id/review/changes/reject', validate(reviewFeedbackSchema), c.adminRejectEdit);
competitionAdminRoutes.post('/:id/moderation/flag', validate(moderationFlagSchema), c.adminFlag);
competitionAdminRoutes.post('/:id/moderation/suspend', validate(reasonSchema), c.adminSuspend);
competitionAdminRoutes.post('/:id/moderation/unsuspend', validate(reasonSchema), c.adminUnsuspend);
competitionAdminRoutes.post('/:id/moderation/stages/:stageId/submissions', validate(reasonSchema), c.adminEvidence);

// ── Prize-pool gateway redirects — mounted at /api/payments/competition ─────
// Public: the gateway redirects the browser here with no Authorization header.
// Nothing is trusted from the redirect; the service re-verifies with the gateway.
export const competitionPaymentCallbackRoutes = Router();
competitionPaymentCallbackRoutes.get('/khalti/callback', pc.khaltiCallback);
competitionPaymentCallbackRoutes.get('/khalti/callback/web', pc.khaltiCallbackWeb);
competitionPaymentCallbackRoutes.get('/esewa/checkout/:fundingId', pc.esewaCheckout);
competitionPaymentCallbackRoutes.get('/esewa/success/:fundingId', pc.esewaSuccess);
competitionPaymentCallbackRoutes.get('/esewa/success/:fundingId/web', pc.esewaSuccessWeb);
competitionPaymentCallbackRoutes.get('/esewa/failure/:fundingId', pc.esewaFailure);
competitionPaymentCallbackRoutes.get('/esewa/failure/:fundingId/web', pc.esewaFailureWeb);
