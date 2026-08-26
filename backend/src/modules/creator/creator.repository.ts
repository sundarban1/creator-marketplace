import { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import { expandSearchQuery, filterByTerms, substringSafeTerms } from '../../utils/searchTerms';

// Distinct values of the two scalar-array label columns, so search can map a
// query onto the labels it should match (see findMany). Cached because search
// runs on every keystroke-debounced request while the vocabulary only changes
// when someone onboards or edits their profile.
const LABEL_VOCABULARY_TTL_MS = 5 * 60_000;
let labelVocabulary: { loadedAt: number; categories: string[]; industries: string[] } | null = null;

async function creatorLabelVocabulary() {
  if (labelVocabulary && Date.now() - labelVocabulary.loadedAt < LABEL_VOCABULARY_TTL_MS) {
    return labelVocabulary;
  }
  const rows = await prisma.$queryRaw<{ kind: string; value: string }[]>`
    SELECT DISTINCT 'category' AS kind, unnest(categories) AS value FROM creator_profiles
    UNION
    SELECT DISTINCT 'industry' AS kind, unnest(industries) AS value FROM creator_profiles
  `;
  labelVocabulary = {
    loadedAt: Date.now(),
    categories: rows.filter((r) => r.kind === 'category').map((r) => r.value),
    industries: rows.filter((r) => r.kind === 'industry').map((r) => r.value),
  };
  return labelVocabulary;
}

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
    sort?: 'newest' | 'oldest' | 'followers';
  }) {
    const PRICE_MAX = 1000;
    // A creator who never finished onboarding has no fullName/categories/bio yet —
    // showing them in Explore Creators is just a blank/broken card, so they're
    // excluded here rather than filtered client-side (keeps pagination totals correct).
    const where: Prisma.CreatorProfileWhereInput = { user: { isOnboarded: true } };

    if (filters.search) {
      // Matching the name alone meant a search for "coffee" found nobody,
      // even though a barista, a café photographer and a food stylist are all
      // relevant. Same concept as the works/business searches: the query is
      // expanded into related terms (see expandSearchQuery) and matched across
      // everything that describes the person — their bio, the services they
      // list, those services' categories, and their portfolio — while the name
      // and location stay on the literal query, where expansion has no meaning.
      const q = expandSearchQuery(filters.search);
      // Unlike the other repositories this path stays in the Prisma query
      // builder (the price/platform/follower-sort filters around it are awkward
      // in raw SQL), which has no regex operator — so expanded matching uses
      // substringSafeTerms, dropping terms too short to substring-match
      // safely. The user's own query is always matched in full alongside them.
      const related = substringSafeTerms(q);
      const anywhere = (term: string): Prisma.CreatorProfileWhereInput[] => [
        { bio: { contains: term, mode: 'insensitive' } },
        { services: { some: { name: { contains: term, mode: 'insensitive' } } } },
        { services: { some: { description: { contains: term, mode: 'insensitive' } } } },
        { services: { some: { category: { name: { contains: term, mode: 'insensitive' } } } } },
        // The category's group is the umbrella term ('Photography' over
        // Photographer/Wedding Photographer, 'Music & Audio' over DJ) — a
        // search for "music" has to reach the DJ whose category never says it.
        { services: { some: { category: { group: { contains: term, mode: 'insensitive' } } } } },
        { portfolioItems: { some: { title: { contains: term, mode: 'insensitive' } } } },
        { portfolioItems: { some: { description: { contains: term, mode: 'insensitive' } } } },
      ];
      // `categories`/`industries` are scalar string arrays holding display
      // labels ("Skincare", "Events and Entertainment"), and Prisma can only
      // match those with hasSome's exact, case-sensitive equality — so a
      // search for "skin" or "event" found nobody, and even "Skincare" only
      // matched because of the casing. The raw-SQL repositories solve this
      // with `unnest(...) ~* '\m(term)'`; this path resolves the query
      // against the label vocabulary first and feeds the exact values that
      // matched back into hasSome, which comes to the same thing.
      const vocabulary = await creatorLabelVocabulary();
      const matchedCategories = filterByTerms(vocabulary.categories, q.all);
      const matchedIndustries = filterByTerms(vocabulary.industries, q.all);
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { location: { contains: filters.search, mode: 'insensitive' } },
        { city: { contains: filters.search, mode: 'insensitive' } },
        ...anywhere(filters.search),
        ...related.flatMap(anywhere),
        ...(matchedCategories.length ? [{ categories: { hasSome: matchedCategories } }] : []),
        ...(matchedIndustries.length ? [{ industries: { hasSome: matchedIndustries } }] : []),
      ];
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
    const select = {
      id: true, fullName: true, bio: true, avatarUrl: true,
      providerType: true, teamSize: true, industries: true,
      location: true, categories: true, isVerified: true,
      citizenshipStatus: true, companyRegDocStatus: true,
      prefBudgetMin: true, prefBudgetMax: true,
      socialAccounts: { select: { platform: true, followers: true } },
      user: { select: { isEmailVerified: true, isPhoneVerified: true } },
    } satisfies Prisma.CreatorProfileSelect;

    if (filters.sort === 'followers') {
      // Total followers across a creator's social accounts isn't a column
      // Prisma can ORDER BY directly (it's an aggregate over a to-many
      // relation), so this ranks in application code instead of in SQL —
      // capped to a generous candidate pool rather than the true total, same
      // scale tradeoff as CreatorService.getRecommendedForCampaign's
      // findRecommended (fine at this platform's current size; would need a
      // raw SQL GROUP BY if the creator count grows enough to matter).
      const FOLLOWERS_SORT_CAP = 1000;
      const [candidates, total] = await Promise.all([
        prisma.creatorProfile.findMany({ where, take: FOLLOWERS_SORT_CAP, orderBy: { id: 'asc' }, select }),
        prisma.creatorProfile.count({ where }),
      ]);
      const ranked = candidates
        .map((c) => ({ ...c, totalFollowers: c.socialAccounts.reduce((sum, a) => sum + a.followers, 0) }))
        .sort((a, b) => b.totalFollowers - a.totalFollowers);
      return { creators: ranked.slice(skip, skip + filters.limit), total };
    }

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
        orderBy: [{ createdAt: filters.sort === 'oldest' ? 'asc' : 'desc' }, { id: 'asc' }],
        select,
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
      where: { categories: { has: category }, user: { isOnboarded: true } },
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, userId: true, fullName: true, bio: true, avatarUrl: true,
        providerType: true, teamSize: true, industries: true,
        location: true, categories: true, isVerified: true,
        citizenshipStatus: true, companyRegDocStatus: true,
        locationLat: true, locationLng: true,
        // §79 — city/district, used to tier recommendations against the
        // admin-configured launch-priority city (see getRecommendedForCampaign).
        city: true, district: true,
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
        providerType: true,
        teamSize: true,
        industries: true,
        website: true,
        serviceMode: true,
        bio: true,
        avatarUrl: true,
        location: true,
        province: true,
        district: true,
        city: true,
        area: true,
        address: true,
        locationVisibility: true,
        showPublicProfile: true,
        hideContactDetails: true,
        hideSocialLinks: true,
        categories: true,
        isVerified: true,
        citizenshipStatus: true,
        companyRegDocStatus: true,
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

  async updateCompanyRegDoc(userId: string, docUrl: string) {
    return prisma.creatorProfile.update({
      where: { userId },
      data:  { companyRegDocUrl: docUrl, companyRegDocStatus: 'PENDING', companyRegDocUploadedAt: new Date() },
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
    location:    string | null;
    locationLat: number | null;
    locationLng: number | null;
    avatarUrl:   string;
    coverImageUrl: string;
    categories:  string[];
    nearbyRadiusKm:        number;
    nearbyUseHomeLocation: boolean;
    providerType: 'INDIVIDUAL' | 'TEAM' | 'AGENCY';
    teamSize: number | null;
    industries: string[];
    website: string | null;
    serviceMode: 'CLIENT_LOCATION' | 'MY_LOCATION' | 'ONLINE' | 'HYBRID' | null;
    panNo: string | null;
    vatNo: string | null;
    companyRegNo: string | null;
    showPublicProfile:  boolean;
    hideContactDetails: boolean;
    hideSocialLinks:    boolean;
    locationVisibility: 'EXACT' | 'CITY' | 'DISTRICT';
  }>) {
    // A new category or industry has to be searchable immediately, not once
    // the vocabulary cache above expires.
    if (data.categories || data.industries) labelVocabulary = null;
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

  // ── Availability ──────────────────────────────────────────────────────────

  async updateAvailabilityStatus(userId: string, status: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE') {
    return prisma.creatorProfile.update({ where: { userId }, data: { availabilityStatus: status } });
  }

  async getAvailabilitySchedule(creatorProfileId: string) {
    return prisma.availabilitySchedule.findMany({
      where: { creatorProfileId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  // Full replace rather than per-day upsert — the client always submits the
  // complete week, so this avoids leaving stale days behind when one is removed.
  async replaceAvailabilitySchedule(
    creatorProfileId: string,
    days: { dayOfWeek: number; availableFrom: string; availableUntil: string }[],
  ) {
    return prisma.$transaction([
      prisma.availabilitySchedule.deleteMany({ where: { creatorProfileId } }),
      prisma.availabilitySchedule.createMany({
        data: days.map((d) => ({ creatorProfileId, ...d })),
      }),
    ]);
  }

  // ── Invitations ───────────────────────────────────────────────────────────

  async findInvitations(creatorProfileId: string) {
    return prisma.campaignInvitation.findMany({
      where: { creatorId: creatorProfileId },
      include: { campaign: true, business: { select: { id: true, businessName: true, logoUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findInvitationById(id: string) {
    return prisma.campaignInvitation.findUnique({
      where: { id },
      include: { campaign: true, business: { select: { id: true, userId: true, businessName: true } } },
    });
  }

  async respondToInvitation(id: string, status: 'ACCEPTED' | 'DECLINED') {
    return prisma.campaignInvitation.update({
      where: { id },
      data: { status, respondedAt: new Date() },
      include: { campaign: true, business: { select: { id: true, businessName: true, logoUrl: true } } },
    });
  }
}
