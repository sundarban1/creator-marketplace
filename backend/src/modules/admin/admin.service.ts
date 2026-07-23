import { CampaignStatus, ReferralStatus } from '@prisma/client';
import { AdminRepository } from './admin.repository';
import { ReferralRepository } from '../referral/referral.repository';
import { isCreatorProfileComplete } from '../referral/referral.service';
import { BusinessReferralRepository } from '../business-referral/business-referral.repository';
import { isBusinessProfileComplete, REFERRAL_HOLD_DAYS } from '../business-referral/business-referral.service';
import { CampaignRepository } from '../campaign/campaign.repository';
import { CampaignService } from '../campaign/campaign.service';
import { toCampaignDto } from '../campaign/campaign.dto';
import { MessagingService } from '../messaging/messaging.service';
import { notificationService } from '../notifications/notification.service';
import { analyticsService } from '../analytics/analytics.service';
import { sendAccountVerifiedEmail, sendVerificationRejectedEmail } from '../../utils/email';
import { AppError } from '../../middleware/error';

export class AdminService {
  private repo: AdminRepository;
  private referralRepo: ReferralRepository;
  private businessReferralRepo: BusinessReferralRepository;
  private campaignRepo: CampaignRepository;
  private campaignService: CampaignService;
  private messagingService: MessagingService;

  constructor() {
    this.repo = new AdminRepository();
    this.referralRepo = new ReferralRepository();
    this.businessReferralRepo = new BusinessReferralRepository();
    this.campaignRepo = new CampaignRepository();
    this.campaignService = new CampaignService();
    this.messagingService = new MessagingService();
  }

  getStats() {
    return this.repo.getStats();
  }

  getUsers(page: number, limit: number, role?: string, search?: string) {
    return this.repo.getAllUsers(page, limit, role, search);
  }

  getCreators(page: number, limit: number, search?: string) {
    return this.repo.getAllCreators(page, limit, search);
  }

  getBusinesses(page: number, limit: number, search?: string) {
    return this.repo.getAllBusinesses(page, limit, search);
  }

  getCampaigns(page: number, limit: number, status?: string, search?: string) {
    return this.repo.getAllCampaigns(page, limit, status, search);
  }

  verifyUser(userId: string, verified: boolean) {
    return this.repo.updateUserVerification(userId, verified);
  }

  suspendUser(userId: string, isActive: boolean) {
    return this.repo.updateUserActiveStatus(userId, isActive);
  }

  getUser(userId: string) {
    return this.repo.getUserById(userId);
  }

  getCampaignDetail(campaignId: string) {
    return this.repo.getCampaignDetail(campaignId);
  }

  setCampaignStatus(campaignId: string, status: CampaignStatus) {
    return this.repo.updateCampaignStatus(campaignId, status);
  }

  async approveCampaign(campaignId: string) {
    const campaign = await this.repo.findCampaignForApproval(campaignId);
    if (!campaign) throw new AppError('Campaign not found', 404);
    if (campaign.status !== 'PENDING_APPROVAL') {
      throw new AppError('Campaign is not pending approval', 400);
    }

    const updated = await this.repo.approveCampaign(campaignId);
    const dto = toCampaignDto(updated);
    this.campaignService.fanOutNewCampaign(dto, campaign.business, campaign.business.userId);

    notificationService.create({
      userId:  campaign.business.userId,
      type:    'campaign_approved',
      title:   '✅ Event Approved',
      body:    `Your event "${campaign.title}" has been approved and is now live.`,
      refId:   campaignId,
      refType: 'campaign',
    }).catch(() => {});

    return dto;
  }

  async rejectCampaign(campaignId: string, reason: string) {
    const campaign = await this.repo.findCampaignForApproval(campaignId);
    if (!campaign) throw new AppError('Campaign not found', 404);
    if (campaign.status !== 'PENDING_APPROVAL') {
      throw new AppError('Campaign is not pending approval', 400);
    }

    const updated = await this.repo.updateCampaignStatus(campaignId, 'CANCELLED');

    notificationService.create({
      userId:  campaign.business.userId,
      type:    'campaign_rejected',
      title:   '❌ Event Not Approved',
      body:    `Your event "${campaign.title}" was not approved: ${reason}`,
      refId:   campaignId,
      refType: 'campaign',
    }).catch(() => {});

    return updated;
  }

  removeUser(userId: string) {
    return this.repo.deleteUser(userId);
  }

  // ── Settings ────────────────────────────────────────────────────────────────

  getSettings() {
    return this.repo.getSettings();
  }

  updateSettings(settings: Record<string, unknown>) {
    return this.repo.upsertSettings(settings);
  }

  getSetting(key: string) {
    return this.repo.getSetting(key);
  }

  // ── Conversations ────────────────────────────────────────────────────────────

  getConversationStats() {
    return this.repo.getConversationStats();
  }

  getConversations(page: number, limit: number, status?: string, search?: string) {
    return this.repo.getAllConversations(page, limit, status, search);
  }

  removeConversation(id: string) {
    return this.repo.deleteConversation(id);
  }

  // ── Referrals ────────────────────────────────────────────────────────────────

  async listReferrals(status?: ReferralStatus) {
    const rows = await this.referralRepo.listAllForAdmin(status);

    return Promise.all(rows.map(async (raw) => {
      let row = raw;
      if (row.status === 'PENDING' && new Date() > row.expiresAt) {
        const updated = await this.referralRepo.updateReferralStatus(row.id, { status: 'EXPIRED' });
        row = { ...row, ...updated };
      }
      const firstEventCompleted = await this.referralRepo.hasApprovedApplication(row.referredId);
      const profileComplete = isCreatorProfileComplete(row.referred);

      return {
        id: row.id,
        referrer: { id: row.referrer.id, name: row.referrer.fullName ?? row.referrer.username },
        referred: { id: row.referred.id, name: row.referred.fullName ?? row.referred.username, isVerified: row.referred.isVerified },
        code: row.code,
        status: row.status,
        linkedAt: row.linkedAt,
        expiresAt: row.expiresAt,
        completedAt: row.completedAt,
        rewardAmount: row.rewardAmount,
        eligibility: {
          verified: row.referred.isVerified,
          profileComplete,
          firstEventCompleted,
          notExpired: row.status !== 'EXPIRED',
        },
      };
    }));
  }

  async releaseReferral(referralId: string, adminUserId: string) {
    const referral = await this.referralRepo.findReferralById(referralId);
    if (!referral) throw new AppError('Referral not found', 404);
    if (referral.status !== 'PENDING') throw new AppError('Referral is not pending', 400);
    if (new Date() > referral.expiresAt) {
      await this.referralRepo.updateReferralStatus(referralId, { status: 'EXPIRED' });
      throw new AppError('Referral has expired', 400);
    }

    const referred = await this.referralRepo.findCreatorProfileById(referral.referredId);
    if (!referred) throw new AppError('Referred creator not found', 404);
    if (!referred.isVerified) throw new AppError('Referred creator is not verified yet', 400);
    if (!isCreatorProfileComplete(referred)) throw new AppError('Referred creator profile is not complete yet', 400);

    const firstEventCompleted = await this.referralRepo.hasApprovedApplication(referral.referredId);
    if (!firstEventCompleted) throw new AppError('Referred creator has not completed a first event yet', 400);

    return this.referralRepo.updateReferralStatus(referralId, {
      status: 'COMPLETED',
      completedAt: new Date(),
      reviewedBy: adminUserId,
    });
  }

  // Payment release is the project's final stage — no separate creator
  // "confirm receipt" step. releaseApplicationPayment flips workStatus straight
  // to COMPLETED in the same update, so the completion side effects (analytics,
  // notification, closing the auto-accepted conversation) fire here too.
  async releasePayment(appId: string, adminUserId: string) {
    const app = await this.campaignRepo.findApplicationById(appId);
    if (!app) throw new AppError('Application not found', 404);
    if (app.workStatus !== 'APPROVED') throw new AppError('Work has not been approved by the brand yet', 400);
    if (app.paymentStatus === 'RELEASED') throw new AppError('Payment has already been released', 400);
    if (app.paymentStatus !== 'PAID') throw new AppError('No escrow payment is held for this application', 400);

    // Creators always receive the full proposedRate on release — the platform
    // commission (snapshotted on the campaign at creation) is charged to the
    // business on top of the rate, not deducted from the creator's payout.
    const updated = await this.campaignRepo.releaseApplicationPayment(appId, adminUserId);
    const creatorUserId = app.creator.userId;
    const businessUserId = app.campaign.business.userId;
    analyticsService.incrPaymentReleased(creatorUserId, businessUserId, app.proposedRate);
    analyticsService.incrCampaignCompleted(creatorUserId, businessUserId);

    notificationService.create({
      userId:  creatorUserId,
      type:    'payment_released',
      title:   '💸 Payment Released!',
      body:    `Your payment for "${app.campaign.title}" has been released. Check your wallet!`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch(() => {});
    notificationService.create({
      userId:  businessUserId,
      type:    'project_completed',
      title:   '✅ Project Complete',
      body:    `Payment for "${app.campaign.title}" has been released — the project is now complete.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch(() => {});

    // A conversation that was only ever auto-accepted (never a real chat request/accept)
    // pauses back to PENDING now that the project is done and paid — a genuinely-accepted
    // conversation is left open as-is.
    this.messagingService
      .closeConversationAfterCompletion(creatorUserId, businessUserId, app.creator.id, app.campaign.business.id)
      .catch(() => {});

    return updated;
  }

  async setCreatorVerified(creatorId: string, verified: boolean) {
    const updated = await this.repo.updateCreatorVerification(creatorId, verified);
    if (verified && updated.user) {
      const name = updated.fullName ?? 'there';
      notificationService.create({
        userId:  updated.userId,
        type:    'account_verified',
        title:   "You're verified! ✅",
        body:    'Your creator profile has been verified — a verified badge now appears next to your name.',
        refId:   updated.id,
        refType: 'creator',
      }).catch(() => {});
      sendAccountVerifiedEmail(updated.user.email, name, 'creator').catch(() => {});
    }
    return updated;
  }

  async setBusinessVerified(businessId: string, verified: boolean) {
    const updated = await this.repo.updateBusinessVerification(businessId, verified);
    if (verified && updated.user) {
      const name = updated.businessName ?? 'there';
      notificationService.create({
        userId:  updated.userId,
        type:    'account_verified',
        title:   "You're verified! ✅",
        body:    'Your business profile has been verified — a verified badge now appears next to your name.',
        refId:   updated.id,
        refType: 'business',
      }).catch(() => {});
      sendAccountVerifiedEmail(updated.user.email, name, 'business').catch(() => {});
    }
    return updated;
  }

  async rejectBusiness(businessId: string, reason: string) {
    const updated = await this.repo.rejectBusinessVerification(businessId, reason);
    if (updated.user) {
      const name = updated.businessName ?? 'there';
      notificationService.create({
        userId:  updated.userId,
        type:    'verification_rejected',
        title:   'Verification not approved',
        body:    `Your business verification was not approved: ${reason}`,
        refId:   updated.id,
        refType: 'business',
      }).catch(() => {});
      sendVerificationRejectedEmail(updated.user.email, name, reason, 'business').catch(() => {});
    }
    return updated;
  }

  // ── Business Referrals ───────────────────────────────────────────────────────

  async listBusinessReferrals(status?: ReferralStatus) {
    const rows = await this.businessReferralRepo.listAllForAdmin(status);

    return Promise.all(rows.map(async (raw) => {
      let row = raw;
      if (row.status === 'PENDING' && new Date() > row.expiresAt) {
        const updated = await this.businessReferralRepo.updateReferralStatus(row.id, { status: 'EXPIRED' });
        row = { ...row, ...updated };
      }

      const qualifyingCampaign = await this.businessReferralRepo.findQualifyingCampaign(row.referredId);
      const fundedCampaignStable = !!qualifyingCampaign
        && Date.now() - qualifyingCampaign.createdAt.getTime() >= REFERRAL_HOLD_DAYS * 24 * 60 * 60 * 1000;
      const profileComplete = isBusinessProfileComplete(row.referred);

      const samePan = !!row.referred.panNo && (
        row.referred.panNo === row.referrer.panNo
        || await this.businessReferralRepo.hasCompletedReferralForPanNo(row.referred.panNo, row.referredId)
      );
      const samePayout = row.referred.paymentMethods.length > 0
        && row.referred.paymentMethods.some((m) => row.referrer.paymentMethods.includes(m));
      const sameDevice = !!(row.referrer.user?.deviceId && row.referred.user?.deviceId
        && row.referrer.user.deviceId === row.referred.user.deviceId);

      return {
        id: row.id,
        referrer: { id: row.referrer.id, name: row.referrer.businessName },
        referred: { id: row.referred.id, name: row.referred.businessName, isVerified: row.referred.isVerified },
        code: row.code,
        status: row.status,
        linkedAt: row.linkedAt,
        expiresAt: row.expiresAt,
        completedAt: row.completedAt,
        rewardAmount: row.rewardAmount,
        eligibility: {
          verified: row.referred.isVerified,
          profileComplete,
          fundedCampaignStable,
          notExpired: row.status !== 'EXPIRED',
        },
        flags: { samePan, samePayout, sameDevice },
      };
    }));
  }

  async releaseBusinessReferral(referralId: string, adminUserId: string) {
    const referral = await this.businessReferralRepo.findReferralById(referralId);
    if (!referral) throw new AppError('Referral not found', 404);
    if (referral.status !== 'PENDING') throw new AppError('Referral is not pending', 400);
    if (new Date() > referral.expiresAt) {
      await this.businessReferralRepo.updateReferralStatus(referralId, { status: 'EXPIRED' });
      throw new AppError('Referral has expired', 400);
    }

    const referrer = await this.businessReferralRepo.findBusinessProfileById(referral.referrerId);
    const referred = await this.businessReferralRepo.findBusinessProfileById(referral.referredId);
    if (!referrer || !referred) throw new AppError('Business not found', 404);

    if (!referred.isVerified) throw new AppError('Referred business is not verified yet', 400);
    if (!isBusinessProfileComplete(referred)) throw new AppError('Referred business profile is not complete yet', 400);

    const qualifyingCampaign = await this.businessReferralRepo.findQualifyingCampaign(referral.referredId);
    if (!qualifyingCampaign) throw new AppError('Referred business has not published a funded campaign yet', 400);
    const ageMs = Date.now() - qualifyingCampaign.createdAt.getTime();
    if (ageMs < REFERRAL_HOLD_DAYS * 24 * 60 * 60 * 1000) {
      throw new AppError(`The funded campaign must be at least ${REFERRAL_HOLD_DAYS} days old before releasing (anti-collusion hold)`, 400);
    }

    if (referred.panNo) {
      if (referred.panNo === referrer.panNo) throw new AppError('Referred business shares a PAN/VAT number with the referrer', 400);
      const panReused = await this.businessReferralRepo.hasCompletedReferralForPanNo(referred.panNo, referral.referredId);
      if (panReused) throw new AppError('This PAN/VAT number has already collected a referral reward', 400);
    }

    const sharedPayout = referred.paymentMethods.length > 0
      && referred.paymentMethods.some((m) => referrer.paymentMethods.includes(m));
    if (sharedPayout) throw new AppError('Referred business shares a payout account with the referrer', 400);

    if (referrer.user?.deviceId && referred.user?.deviceId && referrer.user.deviceId === referred.user.deviceId) {
      throw new AppError('Referred business signed up from the same device as the referrer', 400);
    }

    return this.businessReferralRepo.updateReferralStatus(referralId, {
      status: 'COMPLETED',
      completedAt: new Date(),
      reviewedBy: adminUserId,
    });
  }
}
