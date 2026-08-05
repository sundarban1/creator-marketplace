import { CampaignStatus, ApplicationStatus, CampaignType } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'crypto';
import { AppError } from '../../middleware/error';
import { toCampaignDto, toApplicationDto, type DeliverableVideo, type DeliverableFile } from './campaign.dto';
import { generateVideoUploadSignature, videoThumbnailUrl, videoPlaybackUrl, deleteVideo, MAX_VIDEO_SIZE_BYTES, uploadImage as uploadImageToCloudinary, uploadRawFile, deleteImage, deleteRawFile } from '../../utils/cloudinary';
import { BusinessRepository } from '../business/business.repository';
import { CreatorRepository } from '../creator/creator.repository';
import { CampaignRepository } from './campaign.repository';
import { FavoriteRepository } from '../creator/favorite.repository';
import { AdminRepository } from '../admin/admin.repository';
import { notificationService } from '../notifications/notification.service';
import { contractService } from '../contract/contract.service';
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

// MP4 (H.264/AAC) is preferred; MOV is accepted and delivered as MP4 via
// videoPlaybackUrl. Mirrors messaging.service.ts's same allow-list.
const ALLOWED_DELIVERABLE_VIDEO_FORMATS = new Set(['mp4', 'mov', 'qt']);

// Non-destructive cap, not the avatar-style 400x400 face-crop — these are
// arbitrary content photos, not portraits. Mirrors messaging.service.ts's
// ATTACHMENT_IMAGE_TRANSFORMATION for chat image attachments.
const DELIVERABLE_IMAGE_TRANSFORMATION = [{ width: 1600, crop: 'limit' }];

// Deliverable *files* (images/PDF/DOCX) store their publicId bare, e.g.
// `deliverable_<appId>_...` — unlike deliverable *videos*, which capture
// Cloudinary's own response and so already hold the full folder-qualified
// id. uploadImage/uploadRawFile only ever hand back the secure_url, not
// Cloudinary's public_id, so every delete call for a file needs this prefix
// reconstructed by hand to match what Cloudinary actually stored the asset
// under — passing the bare id silently no-ops (caught by .catch(() => {})),
// leaking the asset in Cloudinary forever. (Live-verified: production had
// orphaned deliverable assets going back days from this exact gap.)
const DELIVERABLE_FILE_FOLDER = 'campaigns/deliverables';
function deliverableFileCloudinaryId(publicId: string): string {
  return `${DELIVERABLE_FILE_FOLDER}/${publicId}`;
}

// Once a creator has submitted a proposal, the terms it was submitted against
// (price, platform, deliverables) can no longer change under them — everything
// else (title, description, deadline, status, etc.) can still be edited.
const FIELDS_LOCKED_AFTER_PROPOSALS = ['budgetMin', 'budgetMax', 'platforms', 'deliverables'] as const;

export const MASTER_CATEGORIES: { label: string }[] = [
  { label: 'Food' },
  { label: 'Travel' },
  { label: 'Fashion' },
  { label: 'Beauty' },
  { label: 'Fitness' },
  { label: 'Gaming' },
  { label: 'Tech' },
  { label: 'Education' },
  { label: 'Lifestyle' },
  { label: 'Home & Living' },
  { label: 'Wellness' },
  { label: 'Music' },
  { label: 'Art & Design' },
  { label: 'Pets' },
  { label: 'Parenting' },
  { label: 'Automotive' },
  { label: 'Finance' },
  { label: 'Sustainability' },
  { label: 'Photography' },
  { label: 'Sports' },
  { label: 'Film & TV' },
  { label: 'Mindfulness' },
  { label: 'Food & Drink' },
  { label: 'Entertainment' },
  { label: 'Restaurant' },
  { label: 'Cafe' },
  { label: 'Hotel' },
  { label: 'Events' },
  { label: 'Retail' },
  { label: 'Healthcare' },
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

  // Admin-configured free-feature allowance for a business, how many it's
  // already used, and the price to feature beyond that (no charge is taken
  // yet — payment isn't wired up, this is purely informational/for the lock
  // in the mobile create-event UI). Drafts don't consume quota — see
  // CampaignRepository.countFeaturedCampaigns.
  async getFeaturedQuota(userId: string) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) throw new AppError('Business profile not found', 404);

    const [freeQuotaSetting, priceSetting, unlimitedEmailsSetting, used] = await Promise.all([
      this.adminRepo.getSetting('featuredEvent.freeQuota'),
      this.adminRepo.getSetting('featuredEvent.price'),
      this.adminRepo.getSetting('featuredEvent.unlimitedEmails'),
      this.repo.countFeaturedCampaigns(business.id),
    ]);
    const freeQuota = Number(freeQuotaSetting) || 0;
    const price     = Number(priceSetting) || 0;
    const unlimitedEmails = Array.isArray(unlimitedEmailsSetting) ? unlimitedEmailsSetting as string[] : [];
    const unlimited = unlimitedEmails.some((e) => e.toLowerCase() === business.user.email.toLowerCase());
    // A large finite sentinel, not Infinity — Infinity serializes to `null`
    // over JSON, which would break every `remaining > 0` / `<= 0` check that
    // already exists downstream (create(), the mobile lock/paywall UI).
    const remaining = unlimited ? Number.MAX_SAFE_INTEGER : Math.max(0, freeQuota - used);

    return { freeQuota, used, remaining, price, unlimited };
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

  // Two admin-configurable anti-abuse gates on event creation: a rolling
  // per-day cap (any business) and a cooldown on brand-new business accounts
  // (anti-fraud — a business shouldn't be able to post a scam event seconds
  // after signing up). Both fail open (skip the check) if their setting is
  // disabled, and both read the business's own createdAt/id rather than the
  // user's, since a BusinessProfile is created atomically with its User at
  // signup (see AuthService.register). Neither applies to a DRAFT save —
  // drafts aren't live content reaching anyone, matching the existing
  // countFeaturedCampaigns convention of excluding drafts from quota checks.
  private async assertCampaignCreationAllowed(business: { id: string; createdAt: Date }, requestedStatus: 'DRAFT' | 'ACTIVE'): Promise<void> {
    if (requestedStatus === 'DRAFT') return;

    const [cooldownEnabled, cooldownHours, capEnabled, maxPerDay] = await Promise.all([
      this.adminRepo.getSetting('rateLimit.newAccountCooldown.enabled'),
      this.adminRepo.getSetting('rateLimit.newAccountCooldown.hours').then((v) => Number(v) || 24),
      this.adminRepo.getSetting('rateLimit.campaignCreation.enabled'),
      this.adminRepo.getSetting('rateLimit.campaignCreation.maxPerDay').then((v) => Number(v) || 5),
    ]);

    if (cooldownEnabled !== false) {
      const cooldownMs = cooldownHours * 60 * 60 * 1000;
      const accountAgeMs = Date.now() - business.createdAt.getTime();
      if (accountAgeMs < cooldownMs) {
        const hoursLeft = Math.ceil((cooldownMs - accountAgeMs) / (60 * 60 * 1000));
        throw new AppError(`New accounts must wait ${cooldownHours}h before creating an event. Please try again in about ${hoursLeft}h.`, 403);
      }
    }

    if (capEnabled !== false) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const createdToday = await this.repo.countCampaignsCreatedSince(business.id, startOfDay);
      if (createdToday >= maxPerDay) {
        throw new AppError(`You've reached the limit of ${maxPerDay} events created per day. Please try again tomorrow.`, 429);
      }
    }
  }

  async create(userId: string, input: CreateCampaignInput) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) {
      throw new AppError('Business profile not found', 404);
    }

    await this.assertCampaignCreationAllowed(business, input.status);

    const [resolvedStatus, commissionRate, featuredAllowed] = await Promise.all([
      this.resolvePublishStatus(input.status),
      this.adminRepo.getSetting('platform.commission').then((v) => Number(v) || 0),
      // No payment flow yet, so a request to feature beyond the free quota
      // is silently downgraded rather than rejected — the mobile UI already
      // disables the toggle once quota hits 0, this is just the backstop.
      input.isFeatured ? this.getFeaturedQuota(userId).then((q) => q.remaining > 0) : Promise.resolve(true),
    ]);

    const raw = await this.repo.create({
      businessId: business.id,
      ...input,
      isFeatured: input.isFeatured && featuredAllowed,
      status:     resolvedStatus,
      commissionRate,
      deadline:  new Date(input.deadline),
      eventDate: input.eventDate ? new Date(input.eventDate) : undefined,
    });
    const campaign = toCampaignDto(raw);

    notificationService.createForAdmins({
      type:    'campaign_created',
      title:   'New Event Created',
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

  async nearby(query: {
    lat: number; lng: number; radiusKm: number; page?: number; limit?: number;
    search?: string; category?: string[]; platform?: string[];
  }, lang = 'en') {
    const page  = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 50);

    const { campaigns: raw, total } = await this.repo.findNearby({
      lat: query.lat,
      lng: query.lng,
      radiusKm: query.radiusKm,
      page,
      limit,
      search: query.search,
      category: query.category,
      platform: query.platform,
    });

    const dtos = raw.map(toCampaignDto);
    const campaigns = await translateMany(dtos, [...CAMPAIGN_FIELDS], lang);
    return { campaigns, total, page, limit };
  }

  async getCategories(): Promise<string[]> {
    return this.repo.getDistinctCategories();
  }

  getMasterCategories(): { label: string }[] {
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

    // A campaign can only be manually closed once every proposal on it has
    // been resolved — declined, or accepted and marked COMPLETED. This is
    // what actually takes it out of the creator-facing (ACTIVE-only) listing.
    if (input.status === 'CLOSED' && campaign.status !== 'CLOSED') {
      const unresolved = await this.repo.countUnresolvedApplications(id);
      if (unresolved > 0) {
        throw new AppError('Cannot close this event — some proposals are still pending or in progress', 400);
      }
    }

    // Pausing is less strict than closing — a merely pending applicant or an
    // accepted-but-not-yet-started proposal doesn't block it, but a creator
    // actively mid-work (IN_PROGRESS/SUBMITTED) shouldn't get interrupted.
    if (input.status === 'PAUSED' && campaign.status !== 'PAUSED') {
      const activeWork = await this.repo.countActiveWorkApplications(id);
      if (activeWork > 0) {
        throw new AppError('Cannot pause this event — a creator is actively working on an accepted proposal', 400);
      }
    }

    // Publishing a draft (or reactivating a non-active campaign) goes through the
    // same auto-approval gate as a brand-new campaign.
    const resolvedStatus = input.status === 'ACTIVE'
      ? await this.resolvePublishStatus('ACTIVE')
      : input.status;

    // Same free-quota gate as create() — without this, a business could
    // create a campaign unfeatured (no quota check needed there) and then
    // flip Featured on via edit to bypass the limit indefinitely. Only
    // checked when actually turning it on; a campaign that's already
    // featured keeps its slot for free (countFeaturedCampaigns already
    // counts it, so remaining wouldn't need to cover it again).
    let resolvedIsFeatured = input.isFeatured;
    if (input.isFeatured === true && !campaign.isFeatured) {
      const quota = await this.getFeaturedQuota(userId);
      resolvedIsFeatured = quota.remaining > 0;
    }

    const updated = await this.repo.update(id, {
      ...input,
      isFeatured: resolvedIsFeatured,
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

  // Admin correction of any event — unlike update(), this skips the business-owner
  // check (an admin isn't the owner) and the FIELDS_LOCKED_AFTER_PROPOSALS gate
  // (an admin may need to fix budget/platforms/deliverables even after creators
  // have already applied). The close/pause integrity guards and publish fan-out
  // still apply since those protect data consistency, not brand-editing rights.
  async updateAsAdmin(id: string, input: UpdateCampaignInput) {
    const campaign = await this.repo.findById(id);
    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    if (input.status === 'CLOSED' && campaign.status !== 'CLOSED') {
      const unresolved = await this.repo.countUnresolvedApplications(id);
      if (unresolved > 0) {
        throw new AppError('Cannot close this event — some proposals are still pending or in progress', 400);
      }
    }

    if (input.status === 'PAUSED' && campaign.status !== 'PAUSED') {
      const activeWork = await this.repo.countActiveWorkApplications(id);
      if (activeWork > 0) {
        throw new AppError('Cannot pause this event — a creator is actively working on an accepted proposal', 400);
      }
    }

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

    if (resolvedStatus === 'ACTIVE' && campaign.status !== 'ACTIVE') {
      const business = await this.businessRepo.findById(campaign.businessId);
      if (business) this.fanOutNewCampaign(dto, business, business.userId);
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

  // Admin-configurable anti-abuse gate: caps how many proposals a single creator
  // can submit per calendar day (UTC), across all campaigns. Fails open (skip the
  // check) if the setting is disabled. Every submission counts toward the cap
  // regardless of the application's later status (pending/accepted/rejected).
  private async assertProposalSubmissionAllowed(creatorId: string): Promise<void> {
    const [enabled, maxPerDay] = await Promise.all([
      this.adminRepo.getSetting('rateLimit.proposalSubmission.enabled'),
      this.adminRepo.getSetting('rateLimit.proposalSubmission.maxPerDay').then((v) => Number(v) || 10),
    ]);

    if (enabled === false) return;

    const startOfDayUtc = new Date();
    startOfDayUtc.setUTCHours(0, 0, 0, 0);
    const submittedToday = await this.repo.countApplicationsCreatedSince(creatorId, startOfDayUtc);
    if (submittedToday >= maxPerDay) {
      throw new AppError(`You've reached the limit of ${maxPerDay} proposals submitted per day. Please try again tomorrow.`, 429);
    }
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

    await this.assertProposalSubmissionAllowed(creator.id);

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

    // Freeze the contract terms at submission time (paid campaigns only — a free
    // event has no price/deliverable-for-payment exchange to put under agreement).
    // Creator's e-signature (see submit-proposal.tsx, which gates this call behind
    // the contract modal's "I Agree" button) is implicit in successfully applying.
    // Awaited (not fire-and-forget) since a proposal without a contract would leave
    // the business with nothing to review/sign when they accept.
    const business = await this.businessRepo.findById(campaign.businessId);
    if (business && !isFreeCampaign) {
      await contractService.createForApplication({
        applicationId: application.id,
        campaign,
        business,
        creator,
        proposedRate: input.proposedRate,
        timeline:     input.timeline,
      });
    }

    // Notify the business about the new proposal
    const isFreeEvent = (campaign as any).campaignType === 'OPEN_EVENT';
    if (business) {
      analyticsService.incrProposalSubmitted(userId, business.userId);
      notificationService.create({
        userId:  business.userId,
        type:    'proposal_received',
        title:   isFreeEvent
          ? `${creator.fullName ?? 'A creator'} joined your event`
          : `${creator.fullName ?? 'A creator'} submitted a proposal`,
        body:    isFreeEvent
          ? `${creator.fullName ?? 'A creator'} submitted a participation request for "${campaign.title}". Tap to review.`
          : `${creator.fullName ?? 'A creator'} has submitted a proposal for "${campaign.title}"`,
        refId:   campaign.id,
        refType: isFreeEvent ? 'event' : 'campaign',
      }).catch(() => {});
    }

    notificationService.createForAdmins({
      type:    'proposal_submitted',
      title:   'New Proposal Submitted',
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

    // Business's e-signature (see campaign-proposals.tsx, which gates the accept
    // call behind the contract modal's "I Agree" button) — completes the
    // agreement and generates the downloadable PDF. Paid campaigns only; free
    // events never had a contract created for them in apply() above.
    if (status === 'ACCEPTED' && (campaign as any).campaignType === 'PAID_CAMPAIGN') {
      await contractService.signAsBusiness(appId, business.id);
    }

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
          title:   `You're accepted for "${campaign.title}"!`,
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
          ? `Your proposal was accepted!`
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
        title:   'Payment Secured!',
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
    await this.repo.createEscrowTransaction({
      applicationId: appId,
      campaignId:    application.campaignId,
      businessId:    business.id,
      creatorId:     application.creatorId,
      amount:        application.proposedRate,
    });

    // Notify creator
    const creatorUserId = (application.creator as any)?.userId as string | undefined;
    if (creatorUserId) {
      analyticsService.incrPaymentPaid(creatorUserId, application.proposedRate);
      notificationService.create({
        userId:  creatorUserId,
        type:    'payment_released',
        title:   `Payment secured for "${campaign.title}"`,
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
      type:    'work_started',
      title:   'Creator Started Working!',
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
      type:    'work_submitted',
      title:   'Work Submitted for Review',
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
      title:   'Your project has been approved!',
      body:    `${business.businessName} approved your work for "${app.campaign.title}". Payment will be released by admin now on your wallet.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch(() => {});

    notificationService.createForAdmins({
      type:    'payment_release_pending',
      title:   'Payment release needed',
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

    const existingVideos = await this.repo.getDeliverableVideos(appId);

    const updated = await this.repo.requestRevision(appId, note);

    // Send the revision note as a chat message, followed by a copy of each
    // currently-submitted video (see sendRevisionRequestMessage) — awaited
    // here, before the Cloudinary cleanup below, so the creator's in-chat
    // copy is dispatched with URLs that are still live rather than racing
    // the deletion below.
    await messagingService
      .sendRevisionRequestMessage(app.creatorId, business.id, app.campaignId, userId, note, existingVideos)
      .catch(() => {});

    // Videos are appended (capped at 3), not wholesale-replaced like
    // deliverableUrls — without clearing them here, a creator who filled all
    // 3 slots in this round would have zero slots left for the revised
    // submission. Delete the Cloudinary assets too so they don't linger
    // unreferenced; best-effort, matching this file's existing notification/
    // email error-swallowing convention.
    await Promise.all(existingVideos.map((v) => deleteVideo(v.publicId))).catch(() => {});
    if (existingVideos.length > 0) await this.repo.clearDeliverableVideos(appId);

    // Same reasoning as the video block above, for images/PDF/DOCX.
    const existingFiles = await this.repo.getDeliverableFiles(appId);
    await Promise.all(existingFiles.map((f) => (f.fileType === 'IMAGE' ? deleteImage(deliverableFileCloudinaryId(f.publicId)) : deleteRawFile(deliverableFileCloudinaryId(f.publicId))))).catch(() => {});
    if (existingFiles.length > 0) await this.repo.clearDeliverableFiles(appId);

    const creatorUserId = app.creator.userId;
    notificationService.create({
      userId:  creatorUserId,
      type:    'revision_requested',
      title:   'Revision Requested',
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

  // ── Deliverable videos ───────────────────────────────────────────────────────
  // Mirrors messaging.service.ts's requestVideoUploadSignature/completeVideoAttachment
  // pair almost exactly (see that file for the "server verifies via Cloudinary's
  // own Admin API, never trusts client-submitted metadata" rationale) — the two
  // differences: no duration cap (deliverable content is legitimately longer than
  // a 2-minute chat clip; only the 500MB size cap applies, enforced both
  // client-side before upload and server-side in completeDeliverableVideo) and a
  // hard cap of 3 videos per application instead of unlimited messages.

  private async assertCanUploadDeliverable(appId: string, userId: string) {
    const creator = await this.creatorRepo.findByUserId(userId);
    if (!creator) throw new AppError('Creator profile not found', 404);

    const app = await this.repo.findApplicationById(appId);
    if (!app) throw new AppError('Application not found', 404);
    if (app.creatorId !== creator.id) throw new AppError('Not authorized', 403);
    // Ownership alone (what submitWork checks) isn't enough here — workStatus
    // can advance to APPROVED/COMPLETED while `status` stays 'ACCEPTED' for the
    // application's entire lifetime, so a plain status check would let a creator
    // keep attaching videos after the business already signed off.
    if (['APPROVED', 'COMPLETED'].includes(app.workStatus)) {
      throw new AppError('This project has already been approved — videos can no longer be added', 400);
    }
    return app;
  }

  async requestDeliverableVideoSignature(appId: string, userId: string) {
    const app = await this.assertCanUploadDeliverable(appId, userId);
    const existing = await this.repo.getDeliverableVideos(appId);
    if (existing.length >= 3) throw new AppError('Maximum of 3 videos already uploaded for this application', 409);

    const publicId = `deliverable_${appId}_${Date.now()}_${randomUUID()}`;
    return generateVideoUploadSignature('campaigns/deliverables', publicId);
  }

  async completeDeliverableVideo(appId: string, userId: string, publicId: string, clientDurationSec?: number) {
    // Re-checked fresh here, not just at signature time — a 500MB upload can
    // take minutes, during which the business could approve the work.
    await this.assertCanUploadDeliverable(appId, userId);

    const expectedPrefix = 'campaigns/deliverables/deliverable_';
    if (!publicId.startsWith(expectedPrefix) || !publicId.includes(`_${appId}_`)) {
      throw new AppError('Invalid upload reference', 400);
    }

    let resource;
    try {
      resource = await cloudinary.api.resource(publicId, { resource_type: 'video' });
    } catch {
      throw new AppError('Could not verify the uploaded video. Please try again.', 400);
    }

    if (!ALLOWED_DELIVERABLE_VIDEO_FORMATS.has((resource.format ?? '').toLowerCase())) {
      await deleteVideo(publicId);
      throw new AppError('Unsupported video format. Please use MP4 or MOV.', 400);
    }

    // Client-side picker already caps size at 500MB, but that check is trivially
    // bypassable — the server is the only source of truth, same as the format check above.
    if ((resource.bytes ?? 0) > MAX_VIDEO_SIZE_BYTES) {
      await deleteVideo(publicId);
      throw new AppError('Video exceeds the 500MB limit', 400);
    }

    const existing = await this.repo.getDeliverableVideos(appId);
    const entry: DeliverableVideo = {
      publicId,
      url:          videoPlaybackUrl(resource.secure_url),
      thumbnailUrl: videoThumbnailUrl(resource.secure_url),
      // Cloudinary's own duration wins when present — see messaging.service.ts's
      // completeVideoAttachment for why the client-reported value is the
      // fallback rather than always 0 while the asset is still being indexed.
      durationSec:  Math.round(resource.duration || clientDurationSec || 0),
      format:       'mp4', // matches url — always delivered as MP4 regardless of source format
      sizeBytes:    resource.bytes ?? 0,
      label:        `Video ${existing.length + 1}`,
      uploadedAt:   new Date().toISOString(),
      // Set to READY synchronously here — the checks above (format/size, plus
      // the duration check for chat) are all we verify today, no async job
      // exists yet. See VideoAssetStatus's schema comment for the future path.
      status:       'READY',
    };

    const appended = await this.repo.appendDeliverableVideo(appId, entry);
    if (!appended) {
      await deleteVideo(publicId);
      throw new AppError('Maximum of 3 videos already uploaded for this application', 409);
    }

    return entry;
  }

  async removeDeliverableVideo(appId: string, userId: string, publicId: string) {
    await this.assertCanUploadDeliverable(appId, userId);
    await deleteVideo(publicId).catch(() => {});
    const updated = await this.repo.removeDeliverableVideo(appId, publicId);
    return toApplicationDto(updated);
  }

  async renameDeliverableVideo(appId: string, userId: string, publicId: string, label: string) {
    await this.assertCanUploadDeliverable(appId, userId);
    const updated = await this.repo.renameDeliverableVideo(appId, publicId, label.trim());
    return toApplicationDto(updated);
  }

  // ── Deliverable files (images / PDF / DOCX) ─────────────────────────────────
  // Unlike deliverable videos, these are small enough (<=5MB, enforced by
  // multer's uploadDeliverableFile) to proxy straight through this server —
  // no signing/direct-to-Cloudinary flow needed, and no async verification
  // step since the file is already fully in hand by the time this runs.

  // `isClientDisconnected` reflects the creator tapping X mid-upload on the
  // mobile client — aborting the client's connection doesn't stop this async
  // handler from running (Node has no built-in "cancel my work" for that), so
  // this is checked explicitly at both points where it still matters: before
  // ever touching Cloudinary, and again right after (in case the cancel
  // landed while that call was in flight) so a cancelled upload never ends up
  // live in Cloudinary or appended to deliverables.
  async uploadDeliverableFile(
    appId: string, userId: string, file: Express.Multer.File, isClientDisconnected: () => boolean = () => false,
  ): Promise<DeliverableFile> {
    await this.assertCanUploadDeliverable(appId, userId);

    const existing = await this.repo.getDeliverableFiles(appId);
    if (existing.length >= 10) throw new AppError('Maximum of 10 files already uploaded for this application', 409);

    if (isClientDisconnected()) throw new AppError('Upload cancelled', 499);

    const isImage = file.mimetype.startsWith('image/');
    const publicId = `deliverable_${appId}_${Date.now()}_${randomUUID()}`;
    const url = isImage
      ? await uploadImageToCloudinary(file.buffer, 'campaigns/deliverables', publicId, DELIVERABLE_IMAGE_TRANSFORMATION)
      : await uploadRawFile(file.buffer, 'campaigns/deliverables', publicId);

    if (isClientDisconnected()) {
      // Fire-and-forget: the client is already gone, so there's no response
      // left to hold up waiting on Cloudinary's delete API round-trip for.
      void (isImage ? deleteImage(deliverableFileCloudinaryId(publicId)) : deleteRawFile(deliverableFileCloudinaryId(publicId)));
      throw new AppError('Upload cancelled', 499);
    }

    const entry: DeliverableFile = {
      id:               randomUUID(),
      publicId,
      url,
      fileType:         isImage ? 'IMAGE' : 'DOCUMENT',
      originalFileName: file.originalname,
      mimeType:         file.mimetype,
      sizeBytes:        file.size,
      uploadedAt:       new Date().toISOString(),
    };

    const appended = await this.repo.appendDeliverableFile(appId, entry);
    if (!appended) {
      await (isImage ? deleteImage(deliverableFileCloudinaryId(publicId)) : deleteRawFile(deliverableFileCloudinaryId(publicId)));
      throw new AppError('Maximum of 10 files already uploaded for this application', 409);
    }

    return entry;
  }

  async removeDeliverableFile(appId: string, userId: string, fileId: string) {
    await this.assertCanUploadDeliverable(appId, userId);
    const existing = await this.repo.getDeliverableFiles(appId);
    const target = existing.find((f) => f.id === fileId);
    if (target) {
      await (target.fileType === 'IMAGE' ? deleteImage(deliverableFileCloudinaryId(target.publicId)) : deleteRawFile(deliverableFileCloudinaryId(target.publicId))).catch(() => {});
    }
    const updated = await this.repo.removeDeliverableFile(appId, fileId);
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
