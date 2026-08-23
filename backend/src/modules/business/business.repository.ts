import { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import { expandSearchQuery, expandedTsQuerySql, matchesAny } from '../../utils/searchTerms';

// Shared between findMany's Prisma path and findManySearch's raw-SQL + hydrate
// path below — keeps the two result shapes identical regardless of which path
// a given request takes.
const LIST_SELECT = {
  id:           true,
  businessName: true,
  description:  true,
  logoUrl:      true,
  website:      true,
  categories:   true,
  isVerified:   true,
  panDocStatus: true,
  companyRegDocStatus: true,
  // Inputs to isBusinessFullyVerified/businessVerificationStatus, which branch
  // on hiring type — omitting either silently falls back to the ORGANIZATION
  // rule and under-reports verified individuals.
  identityDocStatus: true,
  representingType:  true,
  province:     true,
  district:     true,
  city:         true,
  area:         true,
  address:      true,
  locationVisibility: true,
  user: { select: { isEmailVerified: true, isPhoneVerified: true } },
  _count: { select: { campaigns: { where: { status: 'ACTIVE' as const } } } },
} satisfies Prisma.BusinessProfileSelect;

export class BusinessRepository {
  async findMany(params: {
    search?:    string;
    category?:  string;
    platform?:  string;
    locations?: string[]; // OR-matched against campaign.location
    page:       number;
    limit:      number;
  }) {
    // Relevance-ranked, typo-tolerant, multi-field search needs raw SQL
    // (Prisma can't express similarity()/ORDER BY rank), so it's handled by
    // a dedicated path that re-applies the same filters directly in SQL —
    // see findManySearch. Mirrors CampaignRepository's findMany/findManySearch split.
    if (params.search?.trim()) {
      return this.findManySearch({ ...params, search: params.search.trim() });
    }

    const where: Prisma.BusinessProfileWhereInput = { showPublicProfile: true };

    if (params.category) {
      where.categories = { has: params.category };
    }

    if (params.platform || (params.locations && params.locations.length > 0)) {
      const campaignWhere: Prisma.CampaignWhereInput = { status: 'ACTIVE' };
      if (params.platform) campaignWhere.platforms = { has: params.platform };
      if (params.locations && params.locations.length > 0) {
        campaignWhere.OR = params.locations.map((loc) => ({
          location: { contains: loc, mode: 'insensitive' as const },
        }));
      }
      where.campaigns = { some: campaignWhere };
    }

    const skip = (params.page - 1) * params.limit;
    const [businesses, total] = await Promise.all([
      prisma.businessProfile.findMany({
        where,
        skip,
        take: params.limit,
        // `id` is a tie-breaker, not a display order — isVerified+businessName
        // isn't unique (bulk-seeded/duplicate-named rows can tie on both), and
        // without a fully deterministic sort, Postgres can return the same
        // row on two different pages (or skip one entirely) as the result
        // set shifts between paginated queries.
        orderBy: [{ isVerified: 'desc' }, { businessName: 'asc' }, { id: 'asc' }],
        select: LIST_SELECT,
      }),
      prisma.businessProfile.count({ where }),
    ]);
    return { businesses, total };
  }

  /**
   * Search path for findMany — matches business name, description, and
   * structured location fields (city/district/area/address), with pg_trgm
   * similarity on businessName for typo tolerance (e.g. "resturant" still
   * matches "Restaurant Supplies Co"). Ranked by relevance so a strong name
   * match outranks an incidental description hit.
   *
   * Every other findMany filter (category/platform/locations) is re-applied
   * here in raw SQL so a search query stays consistent with the non-search
   * path, then ranking + pagination happen in Postgres and only the
   * requested page of ids crosses into Node — same pattern as
   * CampaignRepository's findManySearch.
   */
  private async findManySearch(params: {
    search:     string;
    category?:  string;
    platform?:  string;
    locations?: string[];
    page:       number;
    limit:      number;
  }) {
    const { search } = params;
    const conditions: Prisma.Sql[] = [Prisma.sql`b."showPublicProfile" = true`];

    if (params.category) {
      conditions.push(Prisma.sql`${params.category} = ANY(b.categories)`);
    }
    if (params.platform || (params.locations && params.locations.length > 0)) {
      const campaignConditions: Prisma.Sql[] = [
        Prisma.sql`c."businessId" = b.id`,
        Prisma.sql`c.status = 'ACTIVE'::"CampaignStatus"`,
      ];
      if (params.platform) {
        campaignConditions.push(Prisma.sql`${params.platform} = ANY(c.platforms)`);
      }
      if (params.locations && params.locations.length > 0) {
        campaignConditions.push(Prisma.sql`(${Prisma.join(
          params.locations.map((loc) => Prisma.sql`c.location ILIKE ${`%${loc}%`}`),
          ' OR ',
        )})`);
      }
      conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM campaigns c WHERE ${Prisma.join(campaignConditions, ' AND ')})`);
    }

    // Name and description are matched against the *expanded* term set (see
    // expandSearchQuery), so "coffee" also finds a business called Himalayan
    // Espresso Bar or one describing itself as a roastery. Location fields stay
    // on the literal query — expanding a place name has no meaning. A business
    // also qualifies through the work it posts, so a café whose only mention of
    // coffee is inside a "latte art shoot" campaign still surfaces.
    const q = expandSearchQuery(search);
    const expandedTsq = expandedTsQuerySql(q);

    conditions.push(Prisma.sql`(
      ${matchesAny(Prisma.sql`b."businessName"`, q.all)}
      OR ${matchesAny(Prisma.sql`b.description`, q.all)}
      OR b.city ILIKE ${`%${search}%`}
      OR b.district ILIKE ${`%${search}%`}
      OR b.area ILIKE ${`%${search}%`}
      OR b.address ILIKE ${`%${search}%`}
      OR similarity(b."businessName", ${search}) > 0.2
      OR EXISTS (SELECT 1 FROM unnest(b.categories) AS cat WHERE ${matchesAny(Prisma.sql`cat`, q.all)})
      ${expandedTsq
        ? Prisma.sql`OR EXISTS (
            SELECT 1 FROM campaigns bc
            WHERE bc."businessId" = b.id
              AND bc."deletedAt" IS NULL
              AND bc.status = 'ACTIVE'::"CampaignStatus"
              AND bc."searchVector" @@ ${expandedTsq}
          )`
        : Prisma.empty}
    )`);

    const whereSql = Prisma.join(conditions, ' AND ');
    // Ranking tiers, strongest first: the literal query in the name, a related
    // term in the name, a fuzzy name match, then description hits (literal
    // above related). A match that only came from the business's campaigns or
    // location carries no bonus and falls to the bottom.
    const rankExpr = Prisma.sql`
      GREATEST(
        CASE WHEN b."businessName" ILIKE ${`%${search}%`} THEN 1 ELSE 0 END,
        similarity(b."businessName", ${search})
      ) * 3
      + CASE WHEN ${matchesAny(Prisma.sql`b."businessName"`, q.all)} THEN 1.5 ELSE 0 END
      + CASE WHEN b.description ILIKE ${`%${search}%`} THEN 1 ELSE 0 END
      + CASE WHEN ${matchesAny(Prisma.sql`b.description`, q.all)} THEN 0.5 ELSE 0 END
    `;
    const skip = (params.page - 1) * params.limit;

    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT b.id
        FROM business_profiles b
        WHERE ${whereSql}
        ORDER BY (${rankExpr}) DESC, b."isVerified" DESC, b."businessName" ASC, b.id ASC
        LIMIT ${params.limit} OFFSET ${skip}
      `),
      prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM business_profiles b
        WHERE ${whereSql}
      `),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    if (rows.length === 0) return { businesses: [], total };

    const ids = rows.map((r) => r.id);
    const hydrated = await prisma.businessProfile.findMany({
      where:  { id: { in: ids } },
      select: LIST_SELECT,
    });

    // findMany doesn't preserve `in` order, so re-sort to match the rank-ranked SQL result
    const byId = new Map(hydrated.map((b) => [b.id, b]));
    const businesses = ids.map((id) => byId.get(id)).filter((b): b is NonNullable<typeof b> => b != null);

    return { businesses, total };
  }

  async findPublicById(id: string) {
    return prisma.businessProfile.findUnique({
      where: { id },
      select: {
        id:                   true,
        businessName:         true,
        description:          true,
        logoUrl:              true,
        website:              true,
        phone:                true,
        categories:           true,
        isVerified:           true,
        panDocStatus:         true,
        companyRegDocStatus:  true,
        identityDocStatus:    true,
        representingType:     true,
        createdAt:            true,
        showPublicProfile:    true,
        hideContactDetails:   true,
        hideSocialLinks:      true,
        allowDirectMessages:  true,
        province:             true,
        district:             true,
        city:                 true,
        area:                 true,
        address:              true,
        locationVisibility:   true,
        socialLinks:          true,
        userId:               true,
        user: { select: { isEmailVerified: true, isPhoneVerified: true } },
        campaigns: {
          where:   { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take:    10,
          select: {
            id:          true,
            title:       true,
            platforms:   true,
            category:    true,
            budgetMin:   true,
            budgetMax:   true,
            deadline:    true,
            contentType: true,
            isFeatured:  true,
            location:    true,
            _count: { select: { applications: true } },
          },
        },
        _count: {
          select: {
            campaigns: { where: { status: 'ACTIVE' } },
            favoritedBy: true,
            savedCreators: true,
          },
        },
      },
    });
  }

  async findByUserId(userId: string) {
    return prisma.businessProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, phone: true, role: true, isEmailVerified: true, isPhoneVerified: true } },
        _count: { select: { favoritedBy: true } },
      },
    });
  }

  async findById(id: string) {
    return prisma.businessProfile.findUnique({
      where: { id },
    });
  }

  async update(
    userId: string,
    data: Partial<{
      businessName: string;
      description: string | null;
      logoUrl: string | null;
      coverImageUrl: string | null;
      website: string | null;
      categories: string[];
      panNo: string | null;
      location: string | null;
      locationLat: number | null;
      locationLng: number | null;
      phone: string | null;
      province: string | null;
      district: string | null;
      city: string | null;
      area: string | null;
      address: string | null;
      locationVisibility: 'EXACT' | 'CITY' | 'DISTRICT';
      showPublicProfile: boolean;
      hideContactDetails: boolean;
      hideSocialLinks: boolean;
      allowDirectMessages: boolean;
      socialLinks: Record<string, string>;
      presenceServices: string[];
      paymentMethods: string[];
      defaultPlatforms: string[];
      defaultCreatorCategories: string[];
      defaultBudgetRange: string | null;
      representingType: 'ORGANIZATION' | 'INDIVIDUAL';
      organizationType: 'COMPANY' | 'BRAND' | 'RESTAURANT_CAFE' | 'HOTEL_RESORT' | 'AGENCY' | 'STARTUP' | 'NGO' | 'INGO' | 'EDUCATION' | 'EVENT_ORGANIZER' | 'MEDIA_PRODUCTION' | 'RETAIL_SHOP' | 'ECOMMERCE' | 'COMMUNITY_CLUB' | 'GOVERNMENT' | 'OTHER' | null;
      organizationTypeOther: string | null;
      contactPersonName: string | null;
      purpose: 'BRAND_MARKETING' | 'CONTENT_CREATION' | 'EVENT' | 'WEDDING' | 'PHOTOSHOOT' | 'PERFORMANCE' | 'COLLABORATION' | 'OTHER';
      businessSize: 'SOLO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'AGENCY' | 'ENTERPRISE';
    }>
  ) {
    return prisma.businessProfile.update({
      where: { userId },
      data,
    });
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

  async updatePanDoc(userId: string, docUrl: string) {
    return prisma.businessProfile.update({
      where: { userId },
      data:  { panDocUrl: docUrl, panDocStatus: 'PENDING', panDocUploadedAt: new Date() },
    });
  }

  async updateIdentityDoc(userId: string, docUrl: string) {
    return prisma.businessProfile.update({
      where: { userId },
      data:  { identityDocUrl: docUrl, identityDocStatus: 'PENDING', identityDocUploadedAt: new Date() },
    });
  }

  async updateCompanyRegDoc(userId: string, docUrl: string) {
    return prisma.businessProfile.update({
      where: { userId },
      data:  { companyRegDocUrl: docUrl, companyRegDocStatus: 'PENDING', companyRegDocUploadedAt: new Date() },
    });
  }

  async getPaymentHistoryData(businessId: string) {
    const [applications, referrals] = await Promise.all([
      prisma.application.findMany({
        where: {
          paymentStatus: { in: ['PAID', 'RELEASED'] },
          campaign: { businessId },
        },
        select: {
          id:           true,
          proposedRate: true,
          paidAt:       true,
          creator:      { select: { fullName: true } },
          campaign:     { select: { title: true } },
        },
        orderBy: { paidAt: 'desc' },
      }),
      prisma.businessReferral.findMany({
        where: { referrerId: businessId, status: 'COMPLETED' },
        select: {
          id:          true,
          rewardAmount: true,
          completedAt:  true,
          referred:     { select: { businessName: true } },
        },
        orderBy: { completedAt: 'desc' },
      }),
    ]);
    return { applications, referrals };
  }

  // ── Social Accounts (structured table, shared with CreatorProfile — see
  // creator.repository.ts's mirror-image section for the creator-side of this) ──

  async findSocialAccountsByUserId(userId: string) {
    const profile = await prisma.businessProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!profile) return [];
    return prisma.socialAccount.findMany({
      where: { businessProfileId: profile.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findSocialAccountById(id: string) {
    return prisma.socialAccount.findUnique({ where: { id } });
  }

  async addSocialAccount(businessProfileId: string, data: { platform: string; profileUrl: string; followers: number }) {
    return prisma.socialAccount.create({ data: { businessProfileId, ...data } });
  }

  async updateSocialAccount(id: string, data: { profileUrl?: string; followers?: number }) {
    return prisma.socialAccount.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
  }

  async deleteSocialAccount(id: string) {
    return prisma.socialAccount.delete({ where: { id } });
  }

  async findSocialAccountByPlatform(businessProfileId: string, platform: string) {
    return prisma.socialAccount.findUnique({ where: { businessProfileId_platform: { businessProfileId, platform } } });
  }

  async upsertOAuthSocialAccount(
    businessProfileId: string,
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
      where: { businessProfileId_platform: { businessProfileId, platform } },
      create: { businessProfileId, platform, connectedViaOAuth: true, followersSyncedAt: now, ...data },
      update: { connectedViaOAuth: true, followersSyncedAt: now, updatedAt: now, ...data },
    });
  }

  // This business's connected accounts that haven't been synced in a while — same
  // "silently top up on load" idea as creator.repository.ts's findStaleSocialAccounts.
  async findStaleSocialAccounts(businessProfileId: string, staleBefore: Date) {
    return prisma.socialAccount.findMany({
      where: {
        businessProfileId,
        connectedViaOAuth: true,
        accessToken: { not: null },
        OR: [{ followersSyncedAt: null }, { followersSyncedAt: { lt: staleBefore } }],
      },
    });
  }
}
