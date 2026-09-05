import { CampaignStatus, ReferralStatus } from '@prisma/client';
import { AdminRepository } from './admin.repository';
import { ReferralRepository } from '../referral/referral.repository';
import { isCreatorProfileComplete, REFERRED_FIRST_EVENT_BONUS } from '../referral/referral.service';
import { recordWalletTransactionIdempotent } from '../wallet/wallet.ledger';
import { BusinessReferralRepository } from '../business-referral/business-referral.repository';
import { isBusinessProfileComplete, REFERRAL_HOLD_DAYS } from '../business-referral/business-referral.service';
import { CampaignService } from '../campaign/campaign.service';
import { escrowService } from '../campaign/escrow.service';
import { toCampaignDto } from '../campaign/campaign.dto';
import type { UpdateCampaignInput } from '../campaign/campaign.schema';
import { notificationService } from '../notifications/notification.service';
import { sendAccountVerifiedEmail, sendVerificationRejectedEmail } from '../../utils/email';
import { AppError } from '../../middleware/error';
import { invalidateSettingsCache } from '../../utils/settingsCache';
import { logActivity } from '../logging/activity.service';
import { logAudit } from '../logging/audit.service';
import { ActivityAction, AuditAction, EntityType } from '../logging/logging.constants';

import { HttpStatus } from '../../constants/httpStatus';

export class AdminService {
  private repo: AdminRepository;
  private referralRepo: ReferralRepository;
  private businessReferralRepo: BusinessReferralRepository;
  private campaignService: CampaignService;

  constructor() {
    this.repo = new AdminRepository();
    this.referralRepo = new ReferralRepository();
    this.businessReferralRepo = new BusinessReferralRepository();
    this.campaignService = new CampaignService();
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

  async getActivityLogs(page: number, limit: number, filters: { userId?: string; action?: string; from?: Date; to?: Date }) {
    const { logs, total } = await this.repo.getAllActivityLogs(page, limit, filters);
    const ids = Array.from(new Set(logs.map((l) => l.userId).filter((id): id is string => !!id)));
    const users = await this.repo.getUserEmailsByIds(ids);
    const emailById = new Map(users.map((u) => [u.id, u.email]));
    return {
      logs: logs.map((l) => ({ ...l, userEmail: l.userId ? emailById.get(l.userId) ?? null : null })),
      total,
    };
  }

  async getAuditLogs(page: number, limit: number, filters: { userId?: string; action?: string; from?: Date; to?: Date }) {
    const { logs, total } = await this.repo.getAllAuditLogs(page, limit, filters);
    const ids = Array.from(new Set(
      logs.flatMap((l) => [l.userId, l.performedBy]).filter((id): id is string => !!id)
    ));
    const users = await this.repo.getUserEmailsByIds(ids);
    const emailById = new Map(users.map((u) => [u.id, u.email]));
    return {
      logs: logs.map((l) => ({
        ...l,
        userEmail:        l.userId      ? emailById.get(l.userId)      ?? null : null,
        performedByEmail: l.performedBy ? emailById.get(l.performedBy) ?? null : null,
      })),
      total,
    };
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

  updateCampaign(campaignId: string, input: UpdateCampaignInput) {
    return this.campaignService.updateAsAdmin(campaignId, input);
  }

  async setCampaignStatus(campaignId: string, status: CampaignStatus) {
    if (status === 'CLOSED') {
      const campaign = await this.repo.findCampaignForClose(campaignId);
      if (!campaign) throw new AppError('Campaign not found', HttpStatus.NOT_FOUND);

      // Every proposal must be resolved before the event can close: a
      // rejected proposal is already a closed matter, but a pending one
      // still needs a decision and an accepted one still needs its work
      // completed (workStatus COMPLETED) or its payment released — either
      // signals the engagement is actually done.
      const hasUnfinishedProposal = campaign.applications.some((a) =>
        a.status !== 'REJECTED' && a.status !== 'EXPIRED' && a.workStatus !== 'COMPLETED' && a.paymentStatus !== 'RELEASED'
      );
      if (hasUnfinishedProposal) {
        throw new AppError(
          'This event still has proposals that are pending or in progress — every proposal must be completed (or declined) before it can be closed.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    return this.repo.updateCampaignStatus(campaignId, status);
  }

  async approveCampaign(campaignId: string) {
    const campaign = await this.repo.findCampaignForApproval(campaignId);
    if (!campaign) throw new AppError('Campaign not found', HttpStatus.NOT_FOUND);
    if (campaign.status !== 'PENDING_APPROVAL') {
      throw new AppError('Campaign is not pending approval', HttpStatus.BAD_REQUEST);
    }

    const updated = await this.repo.approveCampaign(campaignId);
    const dto = toCampaignDto(updated);
    this.campaignService.fanOutNewCampaign(dto, campaign.business, campaign.business.userId);

    notificationService.create({
      userId:  campaign.business.userId,
      type:    'campaign_approved',
      title:   'Event Approved',
      body:    `Your event "${campaign.title}" has been approved and is now live.`,
      refId:   campaignId,
      refType: 'campaign',
    }).catch(() => {});

    return dto;
  }

  async rejectCampaign(campaignId: string, reason: string) {
    const campaign = await this.repo.findCampaignForApproval(campaignId);
    if (!campaign) throw new AppError('Campaign not found', HttpStatus.NOT_FOUND);
    if (campaign.status !== 'PENDING_APPROVAL') {
      throw new AppError('Campaign is not pending approval', HttpStatus.BAD_REQUEST);
    }

    const updated = await this.repo.updateCampaignStatus(campaignId, 'CANCELLED');

    notificationService.create({
      userId:  campaign.business.userId,
      type:    'campaign_rejected',
      title:   'Event Not Approved',
      body:    `Your event "${campaign.title}" was not approved: ${reason}`,
      refId:   campaignId,
      refType: 'campaign',
    }).catch(() => {});

    return updated;
  }

  // Force-delete — no status guard (unlike setCampaignStatus('CLOSED')
  // above), by design: an admin removing an event should work regardless of
  // whether proposals are pending, accepted, paid, or in progress.
  async deleteCampaign(campaignId: string) {
    const campaign = await this.repo.findCampaignForDeletion(campaignId);
    if (!campaign) throw new AppError('Campaign not found', HttpStatus.NOT_FOUND);
    if (campaign.deletedAt) throw new AppError('Event is already deleted', HttpStatus.BAD_REQUEST);

    const affectedUserIds = campaign.applications.map((a) => a.creator.userId);

    const result = await this.repo.softDeleteCampaignCascade(campaignId);

    if (affectedUserIds.length > 0) {
      notificationService.createMany(
        affectedUserIds.map((userId) => ({
          userId,
          type:    'campaign_deleted',
          title:   'Event removed',
          body:    `"${campaign.title}" was removed by an admin. Any accepted proposals or work for it were removed too.`,
          refId:   campaignId,
          refType: 'campaign',
        })),
      ).catch(() => {});
    }

    return { ...result, title: campaign.title };
  }

  removeUser(userId: string) {
    return this.repo.deleteUser(userId);
  }

  // ── Settings ────────────────────────────────────────────────────────────────

  getSettings() {
    return this.repo.getSettings();
  }

  async updateSettings(settings: Record<string, unknown>) {
    await this.repo.upsertSettings(settings);
    // So a saved change (e.g. a rate-limit max) takes effect immediately
    // rather than waiting out settingsCache's TTL.
    invalidateSettingsCache();
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
    if (!referral) throw new AppError('Referral not found', HttpStatus.NOT_FOUND);
    if (referral.status !== 'PENDING') throw new AppError('Referral is not pending', HttpStatus.BAD_REQUEST);
    if (new Date() > referral.expiresAt) {
      await this.referralRepo.updateReferralStatus(referralId, { status: 'EXPIRED' });
      throw new AppError('Referral has expired', HttpStatus.BAD_REQUEST);
    }

    const referred = await this.referralRepo.findCreatorProfileById(referral.referredId);
    if (!referred) throw new AppError('Referred creator not found', HttpStatus.NOT_FOUND);
    if (!referred.isVerified) throw new AppError('Referred creator is not verified yet', HttpStatus.BAD_REQUEST);
    if (!isCreatorProfileComplete(referred)) throw new AppError('Referred creator profile is not complete yet', HttpStatus.BAD_REQUEST);

    const firstEventCompleted = await this.referralRepo.hasApprovedApplication(referral.referredId);
    if (!firstEventCompleted) throw new AppError('Referred creator has not completed a first event yet', HttpStatus.BAD_REQUEST);

    const updated = await this.referralRepo.updateReferralStatus(referralId, {
      status: 'COMPLETED',
      completedAt: new Date(),
      reviewedBy: adminUserId,
    });

    // Credit the creator wallet ledger — both the referrer's Rs. 500 reward and
    // the referred creator's one-time first-event bonus become real here.
    // Idempotent via WalletTransaction's (referenceId, type) unique index.
    await recordWalletTransactionIdempotent({
      creatorId:        referral.referrerId,
      type:             'REFERRAL_REWARD',
      direction:        'CREDIT',
      amount:           Number(referral.rewardAmount),
      description:      'Referral reward',
      referenceType:    'referral',
      referenceId:      referral.id,
      createdByAdminId: adminUserId,
    });
    await recordWalletTransactionIdempotent({
      creatorId:        referral.referredId,
      type:             'REFERRAL_BONUS',
      direction:        'CREDIT',
      amount:           REFERRED_FIRST_EVENT_BONUS,
      description:      'First event bonus',
      referenceType:    'referral',
      referenceId:      referral.id,
      createdByAdminId: adminUserId,
    });

    return updated;
  }

  // Escrow release is no longer an admin action — the business approving the
  // work now releases the payment straight to the creator's wallet. See
  // CampaignService.releaseEscrowToCreator (called from approveWork).

  async setCreatorVerified(creatorId: string, verified: boolean, adminUserId: string) {
    const updated = await this.repo.updateCreatorVerification(creatorId, verified);

    if (verified) {
      logActivity({ userId: updated.userId, action: ActivityAction.ACCOUNT_VERIFIED, entityType: EntityType.CREATOR_PROFILE, entityId: updated.id, metadata: { profileId: updated.id, profileType: 'creator' } });
    }
    logAudit({
      userId:      updated.userId,
      action:      verified ? AuditAction.VERIFICATION_APPROVED : AuditAction.VERIFICATION_REJECTED,
      performedBy: adminUserId,
      newValue:    { profileId: updated.id, profileType: 'creator', verified },
    });

    if (verified && updated.user) {
      const name = updated.fullName ?? 'there';
      notificationService.create({
        userId:  updated.userId,
        type:    'account_verified',
        title:   "You're verified!",
        body:    'Your creator profile has been verified — a verified badge now appears next to your name.',
        refId:   updated.id,
        refType: 'creator',
      }).catch(() => {});
      sendAccountVerifiedEmail(updated.user.email, name, 'creator').catch(() => {});
    }
    return updated;
  }

  async setCreatorDocumentStatus(creatorId: string, doc: 'citizenship' | 'pan' | 'companyReg', approved: boolean) {
    return this.repo.setCreatorDocumentStatus(creatorId, doc, approved);
  }

  async setBusinessDocumentStatus(businessId: string, doc: 'pan' | 'companyReg' | 'identity', approved: boolean) {
    return this.repo.setBusinessDocumentStatus(businessId, doc, approved);
  }

  async setBusinessVerified(businessId: string, verified: boolean, adminUserId: string) {
    const updated = await this.repo.updateBusinessVerification(businessId, verified);

    if (verified) {
      logActivity({ userId: updated.userId, action: ActivityAction.ACCOUNT_VERIFIED, entityType: EntityType.BUSINESS_PROFILE, entityId: updated.id, metadata: { profileId: updated.id, profileType: 'business' } });
    }
    logAudit({
      userId:      updated.userId,
      action:      verified ? AuditAction.VERIFICATION_APPROVED : AuditAction.VERIFICATION_REJECTED,
      performedBy: adminUserId,
      newValue:    { profileId: updated.id, profileType: 'business', verified },
    });

    if (verified && updated.user) {
      const name = updated.businessName ?? 'there';
      notificationService.create({
        userId:  updated.userId,
        type:    'account_verified',
        title:   "You're verified!",
        body:    'Your business profile has been verified — a verified badge now appears next to your name.',
        refId:   updated.id,
        refType: 'business',
      }).catch(() => {});
      sendAccountVerifiedEmail(updated.user.email, name, 'business').catch(() => {});
    }
    return updated;
  }

  getProviderVerificationQueue(page: number, limit: number) {
    return this.repo.getProviderVerificationQueue(page, limit);
  }

  getBusinessVerificationQueue(page: number, limit: number) {
    return this.repo.getBusinessVerificationQueue(page, limit);
  }

  async rejectCreator(creatorId: string, reason: string, adminUserId: string) {
    const updated = await this.repo.rejectCreatorVerification(creatorId, reason);

    logAudit({
      userId:      updated.userId,
      action:      AuditAction.VERIFICATION_REJECTED,
      performedBy: adminUserId,
      newValue:    { profileId: updated.id, profileType: 'creator', reason },
    });

    if (updated.user) {
      const name = updated.fullName ?? 'there';
      notificationService.create({
        userId:  updated.userId,
        type:    'verification_rejected',
        title:   'Verification not approved',
        body:    `Your verification was not approved: ${reason}`,
        refId:   updated.id,
        refType: 'creator',
      }).catch(() => {});
      sendVerificationRejectedEmail(updated.user.email, name, reason, 'creator').catch(() => {});
    }
    return updated;
  }

  async rejectBusiness(businessId: string, reason: string, adminUserId: string) {
    const updated = await this.repo.rejectBusinessVerification(businessId, reason);

    logAudit({
      userId:      updated.userId,
      action:      AuditAction.VERIFICATION_REJECTED,
      performedBy: adminUserId,
      newValue:    { profileId: updated.id, profileType: 'business', reason },
    });

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
    if (!referral) throw new AppError('Referral not found', HttpStatus.NOT_FOUND);
    if (referral.status !== 'PENDING') throw new AppError('Referral is not pending', HttpStatus.BAD_REQUEST);
    if (new Date() > referral.expiresAt) {
      await this.businessReferralRepo.updateReferralStatus(referralId, { status: 'EXPIRED' });
      throw new AppError('Referral has expired', HttpStatus.BAD_REQUEST);
    }

    const referrer = await this.businessReferralRepo.findBusinessProfileById(referral.referrerId);
    const referred = await this.businessReferralRepo.findBusinessProfileById(referral.referredId);
    if (!referrer || !referred) throw new AppError('Business not found', HttpStatus.NOT_FOUND);

    if (!referred.isVerified) throw new AppError('Referred business is not verified yet', HttpStatus.BAD_REQUEST);
    if (!isBusinessProfileComplete(referred)) throw new AppError('Referred business profile is not complete yet', HttpStatus.BAD_REQUEST);

    const qualifyingCampaign = await this.businessReferralRepo.findQualifyingCampaign(referral.referredId);
    if (!qualifyingCampaign) throw new AppError('Referred business has not published a funded campaign yet', HttpStatus.BAD_REQUEST);
    const ageMs = Date.now() - qualifyingCampaign.createdAt.getTime();
    if (ageMs < REFERRAL_HOLD_DAYS * 24 * 60 * 60 * 1000) {
      throw new AppError(`The funded campaign must be at least ${REFERRAL_HOLD_DAYS} days old before releasing (anti-collusion hold)`, HttpStatus.BAD_REQUEST);
    }

    if (referred.panNo) {
      if (referred.panNo === referrer.panNo) throw new AppError('Referred business shares a PAN/VAT number with the referrer', HttpStatus.BAD_REQUEST);
      const panReused = await this.businessReferralRepo.hasCompletedReferralForPanNo(referred.panNo, referral.referredId);
      if (panReused) throw new AppError('This PAN/VAT number has already collected a referral reward', HttpStatus.BAD_REQUEST);
    }

    const sharedPayout = referred.paymentMethods.length > 0
      && referred.paymentMethods.some((m) => referrer.paymentMethods.includes(m));
    if (sharedPayout) throw new AppError('Referred business shares a payout account with the referrer', HttpStatus.BAD_REQUEST);

    if (referrer.user?.deviceId && referred.user?.deviceId && referrer.user.deviceId === referred.user.deviceId) {
      throw new AppError('Referred business signed up from the same device as the referrer', HttpStatus.BAD_REQUEST);
    }

    return this.businessReferralRepo.updateReferralStatus(referralId, {
      status: 'COMPLETED',
      completedAt: new Date(),
      reviewedBy: adminUserId,
    });
  }

  // ── Payments ────────────────────────────────────────────────────────────────

  async getPayments(page: number, limit: number, type?: string, search?: string) {
    const { transactions, total } = await this.repo.getAllPaymentTransactions(page, limit, type, search);

    // "From"/"To" resolve the platform-as-escrow leg that has no profile of its
    // own — an ESCROW_IN goes business -> platform, a PAYOUT goes platform -> creator.
    const rows = transactions.map((t) => ({
      id:        t.id,
      type:      t.type,
      amount:    t.amount,
      method:    t.method,
      campaign:  t.campaign.title,
      from:      t.type === 'ESCROW_IN' ? (t.business.businessName ?? 'Business') : 'Kolab (Escrow)',
      to:        t.type === 'ESCROW_IN' ? 'Kolab (Escrow)' : (t.creator?.fullName ?? 'Creator'),
      createdAt: t.createdAt,
    }));

    return { transactions: rows, total };
  }

  // ── Disputes (escrow spec §28) ──────────────────────────────────────────────

  async getDisputes(page: number, limit: number, status?: string) {
    return this.repo.listDisputes(page, limit, status);
  }

  async resolveDispute(
    disputeId: string,
    adminUserId: string,
    body: {
      outcome: 'CREATOR_WON' | 'BUSINESS_WON' | 'PARTIAL' | 'DISMISSED';
      note: string;
      creatorAmount?: number;
      businessAmount?: number;
    },
  ) {
    const before = await this.repo.findDisputeById(disputeId);
    if (!before) throw new AppError('Dispute not found', HttpStatus.NOT_FOUND);

    await escrowService.resolveDispute({
      disputeId,
      adminUserId,
      outcome:        body.outcome,
      note:           body.note,
      creatorAmount:  body.creatorAmount,
      businessAmount: body.businessAmount,
    });

    // Admin overrides of the money flow must be audited with the reason (§35).
    logAudit({
      userId:      adminUserId,
      action:      AuditAction.DISPUTE_RESOLVED,
      performedBy: adminUserId,
      oldValue:    { status: before.status },
      newValue:    { status: 'RESOLVED', outcome: body.outcome, note: body.note, creatorAmount: body.creatorAmount, businessAmount: body.businessAmount },
    });

    return this.repo.findDisputeById(disputeId);
  }
}
