import { CampaignStatus, ApplicationStatus, CampaignType, WorkStatus } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'crypto';
import { AppError } from '../../middleware/error';
import { toCampaignDto, toApplicationDto, toActivityLogDto, toEventQuestionDto, type DeliverableVideo, type DeliverableFile } from './campaign.dto';
import { videoThumbnailUrl, videoPlaybackUrl, deleteVideo, MAX_VIDEO_SIZE_BYTES, uploadImage as uploadImageToCloudinary, uploadRawFile, deleteImage, deleteRawFile } from '../../utils/cloudinary';
import { createVideoUploadPlan, finalizeR2Object, completeR2Multipart, deleteR2Object, abortR2Multipart } from '../../utils/r2Media';
import { BusinessRepository } from '../business/business.repository';
import { CreatorRepository } from '../creator/creator.repository';
import { CampaignRepository } from './campaign.repository';
import { FavoriteRepository } from '../creator/favorite.repository';
import { AdminRepository } from '../admin/admin.repository';
import { CategoryRepository } from '../category/category.repository';
import { notificationService } from '../notifications/notification.service';
import { contractService } from '../contract/contract.service';
import { analyticsService } from '../analytics/analytics.service';
import { MessagingService } from '../messaging/messaging.service';
import { recordWalletTransactionIdempotent } from '../wallet/wallet.ledger';
import { emitToRole } from '../../socket';
import { logger } from '../../config/logger';
import { logActivity, getActivityForEntity } from '../logging/activity.service';
import { ActivityAction, EntityType } from '../logging/logging.constants';
import { translateFields, translateMany } from '../../utils/translation';
import { haversineKm } from '../../utils/geo';
import { env } from '../../config/env';
import { initiateKhaltiPayment as khaltiInitiate, lookupKhaltiPayment as khaltiLookup } from '../../utils/khalti';
import { buildEsewaSignedFields, decodeEsewaResponse, verifyEsewaSignature, checkEsewaStatus, parseEsewaAmount, friendlyEsewaStatusMessage, type EsewaFormFields } from '../../utils/esewa';
import {
  sendPaymentSecuredEmail,
  sendWorkStartedEmail,
  sendWorkSubmittedEmail,
  sendWorkApprovedEmail,
  sendRevisionRequestEmail,
  sendEventAcceptedEmail,
  sendCampaignCancelledEmail,
} from '../../utils/email';

// 'platforms' is deliberately excluded (unlike 'category', which keeps its
// own untranslated 'categoryKey' alongside the translated display field) —
// it's matched by exact string against the admin platform catalog on the
// client (see mobile's getPlatformMeta) to resolve each platform's icon, and
// is never itself shown to the user as label text. Translating it (e.g.
// "Instagram" -> "इन्स्टाग्राम") broke that match, silently falling back to a
// generic globe icon for every platform once the UI language was Nepali.
// 'title' is deliberately excluded too — it's the event/campaign name the
// business chose (a proper noun, same category as a person's name), not
// descriptive prose; translating it would show creators a name the business
// never wrote.
const CAMPAIGN_FIELDS = ['description', 'category', 'goals', 'contentType', 'deliverables', 'paymentType', 'location', 'venue', 'benefits'] as const;

// Mirrors the fee breakdown shown to the business in the pay modal (mobile
// activity-timeline.tsx's crFee/pfFee/vat/total) — must stay in lockstep with
// that formula since this is the amount actually charged through Khalti.
function applicationTotalNpr(proposedRate: number): number {
  const platformFee = Math.round(proposedRate * 0.05);
  const vat = Math.round(platformFee * 0.13);
  return proposedRate + platformFee + vat;
}

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
const FIELDS_LOCKED_AFTER_PROPOSALS = [
  'budgetMin', 'budgetMax', 'platforms', 'deliverables',
  'location', 'locationLat', 'locationLng', 'locationType', 'isFeatured', 'completionType',
] as const;

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

// ── Recommended-campaigns scoring ────────────────────────────────────────────
// Content-based match between a creator's stated preferences and a candidate
// campaign — mirrors creator.service.ts's RECOMMEND_WEIGHTS/scoreCandidate
// pair (the campaign->creator direction), just scored the other way around.
// Every sub-score is normalized to [0, 1]; missing creator preference data
// (no categories/platforms/coordinates set yet) falls back to a neutral 0.5
// rather than 0, so a barely-filled-in profile doesn't get an empty feed.
const RECOMMENDATION_POOL_SIZE = 150;
const CAMPAIGN_RECOMMEND_WEIGHTS = { category: 0.35, platform: 0.15, budget: 0.15, location: 0.2, freshness: 0.1, quality: 0.05 };

function scoreCampaignForCreator(
  c: {
    category: string; platforms: string[]; budgetMin: number; budgetMax: number;
    locationType: 'ONSITE' | 'REMOTE'; locationLat: number | null; locationLng: number | null;
    createdAt: Date; isFeatured: boolean; applicationCount: number;
  },
  creator: {
    categories: string[]; prefPlatforms: string[]; prefBudgetMin: number; prefBudgetMax: number;
    locationLat: number | null; locationLng: number | null; nearbyRadiusKm: number;
  },
): number {
  const categoryScore = creator.categories.length
    ? (creator.categories.some((cat) => cat.toLowerCase() === c.category.toLowerCase()) ? 1 : 0)
    : 0.5;

  const platformScore = creator.prefPlatforms.length
    ? creator.prefPlatforms.filter((p) => c.platforms.includes(p)).length / creator.prefPlatforms.length
    : 0.5;

  // Budget ranges overlapping is a binary-ish fit — 1 when they do, a soft
  // floor (not 0) when they don't, since a near-miss campaign is still worth
  // surfacing, just ranked behind a better-fitting one.
  const budgetScore = c.budgetMax >= creator.prefBudgetMin && c.budgetMin <= creator.prefBudgetMax ? 1 : 0.3;

  // REMOTE campaigns are reachable by anyone, so they score full marks.
  // ONSITE campaigns decay from 1 at 0km to 0 at the creator's own stated
  // nearbyRadiusKm — same falloff shape as creator.service.ts's proximityScore.
  const locationScore = c.locationType === 'REMOTE'
    ? 1
    : creator.locationLat != null && creator.locationLng != null && c.locationLat != null && c.locationLng != null
      ? Math.max(0, 1 - haversineKm(creator.locationLat, creator.locationLng, c.locationLat, c.locationLng) / Math.max(creator.nearbyRadiusKm, 1))
      : 0.5;

  const daysSinceCreated = (Date.now() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const freshnessScore = Math.max(0, 1 - daysSinceCreated / 30);

  // Featured campaigns get a boost; a growing applicant count pulls the other
  // way (a soft signal the opportunity may already be effectively filled) —
  // capped so it can only ever bring the score down to 0, never negative.
  const qualityScore = Math.max(0, (c.isFeatured ? 1 : 0.6) - Math.min(0.4, c.applicationCount * 0.02));

  return (
    categoryScore  * CAMPAIGN_RECOMMEND_WEIGHTS.category +
    platformScore  * CAMPAIGN_RECOMMEND_WEIGHTS.platform +
    budgetScore    * CAMPAIGN_RECOMMEND_WEIGHTS.budget +
    locationScore  * CAMPAIGN_RECOMMEND_WEIGHTS.location +
    freshnessScore * CAMPAIGN_RECOMMEND_WEIGHTS.freshness +
    qualityScore   * CAMPAIGN_RECOMMEND_WEIGHTS.quality
  );
}

export class CampaignService {
  private repo:         CampaignRepository;
  private businessRepo: BusinessRepository;
  private creatorRepo:  CreatorRepository;
  private favoriteRepo: FavoriteRepository;
  private adminRepo:    AdminRepository;
  private categoryRepo: CategoryRepository;

  constructor() {
    this.repo         = new CampaignRepository();
    this.businessRepo = new BusinessRepository();
    this.creatorRepo  = new CreatorRepository();
    this.favoriteRepo = new FavoriteRepository();
    this.adminRepo    = new AdminRepository();
    this.categoryRepo = new CategoryRepository();
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
  //
  // The 'featuredEvent.paywallEnabled' master switch gates the whole thing:
  // when it's off (default), every business features without limit or charge;
  // when it's on, allowlisted brands still feature for free and everyone else
  // gets `freeQuota` free features before the toggle locks behind `price`.
  async getFeaturedQuota(userId: string) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) throw new AppError('Business profile not found', 404);

    const [paywallSetting, freeQuotaSetting, priceSetting, unlimitedEmailsSetting, used] = await Promise.all([
      this.adminRepo.getSetting('featuredEvent.paywallEnabled'),
      this.adminRepo.getSetting('featuredEvent.freeQuota'),
      this.adminRepo.getSetting('featuredEvent.price'),
      this.adminRepo.getSetting('featuredEvent.unlimitedEmails'),
      this.repo.countFeaturedCampaigns(business.id),
    ]);
    const paywallEnabled = paywallSetting === true;
    const freeQuota = Number(freeQuotaSetting) || 0;
    const price     = Number(priceSetting) || 0;
    const unlimitedEmails = Array.isArray(unlimitedEmailsSetting) ? unlimitedEmailsSetting as string[] : [];
    const emailAllowlisted = unlimitedEmails.some((e) => e.toLowerCase() === business.user.email.toLowerCase());
    const unlimited = !paywallEnabled || emailAllowlisted;
    // A large finite sentinel, not Infinity — Infinity serializes to `null`
    // over JSON, which would break every `remaining > 0` / `<= 0` check that
    // already exists downstream (create(), the mobile lock/paywall UI).
    const remaining = unlimited ? Number.MAX_SAFE_INTEGER : Math.max(0, freeQuota - used);

    return { paywallEnabled, freeQuota, used, remaining, price, unlimited };
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

    const locationType = input.locationType ?? 'ONSITE';
    if (locationType === 'ONSITE' && !input.location?.trim()) {
      throw new AppError('Location is required for onsite events', 400);
    }

    // Each requirement's categoryId must be a real, active, strict
    // CREATOR-scope category (a provider *type* — Photographer, Videographer,
    // ...) — never a BUSINESS-only or BOTH-scope niche. Mirrors
    // service.service.ts's assertCategoryUsable for the same reason.
    if (input.requirements?.length) {
      for (const r of input.requirements) {
        const category = await this.categoryRepo.findById(r.categoryId);
        if (!category) throw new AppError(`Category not found for requirement`, 404);
        if (category.status !== 'ACTIVE') throw new AppError(`Category "${category.name}" is not active`, 400);
        if (category.scope !== 'CREATOR') throw new AppError(`Category "${category.name}" is not usable as a campaign requirement`, 400);
      }
    }

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
      requirements: input.requirements?.map((r) => ({
        ...r,
        deadline: r.deadline ? new Date(r.deadline) : undefined,
      })),
      // Never persist a stale address alongside REMOTE — the server is the
      // source of truth here, not whatever the client happened to send.
      location:     locationType === 'REMOTE' ? null : input.location,
      locationLat:  locationType === 'REMOTE' ? null : input.locationLat,
      locationLng:  locationType === 'REMOTE' ? null : input.locationLng,
      locationType,
    });
    const campaign = toCampaignDto(raw);

    logActivity({ userId, action: ActivityAction.CAMPAIGN_CREATED, entityType: EntityType.CAMPAIGN, entityId: raw.id, metadata: { campaignType: raw.campaignType, status: raw.status } });

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

  // Attaches the trending-window application counts the creator feed's
  // Trending tab ranks on (see CampaignRepository.countRecentApplications).
  // Only the list endpoints do this — a single-campaign read has no ranking
  // to do and shouldn't pay for the extra query.
  private async withRecentApplicationCounts<T extends { id: string }>(campaigns: T[]): Promise<(T & { recentApplications: number })[]> {
    const since = new Date(Date.now() - CampaignRepository.TRENDING_WINDOW_HOURS * 60 * 60 * 1000);
    const counts = await this.repo.countRecentApplications(campaigns.map((c) => c.id), since);
    return campaigns.map((c) => ({ ...c, recentApplications: counts.get(c.id) ?? 0 }));
  }

  async list(query: CampaignListQuery, lang = 'en') {
    const { page = 1, limit = 10, ...filters } = query;
    const validatedLimit = Math.min(limit, 50);

    const { campaigns: raw, total } = await this.repo.findMany({
      ...filters,
      page,
      limit: validatedLimit,
    });

    const dtos = (await this.withRecentApplicationCounts(raw)).map(toCampaignDto);
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

    const dtos = (await this.withRecentApplicationCounts(raw)).map(toCampaignDto);
    const campaigns = await translateMany(dtos, [...CAMPAIGN_FIELDS], lang);
    return { campaigns, total, page, limit };
  }

  /**
   * Up to `limit` active campaigns ranked for this creator by content-based
   * fit (category/platform/budget/location/freshness/popularity — see
   * scoreCampaignForCreator above), for the "Recommended Opportunities"
   * section on the creator home page. Candidates already applied to are
   * excluded outright rather than merely ranked lower — a creator has no use
   * for being "recommended" something they've already acted on.
   */
  async getRecommendedForCreator(userId: string, limit = 10, lang = 'en') {
    const creator = await this.creatorRepo.findByUserId(userId);
    if (!creator) throw new AppError('Creator profile not found', 404);

    const cappedLimit = Math.min(limit, 20);
    const excludeCampaignIds = await this.repo.findAppliedCampaignIds(creator.id);
    const candidates = await this.repo.findCandidatesForRecommendation(excludeCampaignIds, RECOMMENDATION_POOL_SIZE);

    const ranked = candidates
      .map((c) => ({
        campaign: c,
        score: scoreCampaignForCreator(
          {
            category:         c.category,
            platforms:        c.platforms,
            budgetMin:        c.budgetMin,
            budgetMax:        c.budgetMax,
            locationType:     c.locationType,
            locationLat:      c.locationLat,
            locationLng:      c.locationLng,
            createdAt:        c.createdAt,
            isFeatured:       c.isFeatured,
            applicationCount: c._count.applications,
          },
          {
            categories:     creator.categories,
            prefPlatforms:  creator.prefPlatforms,
            prefBudgetMin:  creator.prefBudgetMin,
            prefBudgetMax:  creator.prefBudgetMax,
            locationLat:    creator.locationLat,
            locationLng:    creator.locationLng,
            nearbyRadiusKm: creator.nearbyRadiusKm,
          },
        ),
      }))
      .sort((a, b) => b.score - a.score);

    // The candidate pool is newest-first (see findCandidatesForRecommendation),
    // so its head is the single most recently created eligible campaign. Pin
    // it into slot one even when its content-fit score wouldn't otherwise earn
    // a spot in the top `cappedLimit` — a brand-new listing should never be
    // invisible to creators just because it doesn't match their profile well
    // yet (nobody's applied to it to build that signal either).
    const newest = candidates[0];
    const rest = newest ? ranked.filter((r) => r.campaign.id !== newest.id) : ranked;
    const top = newest
      ? [ranked.find((r) => r.campaign.id === newest.id)!, ...rest.slice(0, cappedLimit - 1)]
      : ranked.slice(0, cappedLimit);

    const dtos = top.map((r) => r.campaign).map(toCampaignDto);
    return translateMany(dtos, [...CAMPAIGN_FIELDS], lang);
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
      // Never leave a stale address behind when switching to REMOTE — same
      // normalization as create().
      ...(input.locationType === 'REMOTE' ? { location: null, locationLat: null, locationLng: null } : {}),
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
      ...(input.locationType === 'REMOTE' ? { location: null, locationLat: null, locationLng: null } : {}),
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

    // Requirement-scoped applications (multi-role campaigns) validate and
    // dedupe against that one requirement, not the whole campaign — a
    // multi-category provider can apply to two different roles on the same
    // campaign. Falls back to the simple whole-campaign check otherwise.
    let requirement: Awaited<ReturnType<typeof this.repo.findRequirementById>> = null;
    if (input.requirementId) {
      requirement = await this.repo.findRequirementById(input.requirementId);
      if (!requirement || requirement.campaignId !== campaignId) {
        throw new AppError('Requirement not found on this campaign', 404);
      }
      const existingForRequirement = await this.repo.findApplicationForRequirement(input.requirementId, creator.id);
      if (existingForRequirement) {
        throw new AppError('You have already applied to this role', 409);
      }
    } else {
      const existingApplication = await this.repo.findApplication(campaignId, creator.id);
      if (existingApplication) {
        throw new AppError('You have already applied to this campaign', 409);
      }
    }

    await this.assertProposalSubmissionAllowed(creator.id);

    const isFreeCampaign = (campaign as any).campaignType === 'OPEN_EVENT';
    if (requirement) {
      // Validate against the requirement's own budget, not the campaign's —
      // the campaign-level budgetMin/Max are informational summaries once
      // requirements exist (see createCampaignSchema's comment).
      if (requirement.budgetType === 'FIXED' && requirement.budgetFixed != null) {
        // A fixed budget is a ceiling, not an exact price — a creator may
        // underbid it, but never ask for more than the business set aside.
        if (input.proposedRate > requirement.budgetFixed) {
          throw new AppError(`Proposed rate cannot exceed Rs. ${requirement.budgetFixed.toLocaleString()} for this role`, 400);
        }
        if (!isFreeCampaign && requirement.budgetFixed > 0 && input.proposedRate <= 0) {
          throw new AppError('Proposed rate must be greater than zero', 400);
        }
      } else if (requirement.budgetType === 'RANGE' && requirement.budgetMin != null && requirement.budgetMax != null) {
        if (input.proposedRate < requirement.budgetMin || input.proposedRate > requirement.budgetMax) {
          throw new AppError(
            `Proposed rate must be between Rs. ${requirement.budgetMin.toLocaleString()} and Rs. ${requirement.budgetMax.toLocaleString()}`,
            400,
          );
        }
      }
    } else if (!isFreeCampaign && campaign.budgetMax > 0) {
      if (campaign.budgetMin === campaign.budgetMax) {
        // Fixed budget: underbidding is allowed, overbidding is not.
        if (input.proposedRate > campaign.budgetMax) {
          throw new AppError(`Proposed rate cannot exceed Rs. ${campaign.budgetMax.toLocaleString()}`, 400);
        }
        if (input.proposedRate <= 0) {
          throw new AppError('Proposed rate must be greater than zero', 400);
        }
      } else if (input.proposedRate < campaign.budgetMin || input.proposedRate > campaign.budgetMax) {
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

    logActivity({ userId, action: ActivityAction.APPLICATION_CREATED, entityType: EntityType.APPLICATION, entityId: application.id, metadata: { campaignId, proposedRate: input.proposedRate, isFreeEvent: isFreeCampaign } });

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
        requirement,
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

  // §49 — a lightweight "under consideration" marker, distinct from the full
  // accept/reject flow above: no contract signing, no capacity enforcement,
  // just a status toggle + notification. Toggles PENDING <-> SHORTLISTED;
  // only notifies on the way in (SHORTLISTED), not when reverted, so a
  // business changing their mind a few times doesn't spam the provider.
  async shortlistApplication(campaignId: string, appId: string, userId: string) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) throw new AppError('Business profile not found', 404);

    const campaign = await this.repo.findById(campaignId);
    if (!campaign) throw new AppError('Campaign not found', 404);
    if (campaign.businessId !== business.id) throw new AppError('Not authorized', 403);

    const application = await this.repo.findApplicationById(appId);
    if (!application) throw new AppError('Application not found', 404);
    if (application.campaignId !== campaignId) throw new AppError('Application does not belong to this campaign', 400);
    if (application.status !== 'PENDING' && application.status !== 'SHORTLISTED') {
      throw new AppError('Only pending applications can be shortlisted', 400);
    }

    const nextStatus = application.status === 'PENDING' ? 'SHORTLISTED' : 'PENDING';
    const rawUpdated = await this.repo.updateApplicationStatus(appId, nextStatus);
    const updated = toApplicationDto(rawUpdated);

    if (nextStatus === 'SHORTLISTED') {
      logActivity({ userId, action: ActivityAction.APPLICATION_SHORTLISTED, entityType: EntityType.APPLICATION, entityId: appId, metadata: { campaignId, creatorId: application.creatorId } });
    }

    if (nextStatus === 'SHORTLISTED' && application.creator?.userId) {
      notificationService.create({
        userId:  application.creator.userId,
        type:    'proposal_shortlisted',
        title:   `You've been shortlisted!`,
        body:    `${business.businessName ?? 'A business'} shortlisted your proposal for "${campaign.title}".`,
        refId:   campaign.id,
        refType: 'campaign',
      }).catch(() => {});
    }

    return updated;
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
    if (campaign.status !== 'ACTIVE') throw new AppError('This campaign is no longer active', 400);

    const application = await this.repo.findApplicationById(appId);
    if (!application) throw new AppError('Application not found', 404);
    if (application.campaignId !== campaignId) throw new AppError('Application does not belong to this campaign', 400);

    // A free event (OPEN_EVENT) ends at the acceptance itself: there are no
    // deliverables to submit and no work stage to start, so approving a
    // creator lands the application straight at the terminal COMPLETED
    // workStatus in the same write. Paid campaigns keep the full
    // start -> submit -> approve flow and stay at NONE here.
    const isFreeEvent = (campaign as any).campaignType === 'OPEN_EVENT';

    const rawUpdated = await this.repo.updateApplicationStatus(
      appId,
      status,
      status === 'ACCEPTED' && isFreeEvent ? { workStatus: WorkStatus.COMPLETED } : undefined,
    );
    const updated    = toApplicationDto(rawUpdated);

    if (status === 'ACCEPTED') {
      logActivity({ userId, action: ActivityAction.APPLICATION_HIRED, entityType: EntityType.APPLICATION, entityId: appId, metadata: { campaignId, creatorId: application.creatorId } });
    } else {
      logActivity({ userId, action: ActivityAction.APPLICATION_REJECTED, entityType: EntityType.APPLICATION, entityId: appId, metadata: { campaignId, creatorId: application.creatorId } });
    }

    // Business's e-signature (see campaign-proposals.tsx, which gates the accept
    // call behind the contract modal's "I Agree" button) — completes the
    // agreement and generates the downloadable PDF. Paid campaigns only; free
    // events never had a contract created for them in apply() above.
    // Not allowed to throw past this point — the application status above is
    // already committed, and everything below (notifications, the real-time
    // socket push, the auto-greeting chat message) still needs to run even if
    // e-signing hiccups. Otherwise the accept "worked" (correct on refresh)
    // but the creator never got a live notification/badge update for it.
    if (status === 'ACCEPTED' && (campaign as any).campaignType === 'PAID_CAMPAIGN') {
      try {
        await contractService.signAsBusiness(appId, business.id);
      } catch (err) {
        logger.warn({ err: err instanceof Error ? err.message : err, appId }, 'signAsBusiness failed after application was accepted');
      }
    }

    // Capacity enforcement branches on whether this application belongs to a
    // CampaignRequirement (multi-role campaign) or not (every campaign that
    // predates CampaignRequirement, and every simple single-category campaign
    // created since — requirementId stays null for these, and the two blocks
    // below run completely unchanged from before CampaignRequirement existed).
    const requirementId = (application as any).requirementId as string | null;

    if (requirementId == null) {
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
                  // 'campaign_full' — not 'event'/'campaign' — because these go
                  // out to applicants we just auto-REJECTED. The client routes
                  // this refType to the creator's Rejected proposals tab, while
                  // a plain 'campaign' campaign_closed (a cancellation, which
                  // reaches ACCEPTED creators) still opens the activity timeline.
                  refType: 'campaign_full',
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
                refType: 'campaign_full',
              }))
            ).catch(() => {});
          }
        }
      }
    } else if (status === 'ACCEPTED') {
      // Requirement-scoped: filling one role must never reject applicants for
      // a different, still-open role, and must never close the campaign until
      // every role is filled — see the "NOT YET WIRED" note this replaces in
      // CampaignRequirement's schema comment.
      const acceptedCount = await this.repo.countAcceptedApplicationsForRequirement(requirementId);
      const requirement = await this.repo.findRequirementById(requirementId);
      if (requirement && acceptedCount >= requirement.quantity) {
        const rejected = await this.repo.rejectPendingApplicationsForRequirement(requirementId, appId);
        if (rejected.length > 0) {
          notificationService.createMany(
            rejected.map((a) => ({
              userId:  a.creator.userId,
              type:    'campaign_closed' as const,
              title:   `"${campaign.title}" is now full`,
              body:    'This role has been filled.',
              refId:   campaign.id,
              refType: 'campaign_full',
            }))
          ).catch(() => {});
        }
        if (await this.repo.areAllRequirementsFilled(campaignId)) {
          await this.repo.closeCampaign(campaignId);
        }
      }
    }

    const creatorUserId = application.creator?.userId as string | undefined;

    if (creatorUserId) {
      if (status === 'ACCEPTED') {
        analyticsService.incrProposalAccepted(creatorUserId, application.creatorId, business.userId, business.id, appId);

        // Accepting a proposal never opens a chat on its own. A free event
        // (OPEN_EVENT) ends at the acceptance itself — there is no work stage
        // and no conversation, only the bell notification below. A paid
        // campaign opens the chat once escrow is actually funded (see
        // finalizeApplicationPayment); until then the business is told in the
        // activity timeline that completing payment unlocks the chat.
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

      // Notify other pending applicants that the spot is filled. Requirement-
      // scoped when this application belongs to a CampaignRequirement — the
      // whole-campaign version below would otherwise wrongly tell applicants
      // for a completely different, still-open role that the campaign closed.
      if (status === 'ACCEPTED') {
        const pendingPromise = requirementId != null
          ? this.repo.findPendingApplicationsForRequirement(requirementId, appId)
          : this.repo.findPendingApplicationsByCampaign(campaignId, appId);
        pendingPromise.then((others) => {
          if (others.length === 0) return;
          return notificationService.createMany(
            others.map((a) => ({
              userId:  a.creator.userId,
              type:    'campaign_closed' as const,
              title:   requirementId != null
                ? `A role on "${campaign.title}" has been filled`
                : `"${campaign.title}" is no longer accepting proposals`,
              body:    requirementId != null
                ? `${business.businessName} has selected a provider for this role. Thank you for applying!`
                : `${business.businessName} has selected a creator for this campaign. Thank you for applying!`,
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

  // Shared by the mock instant-pay path (payForApplication) and the real
  // Khalti path (confirmKhaltiPayment) — everything that happens once a
  // payment is actually confirmed, regardless of which method got it there.
  private async finalizeApplicationPayment(params: {
    appId: string;
    campaignId: string;
    campaignTitle: string;
    businessId: string;
    businessUserId: string;
    businessName: string;
    creatorId: string;
    creatorUserId?: string;
    proposedRate: number;
    method: string;
  }) {
    await this.repo.payForApplication(params.appId, params.method);
    await this.repo.createEscrowTransaction({
      applicationId: params.appId,
      campaignId:    params.campaignId,
      businessId:    params.businessId,
      creatorId:     params.creatorId,
      amount:        params.proposedRate,
      method:        params.method,
    });

    logActivity({
      userId:     params.businessUserId,
      action:     ActivityAction.PAYMENT_ESCROWED,
      entityType: EntityType.APPLICATION,
      entityId:   params.appId,
      metadata:   { campaignId: params.campaignId, amount: params.proposedRate, method: params.method },
    });

    if (params.creatorUserId) {
      analyticsService.incrPaymentPaid(params.creatorUserId, params.proposedRate);
      notificationService.create({
        userId:  params.creatorUserId,
        type:    'payment_released',
        title:   `Payment secured for "${params.campaignTitle}"`,
        body:    `${params.businessName} has made the payment. You can now start creating content!`,
        refId:   params.campaignId,
        refType: 'campaign',
      }).catch(() => {});
    }

    // Escrow is now funded — open (or resume) the chat with a greeting on the
    // business's behalf. For a paid campaign this is deferred to here rather
    // than to proposal-acceptance, so the creator isn't dropped into a chat
    // before the business has actually paid (free events open the chat on
    // acceptance instead — see acceptApplication).
    messagingService
      .sendProposalAcceptedMessage(
        params.creatorId,
        params.businessId,
        params.campaignId,
        params.businessUserId,
        `Payment for "${params.campaignTitle}" is complete and now secured with Kolab. You can message here anytime — it will be great working together!`,
      )
      .catch(() => {});
  }

  async payForApplication(appId: string, userId: string, method = 'esewa') {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) throw new AppError('Business profile not found', 404);

    const application = await this.repo.findApplicationById(appId);
    if (!application) throw new AppError('Application not found', 404);

    const campaign = await this.repo.findById(application.campaignId);
    if (!campaign) throw new AppError('Campaign not found', 404);
    if (campaign.businessId !== business.id) throw new AppError('Not authorized', 403);
    if (application.status !== 'ACCEPTED') throw new AppError('Creator must be accepted first', 400);
    if (application.paymentStatus === 'PAID' || application.paymentStatus === 'RELEASED') {
      throw new AppError('Payment already made for this application', 400);
    }

    await this.finalizeApplicationPayment({
      appId,
      campaignId:     application.campaignId,
      campaignTitle:  campaign.title,
      businessId:     business.id,
      businessUserId: userId,
      businessName:   business.businessName ?? 'Business',
      creatorId:      application.creatorId,
      creatorUserId:  (application.creator as any)?.userId,
      proposedRate:   application.proposedRate,
      method,
    });

    return { success: true };
  }

  // Step 1 of the Khalti flow: validate + charge the same amount the pay modal
  // showed the business, hand back Khalti's hosted checkout URL. Nothing is
  // marked paid here — that only happens once confirmKhaltiPayment verifies the
  // payment actually completed (see khaltiCallback in the controller).
  async initiateKhaltiPayment(appId: string, userId: string): Promise<{ paymentUrl: string }> {
    if (!env.KHALTI_RETURN_URL) throw new AppError('Khalti is not configured on the server yet.', 503);

    const business = await this.businessRepo.findByUserId(userId);
    if (!business) throw new AppError('Business profile not found', 404);

    const application = await this.repo.findApplicationById(appId);
    if (!application) throw new AppError('Application not found', 404);

    const campaign = await this.repo.findById(application.campaignId);
    if (!campaign) throw new AppError('Campaign not found', 404);
    if (campaign.businessId !== business.id) throw new AppError('Not authorized', 403);
    if (application.status !== 'ACCEPTED') throw new AppError('Creator must be accepted first', 400);
    if (application.paymentStatus === 'PAID' || application.paymentStatus === 'RELEASED') {
      throw new AppError('Payment already made for this application', 400);
    }

    const businessUser = (business as any).user as { email?: string | null; phone?: string | null } | undefined;
    const totalNpr = applicationTotalNpr(application.proposedRate);

    const { pidx, paymentUrl } = await khaltiInitiate({
      amountPaisa:       Math.round(totalNpr * 100),
      purchaseOrderId:   appId,
      purchaseOrderName: `Payment for "${campaign.title}"`,
      returnUrl:         env.KHALTI_RETURN_URL,
      websiteUrl:        env.FRONTEND_URL.split(',')[0].trim(),
      customerInfo: {
        name:  business.businessName ?? undefined,
        email: businessUser?.email ?? undefined,
        phone: businessUser?.phone ?? undefined,
      },
    });

    await this.repo.setKhaltiPidx(appId, pidx);

    return { paymentUrl };
  }

  // Step 2: the browser lands back on khaltiCallback with `pidx` — this looks
  // it up against Khalti's own server (never trusting the redirect's query
  // params alone) before finalizing anything.
  async confirmKhaltiPayment(appId: string, pidx: string): Promise<void> {
    const application = await this.repo.findApplicationById(appId);
    if (!application) throw new AppError('Application not found', 404);

    // Already finalized — a reloaded callback or a double-redirect lands here
    // as a harmless no-op instead of double-charging the escrow ledger.
    if (application.paymentStatus === 'PAID' || application.paymentStatus === 'RELEASED') return;

    if (!application.khaltiPidx || application.khaltiPidx !== pidx) {
      throw new AppError('This Khalti payment does not match any pending payment.', 400);
    }

    const result = await khaltiLookup(pidx);
    if (result.status !== 'Completed') {
      throw new AppError(`Khalti payment ${result.status}`, 400);
    }

    const expectedPaisa = Math.round(applicationTotalNpr(application.proposedRate) * 100);
    if (result.totalAmountPaisa !== expectedPaisa) {
      logger.error({ appId, pidx, expectedPaisa, got: result.totalAmountPaisa }, 'Khalti payment amount mismatch');
      throw new AppError('The paid amount does not match what was due.', 400);
    }

    const campaign = application.campaign as any;
    await this.finalizeApplicationPayment({
      appId,
      campaignId:     application.campaignId,
      campaignTitle:  campaign.title,
      businessId:     campaign.business.id,
      businessUserId: campaign.business.userId,
      businessName:   campaign.business.businessName ?? 'Business',
      creatorId:      application.creatorId,
      creatorUserId:  (application.creator as any)?.userId,
      proposedRate:   application.proposedRate,
      method:         'khalti',
    });
  }

  // Shared validation for both payment initiate paths (Khalti above, eSewa
  // below) — business owns the campaign, the creator's already accepted, and
  // nothing's been paid yet.
  private async validatePendingPayment(appId: string, userId: string) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) throw new AppError('Business profile not found', 404);

    const application = await this.repo.findApplicationById(appId);
    if (!application) throw new AppError('Application not found', 404);

    const campaign = await this.repo.findById(application.campaignId);
    if (!campaign) throw new AppError('Campaign not found', 404);
    if (campaign.businessId !== business.id) throw new AppError('Not authorized', 403);
    if (application.status !== 'ACCEPTED') throw new AppError('Creator must be accepted first', 400);
    if (application.paymentStatus === 'PAID' || application.paymentStatus === 'RELEASED') {
      throw new AppError('Payment already made for this application', 400);
    }

    return { business, application, campaign };
  }

  // Step 1 of the eSewa flow: unlike Khalti there's no "initiate" API call that
  // hands back a hosted URL — eSewa needs the browser to POST a signed form
  // directly to it, so this just records a fresh transaction_uuid and points
  // the client at our own checkout page (getEsewaCheckoutForm), which renders
  // that form. Nothing is marked paid here — see confirmEsewaPayment.
  async initiateEsewaPayment(appId: string, userId: string): Promise<{ paymentUrl: string }> {
    if (!env.ESEWA_RETURN_BASE_URL) throw new AppError('eSewa is not configured on the server yet.', 503);

    await this.validatePendingPayment(appId, userId);

    const transactionUuid = randomUUID();
    await this.repo.setEsewaTransactionUuid(appId, transactionUuid);

    return { paymentUrl: `${env.ESEWA_RETURN_BASE_URL}/api/payments/esewa/checkout/${appId}` };
  }

  // Renders the auto-submitting form the checkout page opens — re-validates
  // the application is still pending so a stale/replayed checkout link can't
  // resurrect a transaction_uuid after payment already completed elsewhere.
  async getEsewaCheckoutForm(appId: string): Promise<EsewaFormFields> {
    const application = await this.repo.findApplicationById(appId);
    if (!application) throw new AppError('Application not found', 404);
    if (application.paymentStatus === 'PAID' || application.paymentStatus === 'RELEASED') {
      throw new AppError('Payment already made for this application', 400);
    }
    if (!application.esewaTransactionUuid) {
      throw new AppError('No pending eSewa payment for this application.', 400);
    }

    return buildEsewaSignedFields({
      appId,
      transactionUuid: application.esewaTransactionUuid,
      totalAmountNpr: applicationTotalNpr(application.proposedRate),
    });
  }

  // Step 2: eSewa redirects the browser back with a signed `data` param — this
  // verifies the signature, matches it to our stored transaction_uuid, then
  // re-checks with eSewa's own status API (never trusting the redirect alone,
  // same principle as confirmKhaltiPayment's lookup call) before finalizing.
  async confirmEsewaPayment(appId: string, rawDataParam: string): Promise<void> {
    const application = await this.repo.findApplicationById(appId);
    if (!application) throw new AppError('Application not found', 404);

    if (application.paymentStatus === 'PAID' || application.paymentStatus === 'RELEASED') return;

    const decoded = decodeEsewaResponse(rawDataParam);
    verifyEsewaSignature(decoded);

    if (!application.esewaTransactionUuid || decoded.transaction_uuid !== application.esewaTransactionUuid) {
      throw new AppError('This eSewa payment does not match any pending payment.', 400);
    }

    const expectedNpr = applicationTotalNpr(application.proposedRate);
    const result = await checkEsewaStatus({ transactionUuid: application.esewaTransactionUuid, totalAmountNpr: expectedNpr });
    if (result.status !== 'COMPLETE') {
      throw new AppError(friendlyEsewaStatusMessage(result.status), 400);
    }

    if (decoded.total_amount && parseEsewaAmount(decoded.total_amount) !== expectedNpr) {
      logger.error({ appId, expectedNpr, got: decoded.total_amount }, 'eSewa payment amount mismatch');
      throw new AppError('The paid amount does not match what was due.', 400);
    }

    const campaign = application.campaign as any;
    await this.finalizeApplicationPayment({
      appId,
      campaignId:     application.campaignId,
      campaignTitle:  campaign.title,
      businessId:     campaign.business.id,
      businessUserId: campaign.business.userId,
      businessName:   campaign.business.businessName ?? 'Business',
      creatorId:      application.creatorId,
      creatorUserId:  (application.creator as any)?.userId,
      proposedRate:   application.proposedRate,
      method:         'esewa',
    });
  }

  // Job/Application Activity tab — either participant (the applying creator
  // or the campaign's owning business) can read it, never a third party.
  async getApplicationActivity(appId: string, userId: string) {
    const app = await this.repo.findApplicationById(appId);
    if (!app) throw new AppError('Application not found', 404);

    const [creator, business] = await Promise.all([
      this.creatorRepo.findByUserId(userId),
      this.businessRepo.findByUserId(userId),
    ]);
    const isCreator = creator != null && app.creatorId === creator.id;
    const isBusiness = business != null && app.campaign.business.id === business.id;
    if (!isCreator && !isBusiness) throw new AppError('Not authorized', 403);

    const logs = await getActivityForEntity(EntityType.APPLICATION, appId);
    return logs.map(toActivityLogDto);
  }

  async startWork(appId: string, userId: string) {
    const creator = await this.creatorRepo.findByUserId(userId);
    if (!creator) throw new AppError('Creator profile not found', 404);

    const app = await this.repo.findApplicationById(appId);
    if (!app) throw new AppError('Application not found', 404);
    if (app.creatorId !== creator.id) throw new AppError('Not authorized', 403);
    if (app.status !== 'ACCEPTED') throw new AppError('Application is not accepted', 400);
    // A free event (OPEN_EVENT) has no work stage at all: being accepted is
    // itself the end of the flow (the application is already COMPLETED, see
    // updateApplicationStatus), so there is nothing to start.
    const isFreeEvent = app.campaign.campaignType === 'OPEN_EVENT';
    if (isFreeEvent) throw new AppError('Free events have no work stage — being accepted is final', 400);
    if (app.paymentStatus !== 'PAID') throw new AppError('Payment not yet secured', 400);

    const updated = await this.repo.startWork(appId);
    analyticsService.incrCampaignStarted(userId);

    logActivity({ userId, action: ActivityAction.APPLICATION_WORK_STARTED, entityType: EntityType.APPLICATION, entityId: appId, metadata: { campaignId: app.campaignId } });

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

    messagingService
      .sendSystemMessage(app.creatorId, app.campaign.business.id, app.campaignId, userId, 'CREATOR', 'Collaboration started.')
      .catch(() => {});

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
    // Free events never ask for a deliverable — see startWork above.
    if (app.campaign.campaignType === 'OPEN_EVENT') {
      throw new AppError('Free events have no deliverables to submit', 400);
    }

    const updated = await this.repo.submitWork(appId, data);

    logActivity({ userId, action: ActivityAction.APPLICATION_WORK_SUBMITTED, entityType: EntityType.APPLICATION, entityId: appId, metadata: { campaignId: app.campaignId, hasNote: !!data.note } });

    const businessUserId = app.campaign.business.userId;
    notificationService.create({
      userId:  businessUserId,
      type:    'work_submitted',
      title:   'Work Submitted for Review',
      body:    `${creator.fullName ?? 'Creator'} submitted deliverables for "${app.campaign.title}". Review within 5 days.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch(() => {});

    messagingService
      .sendSystemMessage(app.creatorId, app.campaign.business.id, app.campaignId, userId, 'CREATOR', 'Deliverable submitted.')
      .catch(() => {});

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

    const isFreeEvent = app.campaign.campaignType === 'OPEN_EVENT';

    logActivity({ userId, action: ActivityAction.APPLICATION_WORK_APPROVED, entityType: EntityType.APPLICATION, entityId: appId, metadata: { campaignId: app.campaignId } });

    const creatorUserId = app.creator.userId;

    // A free event has no escrow to release, so the business's approval is
    // itself the end of the job — park it at COMPLETED rather than APPROVED,
    // which would otherwise wait forever on a payment release that never
    // comes (and keep the campaign permanently unclosable, see
    // countUnresolvedApplications).
    if (isFreeEvent) {
      const updated = await this.repo.completeWork(appId);
      notificationService.create({
        userId:  creatorUserId,
        type:    'work_approved',
        title:   'Your project has been approved!',
        body:    `${business.businessName} confirmed your work for "${app.campaign.title}". This collaboration is complete — thanks for taking part!`,
        refId:   app.campaignId,
        refType: 'event',
      }).catch(() => {});
      return toApplicationDto(updated);
    }

    // Paid campaign — the business approving the work now releases the held
    // escrow straight to the creator's wallet, with no separate admin step.
    // releaseEscrowToCreator flips workStatus to COMPLETED + paymentStatus to
    // RELEASED and fires every completion side effect (wallet credit,
    // notifications, closing an auto-accepted chat).
    const released = await this.releaseEscrowToCreator(app, userId);

    this.repo.getUserEmails([creatorUserId]).then((emailMap) => {
      const email = emailMap.get(creatorUserId);
      if (email) {
        sendWorkApprovedEmail(email, app.creator.fullName ?? 'Creator', app.campaign.title, app.proposedRate).catch(() => {});
      }
    }).catch(() => {});

    return toApplicationDto(released);
  }

  // Releases the escrow held for a paid application straight to the creator's
  // wallet. Triggered automatically when the business approves the work (see
  // approveWork) — there is no separate admin release step. Flips workStatus to
  // COMPLETED and paymentStatus to RELEASED in one update, so the completion
  // side effects (analytics, notifications, closing an auto-accepted chat) all
  // fire here. `actorUserId` is the business user who approved; the payout row
  // carries no admin id since no admin is involved.
  private async releaseEscrowToCreator(
    app: NonNullable<Awaited<ReturnType<CampaignRepository['findApplicationById']>>>,
    actorUserId: string,
  ) {
    if (app.paymentStatus === 'RELEASED') return app;
    if (app.paymentStatus !== 'PAID') {
      throw new AppError('No escrow payment is held for this application', 400);
    }

    // Creators always receive the full proposedRate — the platform commission
    // (snapshotted on the campaign) is charged to the business on top of the
    // rate, not deducted from the creator's payout.
    const updated = await this.repo.releaseApplicationPayment(app.id, null);
    await this.repo.createPayoutTransaction({
      applicationId: app.id,
      campaignId:    app.campaignId,
      businessId:    app.campaign.business.id,
      creatorId:     app.creatorId,
      adminId:       null,
      amount:        app.proposedRate,
    });
    // Credit the creator wallet ledger — this is the point the payout becomes
    // spendable. Idempotent via WalletTransaction's (referenceId, type) unique
    // index, so a retried release never double-credits.
    await recordWalletTransactionIdempotent({
      creatorId:     app.creatorId,
      type:          'CAMPAIGN_PAYOUT',
      direction:     'CREDIT',
      amount:        app.proposedRate,
      description:   `Payment for "${app.campaign.title}"`,
      referenceType: 'application',
      referenceId:   app.id,
    });

    logActivity({ userId: actorUserId, action: ActivityAction.PAYMENT_RELEASED, entityType: EntityType.APPLICATION, entityId: app.id, metadata: { campaignId: app.campaignId, amount: app.proposedRate } });

    const creatorUserId  = app.creator.userId;
    const businessUserId  = app.campaign.business.userId;
    analyticsService.incrPaymentReleased(creatorUserId, businessUserId, app.proposedRate);
    analyticsService.incrCampaignCompleted(creatorUserId, businessUserId);

    notificationService.create({
      userId:  creatorUserId,
      type:    'payment_released',
      title:   'Payment released to your wallet',
      body:    `Admin released your payment for "${app.campaign.title}" to your wallet.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch(() => {});
    notificationService.create({
      userId:  businessUserId,
      type:    'project_completed',
      title:   'Project Complete',
      body:    `Payment for "${app.campaign.title}" has been released — the project is now complete.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch(() => {});

    // Posted into the still-open conversation before it's closed below.
    await messagingService
      .sendSystemMessage(app.creator.id, app.campaign.business.id, app.campaignId, businessUserId, 'BUSINESS', 'Payment released.')
      .catch(() => {});

    // A conversation that was only ever auto-accepted (never a real chat
    // request/accept) is closed now that the project is done and paid — it
    // leaves both inboxes rather than lingering as a request/pending row.
    messagingService
      .closeConversationAfterCompletion(creatorUserId, businessUserId, app.creator.id, app.campaign.business.id)
      .catch(() => {});

    return updated;
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

    logActivity({ userId, action: ActivityAction.APPLICATION_REVISION_REQUESTED, entityType: EntityType.APPLICATION, entityId: appId, metadata: { campaignId: app.campaignId } });

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

  // §40 dispute flow — business-only, and only once the provider has marked
  // their side done (workStatus SUBMITTED covers both a SERVICE job's "mark
  // completed" and a DELIVERABLE job's actual file submission). Distinct
  // from requestRevision: this flags DISPUTED rather than reopening the job,
  // since a SERVICE job has no further work for the provider to redo.
  async reportIssue(appId: string, userId: string, reason: string) {
    const business = await this.businessRepo.findByUserId(userId);
    if (!business) throw new AppError('Business profile not found', 404);

    const app = await this.repo.findApplicationById(appId);
    if (!app) throw new AppError('Application not found', 404);
    if (app.campaign.business.id !== business.id) throw new AppError('Not authorized', 403);
    if (app.workStatus !== 'SUBMITTED') throw new AppError('Nothing to report an issue on yet', 400);

    const updated = await this.repo.reportIssue(appId, reason);

    logActivity({ userId, action: ActivityAction.APPLICATION_DISPUTED, entityType: EntityType.APPLICATION, entityId: appId, metadata: { campaignId: app.campaignId } });

    messagingService
      .sendSystemMessage(app.creatorId, business.id, app.campaignId, userId, 'BUSINESS', `Issue reported: ${reason}`)
      .catch(() => {});

    const creatorUserId = app.creator.userId;
    notificationService.create({
      userId:  creatorUserId,
      type:    'issue_reported',
      title:   'An issue was reported',
      body:    `${business.businessName} reported an issue with "${app.campaign.title}". Check the details.`,
      refId:   app.campaignId,
      refType: 'campaign',
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
    // Free events have no deliverable stage at all (see submitWork) — checked
    // before the workStatus rule below so the error says why, rather than the
    // misleading "already approved" that COMPLETED would otherwise produce.
    if (app.campaign.campaignType === 'OPEN_EVENT') {
      throw new AppError('Free events have no deliverables to upload', 400);
    }
    // Ownership alone (what submitWork checks) isn't enough here — workStatus
    // can advance to APPROVED/COMPLETED while `status` stays 'ACCEPTED' for the
    // application's entire lifetime, so a plain status check would let a creator
    // keep attaching videos after the business already signed off.
    if (['APPROVED', 'COMPLETED'].includes(app.workStatus)) {
      throw new AppError('This project has already been approved — videos can no longer be added', 400);
    }
    return app;
  }

  async requestDeliverableVideoSignature(
    appId: string,
    userId: string,
    sizeBytes: number,
    mimeType: 'video/mp4' | 'video/quicktime',
  ) {
    await this.assertCanUploadDeliverable(appId, userId);
    const existing = await this.repo.getDeliverableVideos(appId);
    if (existing.length >= 3) throw new AppError('Maximum of 3 videos already uploaded for this application', 409);
    if (sizeBytes > MAX_VIDEO_SIZE_BYTES) throw new AppError('Video exceeds the 500MB limit', 400);

    const ext = mimeType === 'video/quicktime' ? 'mov' : 'mp4';
    const publicId = `deliverable_${appId}_${Date.now()}_${randomUUID()}`;
    return createVideoUploadPlan(userId, ext, mimeType, sizeBytes, { folder: 'campaigns/deliverables', publicId });
  }

  // Cloudinary branch: unchanged — everything (duration/size/format/url) is
  // read back from Cloudinary's own Admin API. R2 branch: only object
  // existence + real byte size (HeadObject) can be independently verified —
  // duration is trusted from the client; the poster frame (if any) is the
  // client's own locally-extracted thumbnail, verified the same way as
  // chat's completeVideoAttachment (see below).
  async completeDeliverableVideo(
    appId: string,
    userId: string,
    ref: { publicId?: string; key?: string; uploadId?: string; thumbnailKey?: string },
    clientDurationSec?: number,
  ) {
    // Re-checked fresh here, not just at signature time — a 500MB upload can
    // take minutes, during which the business could approve the work.
    await this.assertCanUploadDeliverable(appId, userId);
    const existing = await this.repo.getDeliverableVideos(appId);

    let url:          string;
    let thumbnailUrl: string | undefined;
    let durationSec:  number;
    let format:       string;
    let sizeBytes:    number;
    let provider:     'CLOUDINARY' | 'R2';
    let storedId:     string;

    if (ref.key) {
      if (!ref.key.startsWith(`users/${userId}/videos/`)) {
        throw new AppError('Invalid upload reference', 400);
      }

      let result;
      try {
        result = ref.uploadId ? await completeR2Multipart(ref.key, ref.uploadId) : await finalizeR2Object(ref.key);
      } catch {
        if (ref.uploadId) await abortR2Multipart(ref.key, ref.uploadId);
        throw new AppError('Could not verify the uploaded video. Please try again.', 400);
      }
      if (!result.url) {
        await deleteR2Object(ref.key);
        throw new AppError('Video storage is not fully configured yet. Please try again later.', 500);
      }
      if (result.sizeBytes > MAX_VIDEO_SIZE_BYTES) {
        await deleteR2Object(ref.key);
        throw new AppError('Video exceeds the 500MB limit', 400);
      }

      url          = result.url;
      durationSec  = Math.round(clientDurationSec || 0);
      format       = ref.key.endsWith('.mov') ? 'mov' : 'mp4';
      sizeBytes    = result.sizeBytes;
      provider     = 'R2';
      storedId     = ref.key;

      // Best-effort — same verification as messaging.service.ts's
      // completeVideoAttachment. A missing/unverifiable thumbnail never fails
      // the submission, the deliverable grid tile just falls back to a plain
      // placeholder.
      thumbnailUrl = undefined;
      if (ref.thumbnailKey?.startsWith(`users/${userId}/thumbnails/`)) {
        try {
          const thumb = await finalizeR2Object(ref.thumbnailKey);
          thumbnailUrl = thumb.url ?? undefined;
        } catch (err) {
          logger.warn({ err, thumbnailKey: ref.thumbnailKey }, 'Could not verify deliverable video thumbnail upload — saving without one');
        }
      }
    } else {
      const publicId = ref.publicId!;
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

      url          = videoPlaybackUrl(resource.secure_url);
      thumbnailUrl = videoThumbnailUrl(resource.secure_url);
      // Cloudinary's own duration wins when present — see messaging.service.ts's
      // completeVideoAttachment for why the client-reported value is the
      // fallback rather than always 0 while the asset is still being indexed.
      durationSec  = Math.round(resource.duration || clientDurationSec || 0);
      format       = 'mp4'; // matches url — always delivered as MP4 regardless of source format
      sizeBytes    = resource.bytes ?? 0;
      provider     = 'CLOUDINARY';
      storedId     = publicId;
    }

    const entry: DeliverableVideo = {
      publicId: storedId,
      url,
      thumbnailUrl,
      durationSec,
      format,
      sizeBytes,
      label:      `Video ${existing.length + 1}`,
      uploadedAt: new Date().toISOString(),
      // Set to READY synchronously here — the checks above (format/size, plus
      // the duration check for chat) are all we verify today, no async job
      // exists yet. See VideoAssetStatus's schema comment for the future path.
      status:     'READY',
      provider,
      uploadId:   ref.uploadId,
    };

    const appended = await this.repo.appendDeliverableVideo(appId, entry);
    if (!appended) {
      if (provider === 'R2') await deleteR2Object(storedId);
      else await deleteVideo(storedId);
      throw new AppError('Maximum of 3 videos already uploaded for this application', 409);
    }

    return entry;
  }

  async removeDeliverableVideo(appId: string, userId: string, publicId: string) {
    await this.assertCanUploadDeliverable(appId, userId);
    const existing = await this.repo.getDeliverableVideos(appId);
    const entry = existing.find((v) => v.publicId === publicId);
    if (entry?.provider === 'R2') await deleteR2Object(publicId).catch(() => {});
    else await deleteVideo(publicId).catch(() => {});
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

  // Called by the campaign-expiry cron (see jobs/expireCampaigns.ts). Cascades
  // a past-deadline campaign's expiry onto its still-PENDING applications only
  // — ACCEPTED/REJECTED applications are untouched, so an accepted
  // collaboration keeps working normally (submitWork/approveWork/requestRevision
  // have no campaign-status guard) even after its parent campaign expires.
  async expireCampaignsPastDeadline() {
    const { campaigns, applications } = await this.repo.expireCampaignsPastDeadline();
    if (campaigns.length === 0) return { campaignCount: 0, applicationCount: 0 };

    const campaignById = new Map(campaigns.map((c) => [c.id, c]));

    for (const campaign of campaigns) {
      notificationService.createForAdmins({
        type:    'campaign_expired',
        title:   '⏰ Event Expired',
        body:    `"${campaign.title}" by ${campaign.business.businessName} passed its deadline and was closed.`,
        refId:   campaign.id,
        refType: 'campaign',
      }).catch(() => {});

      notificationService.create({
        userId:  campaign.business.userId,
        type:    'event_expired',
        title:   'Your event has expired',
        body:    `"${campaign.title}" passed its deadline and was automatically closed.`,
        refId:   campaign.id,
        refType: campaign.campaignType === 'OPEN_EVENT' ? 'event' : 'campaign',
      }).catch(() => {});

      logActivity({ userId: null, action: ActivityAction.CAMPAIGN_EXPIRED, entityType: EntityType.CAMPAIGN, entityId: campaign.id, metadata: { title: campaign.title } });
    }

    if (applications.length > 0) {
      notificationService.createMany(
        applications.map((a) => ({
          userId:  a.creator.userId,
          type:    'proposal_expired' as const,
          title:   'Your proposal expired',
          body:    `"${campaignById.get(a.campaignId)?.title ?? 'This event'}" reached its deadline before a decision was made on your proposal.`,
          refId:   a.campaignId,
          refType: campaignById.get(a.campaignId)?.campaignType === 'OPEN_EVENT' ? 'event' : 'campaign',
        }))
      ).catch(() => {});

      for (const app of applications) {
        logActivity({ userId: null, action: ActivityAction.APPLICATION_EXPIRED, entityType: EntityType.APPLICATION, entityId: app.id, metadata: { campaignId: app.campaignId } });
      }
    }

    return { campaignCount: campaigns.length, applicationCount: applications.length };
  }

  // ─── Event Q&A ("Ask Organizer") ──────────────────────────────────────────
  // A shared per-event Q&A page for free events (OPEN_EVENT), which never open
  // a chat. Visible to the owning business and every accepted creator; only
  // accepted creators may post questions, only the business may answer/edit.

  // Resolves the caller's relationship to the event, throwing 403/404 as
  // needed. Returns the campaign plus flags/ids the three methods below share.
  private async resolveEventQAViewer(campaignId: string, userId: string) {
    const campaign = await this.repo.findById(campaignId);
    if (!campaign) throw new AppError('Event not found', 404);
    if (campaign.campaignType !== 'OPEN_EVENT') {
      throw new AppError('Q&A is only available for free events', 400);
    }

    const business = await this.businessRepo.findByUserId(userId);
    const isBusinessOwner = !!business && business.id === campaign.businessId;

    let creatorId: string | undefined;
    if (!isBusinessOwner) {
      const creator = await this.creatorRepo.findByUserId(userId);
      if (creator) {
        const accepted = await this.repo.findAcceptedApplication(campaignId, creator.id);
        if (accepted) creatorId = creator.id;
      }
    }

    if (!isBusinessOwner && !creatorId) {
      throw new AppError('Only the organizer and accepted creators can view this page', 403);
    }

    return { campaign, isBusinessOwner, creatorId };
  }

  async listEventQuestions(campaignId: string, userId: string) {
    const { isBusinessOwner, creatorId } = await this.resolveEventQAViewer(campaignId, userId);
    const questions = await this.repo.findEventQuestions(campaignId);
    return questions.map((q) =>
      toEventQuestionDto(q, { includeAsker: isBusinessOwner, viewerCreatorId: creatorId }),
    );
  }

  async askEventQuestion(campaignId: string, userId: string, question: string) {
    const { campaign, isBusinessOwner, creatorId } = await this.resolveEventQAViewer(campaignId, userId);
    if (isBusinessOwner || !creatorId) {
      throw new AppError('Only accepted creators can ask a question', 403);
    }

    const raw = await this.repo.createEventQuestion({ campaignId, creatorId, question });

    const business = await this.businessRepo.findById(campaign.businessId);
    if (business) {
      notificationService.create({
        userId:  business.userId,
        type:    'event_question_asked',
        title:   `New question about "${campaign.title}"`,
        body:    `${raw.creator.fullName ?? 'A creator'} asked a question about your event. Tap to answer it.`,
        refId:   campaign.id,
        refType: 'event',
      }).catch(() => {});
    }

    return toEventQuestionDto(raw, { includeAsker: false, viewerCreatorId: creatorId });
  }

  async answerEventQuestion(campaignId: string, questionId: string, userId: string, answer: string) {
    const { campaign, isBusinessOwner } = await this.resolveEventQAViewer(campaignId, userId);
    if (!isBusinessOwner) {
      throw new AppError('Only the organizer can answer questions', 403);
    }

    const existing = await this.repo.findEventQuestionById(questionId);
    if (!existing || existing.campaignId !== campaignId) {
      throw new AppError('Question not found', 404);
    }

    const firstAnswer = existing.answeredAt === null;
    const raw = await this.repo.updateEventQuestionAnswer(questionId, answer, firstAnswer);

    // The answer is useful to every accepted creator, not just the asker — the
    // page is shared, so fan the notification out to all of them.
    const creatorUserIds = await this.repo.findAcceptedCreatorUserIds(campaignId);
    const snippet = raw.question.length > 80 ? `${raw.question.slice(0, 80)}…` : raw.question;
    if (creatorUserIds.length > 0) {
      notificationService.createMany(
        creatorUserIds.map((uid) => ({
          userId:  uid,
          type:    'event_question_answered',
          title:   `The organizer answered a question about "${campaign.title}"`,
          body:    `Q: "${snippet}" — tap to see the answer.`,
          refId:   campaign.id,
          refType: 'event',
        })),
      ).catch(() => {});
    }

    return toEventQuestionDto(raw, { includeAsker: true });
  }
}
