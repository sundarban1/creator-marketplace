import { CampaignStatus, ApplicationStatus, CampaignType } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { toCampaignDto, toApplicationDto } from './campaign.dto';
import { BusinessRepository } from '../business/business.repository';
import { CreatorRepository } from '../creator/creator.repository';
import { CampaignRepository } from './campaign.repository';
import { FavoriteRepository } from '../creator/favorite.repository';
import { AdminRepository } from '../admin/admin.repository';
import { notificationService } from '../notifications/notification.service';
import { analyticsService } from '../analytics/analytics.service';
import { MessagingService } from '../messaging/messaging.service';
import { emitToRole } from '../../socket';
import { translateFields, translateMany } from '../../utils/translation';
import {
  sendPaymentSecuredEmail,
  sendWorkStartedEmail,
  sendWorkSubmittedEmail,
  sendWorkApprovedEmail,
  sendRevisionRequestEmail,
  sendEventAcceptedEmail,
  sendCampaignCancelledEmail,
} from '../../utils/email';

const CAMPAIGN_FIELDS = ['title', 'description', 'category', 'goals', 'platforms', 'contentType', 'deliverables', 'paymentType', 'location', 'venue', 'benefits'] as const;

// Once a creator has submitted a proposal, the terms it was submitted against
// (price, platform, deliverables) can no longer change under them — everything
// else (title, description, deadline, status, etc.) can still be edited.
const FIELDS_LOCKED_AFTER_PROPOSALS = ['budgetMin', 'budgetMax', 'platforms', 'deliverables'] as const;

export const MASTER_CATEGORIES: { emoji: string; label: string }[] = [
  { emoji: '🍔', label: 'Food' },
  { emoji: '✈️', label: 'Travel' },
  { emoji: '👗', label: 'Fashion' },
  { emoji: '💄', label: 'Beauty' },
  { emoji: '💪', label: 'Fitness' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '📱', label: 'Tech' },
  { emoji: '📚', label: 'Education' },
  { emoji: '🌟', label: 'Lifestyle' },
  { emoji: '🏠', label: 'Home & Living' },
  { emoji: '🌿', label: 'Wellness' },
  { emoji: '🎵', label: 'Music' },
  { emoji: '🎨', label: 'Art & Design' },
  { emoji: '🐾', label: 'Pets' },
  { emoji: '🧸', label: 'Parenting' },
  { emoji: '🚗', label: 'Automotive' },
  { emoji: '💰', label: 'Finance' },
  { emoji: '🌍', label: 'Sustainability' },
  { emoji: '📷', label: 'Photography' },
  { emoji: '🏋️', label: 'Sports' },
  { emoji: '🎬', label: 'Film & TV' },
  { emoji: '🧘', label: 'Mindfulness' },
  { emoji: '🍷', label: 'Food & Drink' },
  { emoji: '🎪', label: 'Entertainment' },
  { emoji: '🍛', label: 'Restaurant' },
  { emoji: '☕', label: 'Cafe' },
  { emoji: '🏨', label: 'Hotel' },
  { emoji: '🎉', label: 'Events' },
  { emoji: '🛍️', label: 'Retail' },
  { emoji: '🏥', label: 'Healthcare' },
];
import type {
  CreateCampaignInput,
  UpdateCampaignInput,
  CampaignListQuery,
  ApplyToCampaignInput,
} from './campaign.schema';

const messagingService = new MessagingService();

export class CampaignService {
  private repo:         CampaignRepository;
  private businessRepo: BusinessRepository;
  private creatorRepo:  CreatorRepository;
  private favoriteRepo: FavoriteRepository;
  private adminRepo:    AdminRepository;

  constructor() {
    this.repo         = new CampaignRepository();
    this.businessRepo = new BusinessRepository();
    this.creatorRepo  = new CreatorRepository();
    this.favoriteRepo = new FavoriteRepository();
    this.adminRepo    = new AdminRepository();
  }

  // A requested 'ACTIVE' publish is downgraded to 'PENDING_APPROVAL' when the
  // admin has turned off campaign.autoApproval — the event then stays
  // invisible to creators until an admin approves it (see AdminService).
  private async resolvePublishStatus(requested: 'DRAFT' | 'ACTIVE'): Promise<'DRAFT' | 'ACTIVE' | 'PENDING_APPROVAL'> {
    if (requested !== 'ACTIVE') return requested;
    const autoApproval = await this.adminRepo.getSetting('campaign.autoApproval');
    return autoApproval === false ? 'PENDING_APPROVAL' : 'ACTIVE';
  }

  // Broadcasts a newly-live campaign to creators — shared by create(), the
  // publish-a-draft path in update(), and AdminService.approveCampaign().
  fanOutNewCampaign(campaign: ReturnType<typeof toCampaignDto>, business: { id: string; businessName: string | null }, userId: string) {
    analyticsService.incrCampaignPublished(userId);
    emitToRole('CREATOR', 'campaign:new', campaign);

    this.favoriteRepo.getCreatorUserIdsForBusiness(business.id).then((userIds) => {
      if (userIds.length === 0) return;
      const notifications = userIds.map((uid) => ({
        userId:  uid,
        type:    'new_campaign',
        title:   `${business.businessName} posted a new campaign`,
        body:    `${campaign.title} — ${campaign.category}`,
        refId:   campaign.id,
        refType: 'campaign',
      }));
      return notificationService.createMany(notifications);
    }).catch(() => {});
  }

  async create(userId: string, input: CreateCampaignInput) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) {
      throw new AppError('Business profile not found', 404);
    }

    const [resolvedStatus, commissionRate] = await Promise.all([
      this.resolvePublishStatus(input.status),
      this.adminRepo.getSetting('platform.commission').then((v) => Number(v) || 0),
    ]);

    const raw = await this.repo.create({
      businessId: business.id,
      ...input,
      status:     resolvedStatus,
      commissionRate,
      deadline:  new Date(input.deadline),
      eventDate: input.eventDate ? new Date(input.eventDate) : undefined,
    });
    const campaign = toCampaignDto(raw);

    notificationService.createForAdmins({
      type:    'campaign_created',
      title:   '📢 New Event Created',
      body:    `${business.businessName} created "${raw.title}".`,
      refId:   raw.id,
      refType: 'campaign',
    }).catch(() => {});

    if (raw.status === 'ACTIVE') {
      this.fanOutNewCampaign(campaign, business, userId);
    }

    return campaign;
  }

  async list(query: CampaignListQuery, lang = 'en') {
    const { page = 1, limit = 10, ...filters } = query;
    const validatedLimit = Math.min(limit, 50);

    const { campaigns: raw, total } = await this.repo.findMany({
      ...filters,
      page,
      limit: validatedLimit,
    });

    const dtos = raw.map(toCampaignDto);
    const campaigns = await translateMany(dtos, [...CAMPAIGN_FIELDS], lang);
    return { campaigns, total, page, limit: validatedLimit };
  }

  async nearby(query: { lat: number; lng: number; radiusKm: number; page?: number; limit?: number }, lang = 'en') {
    const page  = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 50);

    const { campaigns: raw, total } = await this.repo.findNearby({
      lat: query.lat,
      lng: query.lng,
      radiusKm: query.radiusKm,
      page,
      limit,
    });

    const dtos = raw.map(toCampaignDto);
    const campaigns = await translateMany(dtos, [...CAMPAIGN_FIELDS], lang);
    return { campaigns, total, page, limit };
  }

  async getCategories(): Promise<string[]> {
    return this.repo.getDistinctCategories();
  }

  getMasterCategories(): { emoji: string; label: string }[] {
    return MASTER_CATEGORIES;
  }

  async getPlatforms(): Promise<string[]> {
    return this.repo.getDistinctPlatforms();
  }

  async getById(id: string, lang = 'en') {
    const campaign = await this.repo.findById(id);
    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }
    const dto = toCampaignDto(campaign);
    return translateFields(dto, [...CAMPAIGN_FIELDS], lang);
  }

  async update(id: string, userId: string, input: UpdateCampaignInput) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) {
      throw new AppError('Business profile not found', 404);
    }

    const campaign = await this.repo.findById(id);
    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    if (campaign.businessId !== business.id) {
      throw new AppError('You are not authorized to update this campaign', 403);
    }

    if (campaign._count.applications > 0) {
      for (const field of FIELDS_LOCKED_AFTER_PROPOSALS) {
        if (input[field] !== undefined) {
          throw new AppError(`Cannot change ${field} — proposals have already been submitted for this event`, 400);
        }
      }
    }

    // Publishing a draft (or reactivating a non-active campaign) goes through the
    // same auto-approval gate as a brand-new campaign.
    const resolvedStatus = input.status === 'ACTIVE'
      ? await this.resolvePublishStatus('ACTIVE')
      : input.status;

    const updated = await this.repo.update(id, {
      ...input,
      status:    resolvedStatus,
      deadline:  input.deadline  ? new Date(input.deadline)  : undefined,
      eventDate: input.eventDate ? new Date(input.eventDate) : undefined,
    });

    const dto = toCampaignDto(updated);

    // Same fan-out as a brand-new campaign — only fires once the resolved status
    // actually lands on ACTIVE (i.e. auto-approval didn't downgrade it to pending).
    if (resolvedStatus === 'ACTIVE' && campaign.status !== 'ACTIVE') {
      this.fanOutNewCampaign(dto, business, userId);
    }

    return dto;
  }

  async delete(id: string, userId: string) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) {
      throw new AppError('Business profile not found', 404);
    }

    const campaign = await this.repo.findById(id);
    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    if (campaign.businessId !== business.id) {
      throw new AppError('You are not authorized to delete this campaign', 403);
    }

    await this.repo.delete(id);
    return { message: 'Campaign deleted successfully' };
  }

  async getMyCampaigns(userId: string, page: number, limit: number, lang = 'en', status?: CampaignStatus) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) {
      throw new AppError('Business profile not found', 404);
    }

    const { campaigns: raw, total } = await this.repo.findByBusinessId(business.id, page, Math.min(limit, 50), status);
    const dtos = raw.map(toCampaignDto);
    const campaigns = await translateMany(dtos, [...CAMPAIGN_FIELDS], lang);
    return { campaigns, total, page, limit };
  }

  async apply(campaignId: string, userId: string, input: ApplyToCampaignInput) {
    const creator = await this.creatorRepo.findByUserId(userId);
    if (!creator) {
      throw new AppError('Creator profile not found', 404);
    }

    const campaign = await this.repo.findById(campaignId);
    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    if (campaign.status !== 'ACTIVE') {
      throw new AppError('This campaign is not accepting applications', 400);
    }

    const existingApplication = await this.repo.findApplication(campaignId, creator.id);
    if (existingApplication) {
      throw new AppError('You have already applied to this campaign', 409);
    }

    const isFreeCampaign = (campaign as any).campaignType === 'OPEN_EVENT';
    if (!isFreeCampaign && campaign.budgetMax > 0) {
      if (input.proposedRate < campaign.budgetMin || input.proposedRate > campaign.budgetMax) {
        throw new AppError(
          `Proposed rate must be between Rs. ${campaign.budgetMin.toLocaleString()} and Rs. ${campaign.budgetMax.toLocaleString()}`,
          400,
        );
      }
    }

    const rawApp = await this.repo.createApplication({
      campaignId,
      creatorId: creator.id,
      ...input,
      socialHandles: input.socialHandles as Record<string, string>,
    });
    const application = toApplicationDto(rawApp);

    // Notify the business about the new proposal
    const isFreeEvent = (campaign as any).campaignType === 'OPEN_EVENT';
    this.businessRepo.findById(campaign.businessId).then((business) => {
      if (!business) return;
      analyticsService.incrProposalSubmitted(userId, business.userId);
      return notificationService.create({
        userId:  business.userId,
        type:    'proposal_received',
        title:   isFreeEvent
          ? `🎟️ ${creator.fullName ?? 'A creator'} joined your event`
          : `${creator.fullName ?? 'A creator'} submitted a proposal`,
        body:    isFreeEvent
          ? `${creator.fullName ?? 'A creator'} submitted a participation request for "${campaign.title}". Tap to review.`
          : `${creator.fullName ?? 'A creator'} has submitted a proposal for "${campaign.title}"`,
        refId:   campaign.id,
        refType: isFreeEvent ? 'event' : 'campaign',
      });
    }).catch(() => {});

    notificationService.createForAdmins({
      type:    'proposal_submitted',
      title:   '📝 New Proposal Submitted',
      body:    `${creator.fullName ?? 'A creator'} applied to "${campaign.title}".`,
      refId:   campaign.id,
      refType: isFreeEvent ? 'event' : 'campaign',
    }).catch(() => {});

    return application;
  }

  async getCampaignApplications(campaignId: string, userId: string, page: number, limit: number) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) {
      throw new AppError('Business profile not found', 404);
    }

    const campaign = await this.repo.findById(campaignId);
    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    if (campaign.businessId !== business.id) {
      throw new AppError('You are not authorized to view these applications', 403);
    }

    const { applications: raw, total } = await this.repo.findApplicationsByCampaign(
      campaignId,
      page,
      Math.min(limit, 50)
    );

    return { applications: raw.map(toApplicationDto), total, page, limit };
  }

  async getBusinessApplications(
    userId: string,
    page: number,
    limit: number,
    status?: ApplicationStatus,
    campaignType?: CampaignType,
  ) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) throw new AppError('Business profile not found', 404);
    const { applications: raw, total } = await this.repo.findApplicationsByBusinessId(
      business.id, page, Math.min(limit, 100), status, campaignType
    );
    return { applications: raw.map(toApplicationDto), total, page, limit };
  }

  async acceptApplication(campaignId: string, appId: string, userId: string) {
    return this.updateApplicationStatus(campaignId, appId, userId, 'ACCEPTED');
  }

  async rejectApplication(campaignId: string, appId: string, userId: string) {
    return this.updateApplicationStatus(campaignId, appId, userId, 'REJECTED');
  }

  private async updateApplicationStatus(
    campaignId: string,
    appId: string,
    userId: string,
    status: 'ACCEPTED' | 'REJECTED'
  ) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) throw new AppError('Business profile not found', 404);

    const campaign = await this.repo.findById(campaignId);
    if (!campaign) throw new AppError('Campaign not found', 404);
    if (campaign.businessId !== business.id) throw new AppError('Not authorized', 403);

    const application = await this.repo.findApplicationById(appId);
    if (!application) throw new AppError('Application not found', 404);
    if (application.campaignId !== campaignId) throw new AppError('Application does not belong to this campaign', 400);

    const rawUpdated = await this.repo.updateApplicationStatus(appId, status);
    const updated    = toApplicationDto(rawUpdated);

    // Capacity enforcement for OPEN_EVENT (uses capacity field)
    if (status === 'ACCEPTED') {
      const campaignCapacity = (campaign as any).capacity as number | null;
      if (campaignCapacity != null) {
        const acceptedCount = await this.repo.countAcceptedApplications(campaignId);
        if (acceptedCount >= campaignCapacity) {
          const rejected = await this.repo.rejectPendingApplications(campaignId, appId);
          await this.repo.closeCampaign(campaignId);
          if (rejected.length > 0) {
            notificationService.createMany(
              rejected.map((a) => ({
                userId:  a.creator.userId,
                type:    'campaign_closed' as const,
                title:   `"${campaign.title}" is now full`,
                body:    'This event has reached its creator capacity.',
                refId:   campaign.id,
                refType: 'event',
              }))
            ).catch(() => {});
          }
        }
      }
    }

    // Capacity enforcement for PAID_CAMPAIGN (uses creatorsNeeded field)
    if (status === 'ACCEPTED' && (campaign as any).campaignType === 'PAID_CAMPAIGN') {
      const needed: number = ((campaign as any).creatorsNeeded as number) ?? 1;
      const acceptedCount = await this.repo.countAcceptedApplications(campaignId);
      if (acceptedCount >= needed) {
        const rejected = await this.repo.rejectPendingApplications(campaignId, appId);
        await this.repo.closeCampaign(campaignId);
        if (rejected.length > 0) {
          notificationService.createMany(
            rejected.map((a) => ({
              userId:  a.creator.userId,
              type:    'campaign_closed' as const,
              title:   `"${campaign.title}" is now full`,
              body:    'All creator slots for this campaign have been filled.',
              refId:   campaign.id,
              refType: 'campaign',
            }))
          ).catch(() => {});
        }
      }
    }

    const isFreeEvent = (campaign as any).campaignType === 'OPEN_EVENT';
    const creatorUserId = application.creator?.userId as string | undefined;

    if (creatorUserId) {
      if (status === 'ACCEPTED') {
        analyticsService.incrProposalAccepted(creatorUserId, application.creatorId, business.userId, business.id, appId);

        // Auto-start (or resume) the chat with a greeting — the creator never has to send a request.
        // Always sent, even if the two were already chatting, so the creator gets a clear
        // heads-up for this specific proposal/event.
        const greetingName = application.creator?.fullName ?? 'there';
        const greeting = `Hello ${greetingName}, your proposal for "${campaign.title}" has been accepted. You can message me here for more information or if you have any questions. It will be great working with you. Thank you!`;
        messagingService
          .sendProposalAcceptedMessage(application.creatorId, business.id, campaignId, business.userId, greeting)
          .catch(() => {});
      } else {
        analyticsService.incrProposalRejected(creatorUserId);
      }
    }

    if (isFreeEvent) {
      // Free event: only notify + email on ACCEPTED; silently decline
      if (status === 'ACCEPTED' && creatorUserId) {
        notificationService.create({
          userId:  creatorUserId,
          type:    'proposal_accepted',
          title:   `🎉 You're accepted for "${campaign.title}"!`,
          body:    `${business.businessName} accepted your proposal. Tap to view the event details.`,
          refId:   campaign.id,
          refType: 'event',
        }).catch(() => {});

        this.repo.getUserEmails([creatorUserId]).then(async (emailMap) => {
          const email = emailMap.get(creatorUserId);
          if (email) {
            await sendEventAcceptedEmail(
              email,
              application.creator?.fullName ?? 'Creator',
              campaign.title,
              business.businessName ?? 'Brand',
              (campaign as any).eventDate ?? null,
              (campaign as any).venue ?? null,
              Array.isArray((campaign as any).benefits) ? (campaign as any).benefits : [],
            );
          }
        }).catch(() => {});
      }
    } else {
      // Paid campaign: notify creator on both accept and reject
      if (creatorUserId) {
        const type  = status === 'ACCEPTED' ? 'proposal_accepted' : 'proposal_rejected';
        const title = status === 'ACCEPTED'
          ? `🎉 Your proposal was accepted!`
          : `Proposal update for "${campaign.title}"`;
        const body  = status === 'ACCEPTED'
          ? `Congratulations! ${business.businessName} accepted your proposal for "${campaign.title}". Payment is expected within 24 hours.`
          : `${business.businessName} has reviewed your proposal for "${campaign.title}".`;

        notificationService.create({
          userId:  creatorUserId,
          type,
          title,
          body,
          refId:   campaign.id,
          refType: 'campaign',
        }).catch(() => {});
      }

      // Notify other pending applicants that the spot is filled
      if (status === 'ACCEPTED') {
        this.repo.findPendingApplicationsByCampaign(campaignId, appId).then((others) => {
          if (others.length === 0) return;
          return notificationService.createMany(
            others.map((a) => ({
              userId:  a.creator.userId,
              type:    'campaign_closed' as const,
              title:   `"${campaign.title}" is no longer accepting proposals`,
              body:    `${business.businessName} has selected a creator for this campaign. Thank you for applying!`,
              refId:   campaign.id,
              refType: 'campaign',
            })),
          );
        }).catch(() => {});
      }
    }

    return updated;
  }

  async getMyApplications(userId: string, page: number, limit: number, status?: ApplicationStatus) {
    const creator = await this.creatorRepo.findByUserId(userId);
    if (!creator) {
      throw new AppError('Creator profile not found', 404);
    }

    const { applications: raw, total } = await this.repo.findApplicationsByCreator(
      creator.id,
      page,
      Math.min(limit, 50),
      status,
    );

    return { applications: raw.map(toApplicationDto), total, page, limit };
  }

  async payForCampaign(campaignId: string, userId: string, method: string) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) throw new AppError('Business profile not found', 404);

    const campaign = await this.repo.findById(campaignId);
    if (!campaign) throw new AppError('Campaign not found', 404);
    if (campaign.businessId !== business.id) throw new AppError('Not authorized', 403);
    if (campaign.paymentStatus === 'PAID' || campaign.paymentStatus === 'RELEASED') {
      throw new AppError('Payment already made for this campaign', 400);
    }

    const updated = await this.repo.payForCampaign(campaignId, method);

    // Notify + email accepted creator
    this.repo.findApplicationsByCampaign(campaignId, 1, 50).then(async ({ applications }) => {
      const accepted = applications.find((a) => a.status === 'ACCEPTED');
      if (!accepted) return;
      const creatorUserId = (accepted.creator as any).userId as string;
      await notificationService.create({
        userId:  creatorUserId,
        type:    'payment_released',
        title:   '💰 Payment Secured!',
        body:    `${business.businessName} secured payment for "${campaign.title}". Tap to start creating!`,
        refId:   campaignId,
        refType: 'campaign',
      });
      const emailMap = await this.repo.getUserEmails([creatorUserId]);
      const creatorEmail = emailMap.get(creatorUserId);
      if (creatorEmail) {
        sendPaymentSecuredEmail(
          creatorEmail,
          (accepted.creator as any).fullName ?? 'Creator',
          campaign.title,
          business.businessName ?? 'Brand',
          campaign.budgetMin,
        ).catch(() => {});
      }
    }).catch(() => {});

    return toCampaignDto(updated);
  }

  async payForApplication(appId: string, userId: string) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) throw new AppError('Business profile not found', 404);

    const application = await this.repo.findApplicationById(appId);
    if (!application) throw new AppError('Application not found', 404);

    const campaign = await this.repo.findById(application.campaignId);
    if (!campaign) throw new AppError('Campaign not found', 404);
    if (campaign.businessId !== business.id) throw new AppError('Not authorized', 403);
    if (application.status !== 'ACCEPTED') throw new AppError('Creator must be accepted first', 400);

    await this.repo.payForApplication(appId);

    // Notify creator
    const creatorUserId = (application.creator as any)?.userId as string | undefined;
    if (creatorUserId) {
      analyticsService.incrPaymentPaid(creatorUserId, application.proposedRate);
      notificationService.create({
        userId:  creatorUserId,
        type:    'payment_released',
        title:   `💰 Payment secured for "${campaign.title}"`,
        body:    `${business.businessName} has made the payment. You can now start creating content!`,
        refId:   application.campaignId,
        refType: 'campaign',
      }).catch(() => {});
    }

    return { success: true };
  }

  async startWork(appId: string, userId: string) {
    const creator = await this.creatorRepo.findByUserId(userId);
    if (!creator) throw new AppError('Creator profile not found', 404);

    const app = await this.repo.findApplicationById(appId);
    if (!app) throw new AppError('Application not found', 404);
    if (app.creatorId !== creator.id) throw new AppError('Not authorized', 403);
    if (app.status !== 'ACCEPTED') throw new AppError('Application is not accepted', 400);
    if ((app as any).paymentStatus !== 'PAID') throw new AppError('Payment not yet secured', 400);

    const updated = await this.repo.startWork(appId);
    analyticsService.incrCampaignStarted(userId);

    // Notify + email business
    const businessUserId = app.campaign.business.userId;
    notificationService.create({
      userId:  businessUserId,
      type:    'proposal_received',
      title:   '🚀 Creator Started Working!',
      body:    `${creator.fullName ?? 'Creator'} has started working on "${app.campaign.title}".`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch(() => {});

    this.repo.getUserEmails([businessUserId]).then((emailMap) => {
      const email = emailMap.get(businessUserId);
      if (email) {
        sendWorkStartedEmail(email, app.campaign.business.businessName ?? 'Brand', app.campaign.title, creator.fullName ?? 'Creator').catch(() => {});
      }
    }).catch(() => {});

    return toApplicationDto(updated);
  }

  async submitWork(appId: string, userId: string, data: { note?: string; urls?: string }) {
    const creator = await this.creatorRepo.findByUserId(userId);
    if (!creator) throw new AppError('Creator profile not found', 404);

    const app = await this.repo.findApplicationById(appId);
    if (!app) throw new AppError('Application not found', 404);
    if (app.creatorId !== creator.id) throw new AppError('Not authorized', 403);
    if (app.status !== 'ACCEPTED') throw new AppError('Application is not accepted', 400);

    const updated = await this.repo.submitWork(appId, data);

    const businessUserId = app.campaign.business.userId;
    notificationService.create({
      userId:  businessUserId,
      type:    'proposal_received',
      title:   '📤 Work Submitted for Review',
      body:    `${creator.fullName ?? 'Creator'} submitted deliverables for "${app.campaign.title}". Review within 5 days.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch(() => {});

    this.repo.getUserEmails([businessUserId]).then((emailMap) => {
      const email = emailMap.get(businessUserId);
      if (email) {
        sendWorkSubmittedEmail(email, app.campaign.business.businessName ?? 'Brand', app.campaign.title, creator.fullName ?? 'Creator', data.urls).catch(() => {});
      }
    }).catch(() => {});

    return toApplicationDto(updated);
  }

  async approveWork(appId: string, userId: string) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) throw new AppError('Business profile not found', 404);

    const app = await this.repo.findApplicationById(appId);
    if (!app) throw new AppError('Application not found', 404);
    if (app.campaign.business.id !== business.id) throw new AppError('Not authorized', 403);
    if (app.workStatus !== 'SUBMITTED') throw new AppError('Work has not been submitted yet', 400);

    const updated = await this.repo.approveWork(appId);
    // Payment is no longer auto-released on approval — an admin must
    // manually release the held escrow amount (see admin.service.releasePayment).

    const creatorUserId = app.creator.userId;
    notificationService.create({
      userId:  creatorUserId,
      type:    'work_approved',
      title:   '🎉 Your project has been approved!',
      body:    `${business.businessName} approved your work for "${app.campaign.title}". Payment will be released by admin now on your wallet.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch(() => {});

    notificationService.createForAdmins({
      type:    'payment_release_pending',
      title:   '💰 Payment release needed',
      body:    `${business.businessName} approved ${app.creator.fullName ?? 'a creator'}'s work for "${app.campaign.title}" — release the payment when ready.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch(() => {});

    this.repo.getUserEmails([creatorUserId]).then((emailMap) => {
      const email = emailMap.get(creatorUserId);
      if (email) {
        sendWorkApprovedEmail(email, app.creator.fullName ?? 'Creator', app.campaign.title, app.proposedRate).catch(() => {});
      }
    }).catch(() => {});

    return toApplicationDto(updated);
  }

  async requestRevision(appId: string, userId: string, note: string) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) throw new AppError('Business profile not found', 404);

    const app = await this.repo.findApplicationById(appId);
    if (!app) throw new AppError('Application not found', 404);
    if (app.campaign.business.id !== business.id) throw new AppError('Not authorized', 403);
    if (app.workStatus !== 'SUBMITTED') throw new AppError('Work has not been submitted yet', 400);

    const updated = await this.repo.requestRevision(appId, note);

    const creatorUserId = app.creator.userId;
    notificationService.create({
      userId:  creatorUserId,
      type:    'proposal_received',
      title:   '✏️ Revision Requested',
      body:    `${business.businessName} requested changes for "${app.campaign.title}". Check the notes.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch(() => {});

    this.repo.getUserEmails([creatorUserId]).then((emailMap) => {
      const email = emailMap.get(creatorUserId);
      if (email) {
        sendRevisionRequestEmail(email, app.creator.fullName ?? 'Creator', app.campaign.title, note).catch(() => {});
      }
    }).catch(() => {});

    return toApplicationDto(updated);
  }

  async cancelCampaign(campaignId: string, userId: string) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) throw new AppError('Business profile not found', 404);

    const campaign = await this.repo.findById(campaignId);
    if (!campaign) throw new AppError('Campaign not found', 404);
    if (campaign.businessId !== business.id) throw new AppError('Not authorized', 403);

    const updated = await this.repo.cancelCampaign(campaignId);

    // Notify all accepted creators
    this.repo.findApplicationsByCampaign(campaignId, 1, 50).then(async ({ applications }) => {
      const accepted = applications.filter((a) => a.status === 'ACCEPTED');
      for (const app of accepted) {
        const creatorUserId = (app.creator as any).userId as string;
        const wasPaid = campaign.paymentStatus === 'PAID';
        const refundNote = wasPaid
          ? 'A partial refund (80% of payment) will be processed to your original payment method within 3–5 business days. The 20% deduction covers the platform cancellation fee.'
          : undefined;

        await notificationService.create({
          userId:  creatorUserId,
          type:    'campaign_closed',
          title:   'Campaign Cancelled',
          body:    `${business.businessName} cancelled "${campaign.title}".${wasPaid ? ' A partial refund is being processed.' : ''}`,
          refId:   campaignId,
          refType: 'campaign',
        });

        const emailMap = await this.repo.getUserEmails([creatorUserId]);
        const email = emailMap.get(creatorUserId);
        if (email) {
          sendCampaignCancelledEmail(email, (app.creator as any).fullName ?? 'Creator', campaign.title, true, refundNote).catch(() => {});
        }
      }
    }).catch(() => {});

    return toCampaignDto(updated);
  }
}
