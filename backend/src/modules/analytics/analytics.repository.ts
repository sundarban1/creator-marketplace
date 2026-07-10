import prisma from '../../prisma';

type CreatorField =
  | 'totalProfileViews' | 'totalEarnings' | 'pendingEarnings' | 'invitationsReceived'
  | 'applicationsSubmitted' | 'applicationsAccepted' | 'applicationsRejected'
  | 'activeCampaigns' | 'completedCampaigns';

type BrandField =
  | 'campaignsCreated' | 'activeCampaigns' | 'completedCampaigns' | 'totalSpend'
  | 'applicationsReceived' | 'creatorsHired';

export class AnalyticsRepository {
  // ── Generic increment helpers ──────────────────────────────────────────────
  // Upsert so the very first event for a user creates its analytics row —
  // callers never need to pre-create one.

  async incrCreator(userId: string, deltas: Partial<Record<CreatorField, number>>) {
    const update = Object.fromEntries(
      Object.entries(deltas).map(([k, v]) => [k, { increment: v }]),
    );
    const create = { userId, ...deltas };
    return prisma.creatorAnalytics.upsert({ where: { userId }, update, create });
  }

  async incrBrand(userId: string, deltas: Partial<Record<BrandField, number>>) {
    const update = Object.fromEntries(
      Object.entries(deltas).map(([k, v]) => [k, { increment: v }]),
    );
    const create = { userId, ...deltas };
    return prisma.brandAnalytics.upsert({ where: { userId }, update, create });
  }

  async findCreatorRow(userId: string) {
    return prisma.creatorAnalytics.findUnique({ where: { userId } });
  }

  async findBrandRow(userId: string) {
    return prisma.brandAnalytics.findUnique({ where: { userId } });
  }

  // ── Profile views ────────────────────────────────────────────────────────

  async hasRecentView(creatorId: string, businessId: string, sinceMs: number) {
    const view = await prisma.profileView.findFirst({
      where: { creatorId, businessId, viewedAt: { gte: new Date(Date.now() - sinceMs) } },
      select: { id: true },
    });
    return !!view;
  }

  async createProfileView(creatorId: string, businessId: string) {
    return prisma.profileView.create({ data: { creatorId, businessId } });
  }

  // ── Reviews / ratings (running average) ─────────────────────────────────

  async createReview(data: { applicationId: string; fromUserId: string; toUserId: string; rating: number; comment?: string }) {
    return prisma.review.create({ data });
  }

  async findExistingReview(applicationId: string, fromUserId: string) {
    return prisma.review.findUnique({ where: { applicationId_fromUserId: { applicationId, fromUserId } } });
  }

  async applyCreatorRatingSample(userId: string, rating: number) {
    const row = await prisma.creatorAnalytics.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    const newCount = row.reviewCount + 1;
    const newAvg = (row.averageRating * row.reviewCount + rating) / newCount;
    return prisma.creatorAnalytics.update({
      where: { userId },
      data: { averageRating: newAvg, reviewCount: newCount },
    });
  }

  async applyBrandRatingSample(userId: string, rating: number) {
    const row = await prisma.brandAnalytics.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    const newCount = row.ratingsGivenCount + 1;
    const newAvg = (row.averageRatingGiven * row.ratingsGivenCount + rating) / newCount;
    return prisma.brandAnalytics.update({
      where: { userId },
      data: { averageRatingGiven: newAvg, ratingsGivenCount: newCount },
    });
  }

  // ── Response time (running average, minutes) ────────────────────────────

  async applyCreatorResponseSample(userId: string, minutes: number) {
    const row = await prisma.creatorAnalytics.upsert({ where: { userId }, update: {}, create: { userId } });
    const newCount = row.responseTimeSamples + 1;
    const newAvg = (row.responseTimeAvgMins * row.responseTimeSamples + minutes) / newCount;
    return prisma.creatorAnalytics.update({
      where: { userId },
      data: { responseTimeAvgMins: newAvg, responseTimeSamples: newCount },
    });
  }

  async applyBrandResponseSample(userId: string, minutes: number) {
    const row = await prisma.brandAnalytics.upsert({ where: { userId }, update: {}, create: { userId } });
    const newCount = row.responseTimeSamples + 1;
    const newAvg = (row.responseTimeAvgMins * row.responseTimeSamples + minutes) / newCount;
    return prisma.brandAnalytics.update({
      where: { userId },
      data: { responseTimeAvgMins: newAvg, responseTimeSamples: newCount },
    });
  }

  // ── Creators-hired uniqueness check ─────────────────────────────────────

  async hasPriorAcceptedApplication(creatorId: string, businessId: string, excludeAppId: string) {
    const existing = await prisma.application.findFirst({
      where: {
        creatorId,
        status: 'ACCEPTED',
        id: { not: excludeAppId },
        campaign: { businessId },
      },
      select: { id: true },
    });
    return !!existing;
  }

  // ── Range-filtered reads (for the date-filter + charts, not stored) ────

  async countProfileViewsSince(creatorId: string, since: Date | null) {
    return prisma.profileView.count({
      where: { creatorId, ...(since ? { viewedAt: { gte: since } } : {}) },
    });
  }

  async creatorCampaignBreakdown(creatorProfileId: string, since: Date | null) {
    const where = since ? { createdAt: { gte: since } } : {};
    const [submitted, accepted, rejected, active, completed] = await Promise.all([
      prisma.application.count({ where: { creatorId: creatorProfileId, ...where } }),
      prisma.application.count({ where: { creatorId: creatorProfileId, status: 'ACCEPTED', ...where } }),
      prisma.application.count({ where: { creatorId: creatorProfileId, status: 'REJECTED', ...where } }),
      prisma.application.count({ where: { creatorId: creatorProfileId, workStatus: { in: ['IN_PROGRESS', 'SUBMITTED'] }, ...where } }),
      prisma.application.count({ where: { creatorId: creatorProfileId, workStatus: 'COMPLETED', ...where } }),
    ]);
    return { submitted, accepted, rejected, active, completed };
  }

  async countInvitationsSince(creatorProfileId: string, since: Date | null) {
    return prisma.campaignInvitation.count({
      where: { creatorId: creatorProfileId, ...(since ? { createdAt: { gte: since } } : {}) },
    });
  }

  async creatorEarningsSeries(creatorProfileId: string, since: Date | null) {
    return prisma.application.findMany({
      where: {
        creatorId: creatorProfileId,
        paymentStatus: 'RELEASED',
        releasedAt: since ? { gte: since } : { not: null },
      },
      select: { releasedAt: true, proposedRate: true },
    });
  }

  async brandCampaignBreakdown(businessId: string, since: Date | null) {
    const where = { businessId, ...(since ? { createdAt: { gte: since } } : {}) };
    const [draft, active, paused, closed, cancelled] = await Promise.all([
      prisma.campaign.count({ where: { ...where, status: 'DRAFT' } }),
      prisma.campaign.count({ where: { ...where, status: 'ACTIVE' } }),
      prisma.campaign.count({ where: { ...where, status: 'PAUSED' } }),
      prisma.campaign.count({ where: { ...where, status: 'CLOSED' } }),
      prisma.campaign.count({ where: { ...where, status: 'CANCELLED' } }),
    ]);
    return { draft, active, paused, closed, cancelled };
  }

  async brandSpendingSeries(businessId: string, since: Date | null) {
    return prisma.application.findMany({
      where: {
        campaign: { businessId },
        paymentStatus: 'RELEASED',
        releasedAt: since ? { gte: since } : { not: null },
      },
      select: { releasedAt: true, proposedRate: true },
    });
  }

  async brandApplicationsSeries(businessId: string, since: Date | null) {
    return prisma.application.findMany({
      where: {
        campaign: { businessId },
        createdAt: since ? { gte: since } : undefined,
      },
      select: { createdAt: true },
    });
  }

  // ── Referral stats (live — cheap, already indexed by referrerId) ───────

  async creatorReferralStats(creatorProfileId: string) {
    const [totalInvites, successful, pending, rewardRows] = await Promise.all([
      prisma.referral.count({ where: { referrerId: creatorProfileId } }),
      prisma.referral.count({ where: { referrerId: creatorProfileId, status: 'COMPLETED' } }),
      prisma.referral.count({ where: { referrerId: creatorProfileId, status: 'PENDING' } }),
      prisma.referral.aggregate({ where: { referrerId: creatorProfileId, status: 'COMPLETED' }, _sum: { rewardAmount: true } }),
    ]);
    return {
      totalInvites,
      successfulReferrals: successful,
      pendingRewards: pending,
      rewardsEarned: Number(rewardRows._sum.rewardAmount ?? 0),
    };
  }
}
