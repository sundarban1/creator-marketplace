import { AppError } from '../../middleware/error';
import { AnalyticsRepository } from './analytics.repository';
import { CampaignRepository } from '../campaign/campaign.repository';
import { CreatorRepository } from '../creator/creator.repository';
import { BusinessRepository } from '../business/business.repository';
import { parseRange, rangeStart, bucketGranularity, bucketKey, type AnalyticsRange } from './dateRange';

const PROFILE_VIEW_DEDUP_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Profile completion weights (sum to 100) — see plan doc for why "Cover
// Image"/"Languages" from the PRD's example table were substituted with
// fields that actually exist on CreatorProfile.
const COMPLETION_WEIGHTS = {
  photo: 10,
  socialLinks: 10,
  bio: 10,
  categories: 15,
  portfolio: 15,
  preferredPlatforms: 5,
  location: 10,
  pricing: 10,
  paymentMethod: 10,
  verification: 5,
} as const;

export class AnalyticsService {
  private repo: AnalyticsRepository;
  private campaignRepo: CampaignRepository;
  private creatorRepo: CreatorRepository;
  private businessRepo: BusinessRepository;

  constructor() {
    this.repo = new AnalyticsRepository();
    this.campaignRepo = new CampaignRepository();
    this.creatorRepo = new CreatorRepository();
    this.businessRepo = new BusinessRepository();
  }

  // ── Profile views ────────────────────────────────────────────────────────
  // Fire-and-forget from the caller — never throws, a tracking failure must
  // never break the actual profile-view response. `creatorProfileId`/
  // `businessProfileId` dedup the ProfileView row; `creatorUserId` is the key
  // the aggregated CreatorAnalytics table uses.
  async recordProfileView(creatorProfileId: string, businessProfileId: string, creatorUserId: string) {
    try {
      const alreadyViewed = await this.repo.hasRecentView(creatorProfileId, businessProfileId, PROFILE_VIEW_DEDUP_MS);
      if (alreadyViewed) return;
      await this.repo.createProfileView(creatorProfileId, businessProfileId);
      await this.repo.incrCreator(creatorUserId, { totalProfileViews: 1 });
    } catch {
      // best-effort
    }
  }

  // ── Simple counters ──────────────────────────────────────────────────────

  incrCampaignPublished(businessUserId: string) {
    return this.repo.incrBrand(businessUserId, { campaignsCreated: 1, activeCampaigns: 1 }).catch(() => {});
  }

  incrInvitationReceived(creatorUserId: string) {
    return this.repo.incrCreator(creatorUserId, { invitationsReceived: 1 }).catch(() => {});
  }

  incrProposalSubmitted(creatorUserId: string, businessUserId: string) {
    return Promise.all([
      this.repo.incrCreator(creatorUserId, { applicationsSubmitted: 1 }),
      this.repo.incrBrand(businessUserId, { applicationsReceived: 1 }),
    ]).catch(() => {});
  }

  async incrProposalAccepted(creatorUserId: string, creatorProfileId: string, businessUserId: string, businessProfileId: string, appId: string) {
    try {
      const alreadyHired = await this.repo.hasPriorAcceptedApplication(creatorProfileId, businessProfileId, appId);
      await this.repo.incrCreator(creatorUserId, { applicationsAccepted: 1 });
      if (!alreadyHired) {
        await this.repo.incrBrand(businessUserId, { creatorsHired: 1 });
      }
    } catch {
      // best-effort
    }
  }

  incrProposalRejected(creatorUserId: string) {
    return this.repo.incrCreator(creatorUserId, { applicationsRejected: 1 }).catch(() => {});
  }

  incrCampaignStarted(creatorUserId: string) {
    return this.repo.incrCreator(creatorUserId, { activeCampaigns: 1 }).catch(() => {});
  }

  incrPaymentPaid(creatorUserId: string, amount: number) {
    return this.repo.incrCreator(creatorUserId, { pendingEarnings: amount }).catch(() => {});
  }

  incrPaymentReleased(creatorUserId: string, businessUserId: string, amount: number) {
    return Promise.all([
      this.repo.incrCreator(creatorUserId, { pendingEarnings: -amount, totalEarnings: amount }),
      this.repo.incrBrand(businessUserId, { totalSpend: amount }),
    ]).catch(() => {});
  }

  incrCampaignCompleted(creatorUserId: string, businessUserId: string) {
    return Promise.all([
      this.repo.incrCreator(creatorUserId, { activeCampaigns: -1, completedCampaigns: 1 }),
      this.repo.incrBrand(businessUserId, { activeCampaigns: -1, completedCampaigns: 1 }),
    ]).catch(() => {});
  }

  // ── Reviews ──────────────────────────────────────────────────────────────
  // Gated on the application being fully COMPLETED — the terminal state after
  // admin payment release + creator confirmation (see campaign.service.ts
  // completeProject()). One review per rater per application.
  async submitReview(appId: string, fromUserId: string, rating: number, comment: string | undefined) {
    if (rating < 1 || rating > 5) throw new AppError('Rating must be between 1 and 5', 400);

    const app = await this.campaignRepo.findApplicationById(appId);
    if (!app) throw new AppError('Application not found', 404);
    if (app.workStatus !== 'COMPLETED') throw new AppError('Reviews can only be left once the project is complete', 400);

    const creatorUserId = app.creator.userId;
    const businessUserId = app.campaign.business.userId;
    if (fromUserId !== creatorUserId && fromUserId !== businessUserId) {
      throw new AppError('Not authorized to review this application', 403);
    }
    const toUserId = fromUserId === creatorUserId ? businessUserId : creatorUserId;

    const existing = await this.repo.findExistingReview(appId, fromUserId);
    if (existing) throw new AppError('You have already reviewed this project', 409);

    const review = await this.repo.createReview({ applicationId: appId, fromUserId, toUserId, rating, comment });

    if (fromUserId === creatorUserId) {
      // creator rating the business
      await this.repo.applyBrandRatingSample(businessUserId, rating);
    } else {
      // business rating the creator
      await this.repo.applyCreatorRatingSample(creatorUserId, rating);
    }

    return review;
  }

  // ── Response time ────────────────────────────────────────────────────────
  // `replierRole` is the role of whoever just sent the message that's being
  // scored as a "response" (i.e. the previous message was from the other party).
  recordResponseTime(replierUserId: string, replierRole: 'CREATOR' | 'BUSINESS', minutes: number) {
    const promise = replierRole === 'CREATOR'
      ? this.repo.applyCreatorResponseSample(replierUserId, minutes)
      : this.repo.applyBrandResponseSample(replierUserId, minutes);
    return promise.catch(() => {});
  }

  // ── Reads ────────────────────────────────────────────────────────────────

  async getCreatorAnalytics(userId: string, rawRange: unknown) {
    const profile = await this.creatorRepo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    const range = parseRange(rawRange);
    const since = rangeStart(range);

    const [row, breakdown, invitationsInRange, viewsInRange, viewsLast30, viewsPrev30, earningsRows, referrals] = await Promise.all([
      this.repo.findCreatorRow(userId),
      this.repo.creatorCampaignBreakdown(profile.id, since),
      this.repo.countInvitationsSince(profile.id, since),
      this.repo.countProfileViewsSince(profile.id, since),
      this.repo.countProfileViewsSince(profile.id, new Date(Date.now() - THIRTY_DAYS_MS)),
      this.repo.countProfileViewsSince(profile.id, new Date(Date.now() - 2 * THIRTY_DAYS_MS)),
      this.repo.creatorEarningsSeries(profile.id, since),
      this.repo.creatorReferralStats(profile.id),
    ]);

    const totals = row ?? {
      totalProfileViews: 0, totalEarnings: 0, pendingEarnings: 0, invitationsReceived: 0,
      applicationsSubmitted: 0, applicationsAccepted: 0, applicationsRejected: 0,
      activeCampaigns: 0, completedCampaigns: 0, averageRating: 0, reviewCount: 0,
      responseTimeAvgMins: 0, responseTimeSamples: 0,
    };
    const completionRate = totals.applicationsAccepted > 0
      ? (totals.completedCampaigns / totals.applicationsAccepted) * 100
      : 0;

    // "Prev 30" here is days 31-60 back (viewsPrev30 already includes the last
    // 30 days too, since countProfileViewsSince is >= a cutoff) — subtract to
    // isolate the prior period for a trend comparison.
    const priorPeriodOnly = Math.max(0, viewsPrev30 - viewsLast30);
    const trendPct = priorPeriodOnly > 0
      ? ((viewsLast30 - priorPeriodOnly) / priorPeriodOnly) * 100
      : (viewsLast30 > 0 ? 100 : 0);

    return {
      range,
      totals: {
        totalProfileViews: totals.totalProfileViews,
        profileViewsInRange: viewsInRange,
        profileViewsLast30Days: viewsLast30,
        profileViewsTrendPct: Math.round(trendPct),
        totalEarnings: totals.totalEarnings,
        pendingEarnings: totals.pendingEarnings,
        invitationsReceived: totals.invitationsReceived,
        applicationsSubmitted: totals.applicationsSubmitted,
        applicationsAccepted: totals.applicationsAccepted,
        applicationsRejected: totals.applicationsRejected,
        activeCampaigns: totals.activeCampaigns,
        completedCampaigns: totals.completedCampaigns,
        averageRating: totals.averageRating,
        reviewCount: totals.reviewCount,
        responseTimeAvgMins: Math.round(totals.responseTimeAvgMins),
        completionRate: Math.round(completionRate),
        profileCompletion: this.computeProfileCompletion(profile),
      },
      campaignBreakdown: {
        invitationsReceived: invitationsInRange,
        applicationsSubmitted: breakdown.submitted,
        accepted: breakdown.accepted,
        rejected: breakdown.rejected,
        active: breakdown.active,
        completed: breakdown.completed,
      },
      referrals,
      charts: {
        earningsTrend: this.bucketSums(earningsRows.map((r) => ({ date: r.releasedAt!, amount: r.proposedRate })), range),
      },
    };
  }

  async getBrandAnalytics(userId: string, rawRange: unknown) {
    const profile = await this.businessRepo.findByUserId(userId);
    if (!profile) throw new AppError('Business profile not found', 404);

    const range = parseRange(rawRange);
    const since = rangeStart(range);

    const [row, statusBreakdown, spendingRows, applicationRows] = await Promise.all([
      this.repo.findBrandRow(userId),
      this.repo.brandCampaignBreakdown(profile.id, since),
      this.repo.brandSpendingSeries(profile.id, since),
      this.repo.brandApplicationsSeries(profile.id, since),
    ]);

    const totals = row ?? {
      campaignsCreated: 0, activeCampaigns: 0, completedCampaigns: 0, totalSpend: 0,
      applicationsReceived: 0, creatorsHired: 0, averageRatingGiven: 0, ratingsGivenCount: 0,
      responseTimeAvgMins: 0, responseTimeSamples: 0,
    };

    return {
      range,
      totals: {
        campaignsCreated: totals.campaignsCreated,
        activeCampaigns: totals.activeCampaigns,
        completedCampaigns: totals.completedCampaigns,
        totalSpend: totals.totalSpend,
        applicationsReceived: totals.applicationsReceived,
        creatorsHired: totals.creatorsHired,
        averageRatingGiven: totals.averageRatingGiven,
        ratingsGivenCount: totals.ratingsGivenCount,
        responseTimeAvgMins: Math.round(totals.responseTimeAvgMins),
      },
      campaignStatus: statusBreakdown,
      charts: {
        monthlySpending: this.bucketSums(spendingRows.map((r) => ({ date: r.releasedAt!, amount: r.proposedRate })), range),
        applicationsReceived: this.bucketCounts(applicationRows.map((r) => r.createdAt), range),
      },
    };
  }

  // ── Public profile stats (shown to the *other* role when viewing a
  // creator/brand's public profile — a small subset of the private
  // dashboard, never earnings/referrals) ──────────────────────────────────

  async getCreatorPublicStats(userId: string) {
    const [row, profile] = await Promise.all([
      this.repo.findCreatorRow(userId),
      this.creatorRepo.findByUserId(userId),
    ]);
    const totals = row ?? {
      applicationsAccepted: 0, completedCampaigns: 0, averageRating: 0,
      reviewCount: 0, responseTimeAvgMins: 0,
    };
    const completionRate = totals.applicationsAccepted > 0
      ? (totals.completedCampaigns / totals.applicationsAccepted) * 100
      : 0;
    return {
      profileCompletion: profile ? this.computeProfileCompletion(profile).percent : 0,
      averageRating: totals.averageRating,
      reviewCount: totals.reviewCount,
      responseTimeAvgMins: Math.round(totals.responseTimeAvgMins),
      completionRate: Math.round(completionRate),
    };
  }

  async getBrandPublicStats(userId: string) {
    const row = await this.repo.findBrandRow(userId);
    const totals = row ?? { averageRatingGiven: 0, ratingsGivenCount: 0, responseTimeAvgMins: 0 };
    return {
      averageRatingGiven: totals.averageRatingGiven,
      ratingsGivenCount: totals.ratingsGivenCount,
      responseTimeAvgMins: Math.round(totals.responseTimeAvgMins),
    };
  }

  // ── Admin: view any user's analytics ────────────────────────────────────

  async getAnalyticsForUser(targetUserId: string, rawRange: unknown) {
    const [creatorProfile, businessProfile] = await Promise.all([
      this.creatorRepo.findByUserId(targetUserId),
      this.businessRepo.findByUserId(targetUserId),
    ]);
    if (creatorProfile) return { role: 'CREATOR' as const, ...(await this.getCreatorAnalytics(targetUserId, rawRange)) };
    if (businessProfile) return { role: 'BUSINESS' as const, ...(await this.getBrandAnalytics(targetUserId, rawRange)) };
    throw new AppError('User has no creator or business profile', 404);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private computeProfileCompletion(profile: {
    avatarUrl: string | null; bio: string | null; categories: string[]; portfolioLinks: unknown;
    prefPlatforms: string[]; location: string | null; prefBudgetMin: number; prefBudgetMax: number;
    paymentMethods: string[]; isVerified: boolean; socialAccounts?: unknown[];
  }) {
    const portfolioCount = Array.isArray(profile.portfolioLinks) ? profile.portfolioLinks.length : 0;
    const checks: { key: keyof typeof COMPLETION_WEIGHTS; done: boolean; label: string }[] = [
      { key: 'photo', done: !!profile.avatarUrl, label: 'Profile Photo' },
      { key: 'socialLinks', done: (profile.socialAccounts?.length ?? 0) > 0, label: 'Social Links' },
      { key: 'bio', done: !!profile.bio, label: 'Bio' },
      { key: 'categories', done: profile.categories.length > 0, label: 'Categories' },
      { key: 'portfolio', done: portfolioCount > 0, label: 'Portfolio' },
      { key: 'preferredPlatforms', done: profile.prefPlatforms.length > 0, label: 'Preferred Platforms' },
      { key: 'location', done: !!profile.location, label: 'Location' },
      { key: 'pricing', done: profile.prefBudgetMin > 0 || profile.prefBudgetMax > 0, label: 'Pricing Preference' },
      { key: 'paymentMethod', done: profile.paymentMethods.length > 0, label: 'Payment Method' },
      { key: 'verification', done: profile.isVerified, label: 'Verification' },
    ];
    const earned = checks.filter((c) => c.done).reduce((sum, c) => sum + COMPLETION_WEIGHTS[c.key], 0);
    const missing = checks.filter((c) => !c.done).map((c) => c.label);
    return { percent: earned, missing };
  }

  private bucketSums(rows: { date: Date; amount: number }[], range: AnalyticsRange) {
    const granularity = bucketGranularity(range);
    const map = new Map<string, number>();
    for (const row of rows) {
      const key = bucketKey(row.date, granularity);
      map.set(key, (map.get(key) ?? 0) + row.amount);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([bucket, amount]) => ({ bucket, amount }));
  }

  private bucketCounts(dates: Date[], range: AnalyticsRange) {
    const granularity = bucketGranularity(range);
    const map = new Map<string, number>();
    for (const date of dates) {
      const key = bucketKey(date, granularity);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([bucket, count]) => ({ bucket, count }));
  }
}

export const analyticsService = new AnalyticsService();
