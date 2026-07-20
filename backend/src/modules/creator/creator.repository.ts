import { Prisma } from '@prisma/client';
import prisma from '../../prisma';

export class CreatorRepository {
  async findMany(filters: {
    search?: string;
    categories?: string[];
    location?: string;
    platforms?: string[];
    priceMin?: number;
    priceMax?: number;
    excludeId?: string;
    page: number;
    limit: number;
  }) {
    const PRICE_MAX = 1000;
    const where: Prisma.CreatorProfileWhereInput = {};

    if (filters.search) {
      where.fullName = { contains: filters.search, mode: 'insensitive' };
    }
    if (filters.categories?.length) where.categories = { hasSome: filters.categories };
    if (filters.location) where.location = { contains: filters.location, mode: 'insensitive' };
    if (filters.excludeId) where.id = { not: filters.excludeId };

    if (filters.platforms?.length) {
      where.socialAccounts = { some: { platform: { in: filters.platforms } } };
    }

    const andConditions: Prisma.CreatorProfileWhereInput[] = [];
    if (filters.priceMin !== undefined && filters.priceMin > 0) {
      andConditions.push({ prefBudgetMax: { gte: filters.priceMin } });
    }
    if (filters.priceMax !== undefined && filters.priceMax < PRICE_MAX) {
      andConditions.push({ prefBudgetMin: { lte: filters.priceMax } });
    }
    if (andConditions.length) where.AND = andConditions;

    const skip = (filters.page - 1) * filters.limit;
    const [creators, total] = await Promise.all([
      prisma.creatorProfile.findMany({
        where,
        skip,
        take: filters.limit,
        // `id` is a tie-breaker, not a display order — createdAt alone isn't
        // unique (bulk-seeded rows can share a timestamp), and without a fully
        // deterministic sort, Postgres can return the same row on two
        // different pages (or skip one entirely) as the result set shifts
        // between paginated queries.
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        select: {
          id: true, fullName: true, bio: true, avatarUrl: true,
          location: true, categories: true, isVerified: true,
          citizenshipStatus: true,
          prefBudgetMin: true, prefBudgetMax: true,
          socialAccounts: { select: { platform: true, followers: true } },
          user: { select: { isEmailVerified: true, isPhoneVerified: true } },
        },
      }),
      prisma.creatorProfile.count({ where }),
    ]);
    return { creators, total };
  }

  /**
   * Candidate pool for "recommended creators" on a newly-published campaign —
   * category-matched, capped to a generous pool so the caller can rank by
   * distance (when the campaign has coordinates) before trimming to the final
   * on-screen count. Doesn't do the distance math itself since that needs the
   * campaign's lat/lng, which lives outside this repository.
   */
  async findRecommended(category: string) {
    return prisma.creatorProfile.findMany({
      where: { categories: { has: category } },
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, userId: true, fullName: true, bio: true, avatarUrl: true,
        location: true, categories: true, isVerified: true,
        citizenshipStatus: true,
        locationLat: true, locationLng: true,
        prefBudgetMin: true, prefBudgetMax: true,
        socialAccounts: { select: { platform: true, followers: true } },
        user: { select: { isEmailVerified: true, isPhoneVerified: true } },
      },
    });
  }

  // CreatorAnalytics has no Prisma relation to CreatorProfile (bare userId PK) —
  // joined in application code by the caller (see CreatorService.getRecommendedForCampaign).
  async findAnalyticsByUserIds(userIds: string[]) {
    return prisma.creatorAnalytics.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, completedCampaigns: true, applicationsAccepted: true, averageRating: true, reviewCount: true },
    });
  }

  async getFilterOptions() {
    const [profiles, accounts] = await Promise.all([
      prisma.creatorProfile.findMany({ select: { categories: true } }),
      prisma.socialAccount.findMany({ select: { platform: true }, distinct: ['platform'] }),
    ]);
    const categories = [...new Set(profiles.flatMap((p) => p.categories))].sort();
    const platforms = accounts.map((a) => a.platform).sort();
    return { categories, platforms };
  }

  async findByUserId(userId: string) {
    return prisma.creatorProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, phone: true, role: true, isEmailVerified: true, isPhoneVerified: true, isOnboarded: true } },
        socialAccounts: { orderBy: { createdAt: 'asc' } },
        _count: { select: { savedBy: true } },
      },
    });
  }

  async findById(id: string) {
    return prisma.creatorProfile.findUnique({ where: { id } });
  }

  async findByIdPublic(id: string) {
    return prisma.creatorProfile.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        fullName: true,
        username: true,
        bio: true,
        avatarUrl: true,
        location: true,
        categories: true,
        isVerified: true,
        citizenshipStatus: true,
        prefBudgetMin: true,
        prefBudgetMax: true,
        prefPlatforms: true,
        portfolioLinks: true,
        socialLinks: true,
        socialAccounts: {
          select: { id: true, platform: true, followers: true, profileUrl: true, connectedViaOAuth: true },
          orderBy: { followers: 'desc' },
        },
        user: { select: { isEmailVerified: true, isPhoneVerified: true } },
      },
    });
  }

  async findByUsername(username: string) {
    return prisma.creatorProfile.findUnique({ where: { username } });
  }

  async updateCitizenship(userId: string, docUrl: string) {
    return prisma.creatorProfile.update({
      where: { userId },
      data:  { citizenshipDocUrl: docUrl, citizenshipStatus: 'PENDING', citizenshipUploadedAt: new Date() },
    });
  }

  async updatePan(userId: string, docUrl: string) {
    return prisma.creatorProfile.update({
      where: { userId },
      data:  { panDocUrl: docUrl, panDocStatus: 'PENDING', panDocUploadedAt: new Date() },
    });
  }

  async update(userId: string, data: Partial<{
    username:    string;
    fullName:    string;
    bio:         string;
    location:    string;
    locationLat: number;
    locationLng: number;
    avatarUrl:   string;
    coverImageUrl: string;
    categories:  string[];
    nearbyRadiusKm:        number;
    nearbyUseHomeLocation: boolean;
  }>) {
    return prisma.creatorProfile.update({ where: { userId }, data });
  }

  async getUserEmailStatus(userId: string) {
    return prisma.user.findUnique({ where: { id: userId }, select: { email: true, isEmailVerified: true } });
  }

  async findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, select: { id: true } });
  }

  // Sets the account email without marking it verified — verification still
  // happens through the separate request-email-otp/verify-email-otp flow.
  async setAccountEmail(userId: string, email: string) {
    return prisma.user.update({ where: { id: userId }, data: { email } });
  }

  async addPortfolioLink(
    userId: string,
    link: { id: string; label: string; url: string },
    currentLinks: { id: string; label: string; url: string }[]
  ) {
    return prisma.creatorProfile.update({
      where: { userId },
      data: { portfolioLinks: [...currentLinks, link] },
    });
  }

  async removePortfolioLink(
    userId: string,
    linkId: string,
    currentLinks: { id: string; label: string; url: string }[]
  ) {
    return prisma.creatorProfile.update({
      where: { userId },
      data: { portfolioLinks: currentLinks.filter((l) => l.id !== linkId) },
    });
  }

  async updateSocialLinks(userId: string, socialLinks: Record<string, string | null | undefined>) {
    return prisma.creatorProfile.update({ where: { userId }, data: { socialLinks } });
  }

  // ── Social Accounts (structured table) ──────────────────────────────────────

  async findSocialAccountsByUserId(userId: string) {
    const profile = await prisma.creatorProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!profile) return [];
    return prisma.socialAccount.findMany({
      where: { creatorProfileId: profile.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findSocialAccountById(id: string) {
    return prisma.socialAccount.findUnique({ where: { id } });
  }

  async addSocialAccount(creatorProfileId: string, data: { platform: string; profileUrl: string; followers: number }) {
    return prisma.socialAccount.create({ data: { creatorProfileId, ...data } });
  }

  async updateSocialAccount(id: string, data: { profileUrl?: string; followers?: number }) {
    return prisma.socialAccount.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
  }

  async deleteSocialAccount(id: string) {
    return prisma.socialAccount.delete({ where: { id } });
  }

  async findSocialAccountByPlatform(creatorProfileId: string, platform: string) {
    return prisma.socialAccount.findUnique({ where: { creatorProfileId_platform: { creatorProfileId, platform } } });
  }

  // Used by OAuth-connect flows (e.g. YouTube) — creates the row on first connect,
  // or refreshes profileUrl/followers/avatar on a reconnect. Also persists whatever
  // token data the platform gave back so the follower count can keep refreshing
  // itself afterwards (see refreshAllSocialAccountFollowers in creator.service.ts)
  // without the creator ever having to reconnect or tap anything.
  async upsertOAuthSocialAccount(
    creatorProfileId: string,
    platform: string,
    data: {
      profileUrl: string;
      followers: number;
      platformUserId: string;
      avatarUrl?: string;
      accessToken?: string;
      refreshToken?: string;
      tokenExpiresAt?: Date;
      oauthConnectionType?: string;
    },
  ) {
    const now = new Date();
    return prisma.socialAccount.upsert({
      where: { creatorProfileId_platform: { creatorProfileId, platform } },
      create: { creatorProfileId, platform, connectedViaOAuth: true, followersSyncedAt: now, ...data },
      update: { connectedViaOAuth: true, followersSyncedAt: now, updatedAt: now, ...data },
    });
  }

  // All OAuth-connected accounts with a stored token, across every creator — used by
  // the scheduled job so follower counts keep drifting toward accurate on their own,
  // with no action needed from the creator.
  async findAllRefreshableSocialAccounts() {
    return prisma.socialAccount.findMany({
      where: { connectedViaOAuth: true, accessToken: { not: null } },
    });
  }

  // This one creator's connected accounts that haven't been synced in a while —
  // used to silently top up stale numbers the moment their Social Accounts screen
  // loads, on top of the scheduled job, so opening the app is itself enough to see
  // current numbers without waiting for the next scheduled run.
  async findStaleSocialAccounts(creatorProfileId: string, staleBefore: Date) {
    return prisma.socialAccount.findMany({
      where: {
        creatorProfileId,
        connectedViaOAuth: true,
        accessToken: { not: null },
        OR: [{ followersSyncedAt: null }, { followersSyncedAt: { lt: staleBefore } }],
      },
    });
  }

  async updateFollowerSync(
    id: string,
    data: { followers: number; accessToken?: string; refreshToken?: string; tokenExpiresAt?: Date },
  ) {
    return prisma.socialAccount.update({
      where: { id },
      data: { ...data, followersSyncedAt: new Date() },
    });
  }

  // ── Payment Methods ──────────────────────────────────────────────────────────

  async updatePaymentMethods(userId: string, methods: string[]) {
    return prisma.creatorProfile.update({ where: { userId }, data: { paymentMethods: methods } });
  }

  async updateCampaignPrefs(userId: string, data: {
    categories?:   string[];
    prefPlatforms?: string[];
    prefLocations?: string[];
    prefBudgetMin?: number;
    prefBudgetMax?: number;
  }) {
    return prisma.creatorProfile.update({ where: { userId }, data });
  }

  // ── Earnings Summary ─────────────────────────────────────────────────────────

  async getEarningsSummary(userId: string) {
    const profile = await prisma.creatorProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!profile) return { totalEarned: 0, pendingEarnings: 0, totalApplications: 0 };

    const [accepted, pending, total] = await Promise.all([
      prisma.application.aggregate({
        where: { creatorId: profile.id, status: 'ACCEPTED' },
        _sum: { proposedRate: true },
      }),
      prisma.application.aggregate({
        where: { creatorId: profile.id, status: 'PENDING' },
        _sum: { proposedRate: true },
      }),
      prisma.application.count({ where: { creatorId: profile.id } }),
    ]);

    return {
      totalEarned:       accepted._sum.proposedRate ?? 0,
      pendingEarnings:   pending._sum.proposedRate  ?? 0,
      totalApplications: total,
    };
  }
}
