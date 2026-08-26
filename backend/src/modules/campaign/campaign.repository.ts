import { CampaignStatus, CampaignType, ApplicationStatus, WorkStatus, PaymentStatus, Prisma } from '@prisma/client';
import prisma from '../../prisma';
import { expandSearchQuery, expandedTsQuerySql, matchesAny } from '../../utils/searchTerms';
import type { DeliverableVideo, DeliverableFile } from './campaign.dto';

/**
 * A work matches when one of the roles it is hiring for matches — the role's
 * category lives in campaign_requirements → categories.name ("Photographer",
 * "DJ", "Wedding Planner"), which is where the specific, searchable job title
 * actually is. Campaign.category is only the single broad legacy label, so
 * without this a search for "camera" or "photo" missed every work looking for
 * a photographer unless the title happened to say so. The category's group is
 * matched alongside its name, since that's where the umbrella term lives — a
 * work hiring a DJ has to come back for "music".
 */
function roleCategoryMatch(terms: string[]): Prisma.Sql {
  return Prisma.sql`EXISTS (
    SELECT 1 FROM campaign_requirements cr
    JOIN categories rcat ON rcat.id = cr."categoryId"
    WHERE cr."campaignId" = c.id
      AND (
        ${matchesAny(Prisma.sql`rcat.name`, terms)}
        OR ${matchesAny(Prisma.sql`COALESCE(rcat."group", '')`, terms)}
      )
  )`;
}

export class CampaignRepository {
  async create(data: {
    businessId: string;
    title: string;
    description: string;
    template?: string;
    featureImageUrl?: string;
    category: string;
    goals?: string[];
    platforms: string[];
    minFollowers: number;
    contentType: string;
    deliverables: string;
    deadline: Date;
    location?: string | null;
    locationLat?: number | null;
    locationLng?: number | null;
    locationType?: 'ONSITE' | 'REMOTE';
    budgetMin: number;
    budgetMax: number;
    paymentType: string;
    creatorsNeeded?: number;
    isFeatured?: boolean;
    campaignType?: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
    capacity?: number;
    eventDate?: Date;
    venue?: string;
    benefits?: string[];
    status?: 'DRAFT' | 'ACTIVE' | 'PENDING_APPROVAL';
    commissionRate?: number;
    objective?: string;
    contentGuidelines?: string[];
    targetAudience?: string[];
    hashtags?: string[];
    sampleCaption?: string;
    approvalRequirements?: string;
    aiGenerated?: boolean;
    aiPrompt?: string;
    aiSuggestedCategories?: string[];
    aiSuggestedPlatforms?: string[];
    aiNeedsInputFields?: string[];
    completionType?: 'SERVICE' | 'DELIVERABLE';
    completionReason?: string;
    requirements?: {
      categoryId: string;
      quantity: number;
      budgetType: 'FIXED' | 'RANGE' | 'NEGOTIABLE';
      budgetFixed?: number;
      budgetMin?: number;
      budgetMax?: number;
      deliverables?: string;
      description?: string;
      format?: string[];
      deadline?: Date;
      completionType?: 'SERVICE' | 'DELIVERABLE';
      completionReason?: string;
    }[];
  }) {
    const { requirements, ...campaignData } = data;
    return prisma.campaign.create({
      data: {
        ...campaignData,
        campaignType: data.campaignType ?? 'PAID_CAMPAIGN',
        capacity:     data.capacity ?? null,
        eventDate:    data.eventDate ?? null,
        venue:        data.venue ?? null,
        benefits:     data.benefits ?? [],
        status:       data.status ?? 'ACTIVE',
        eventStatus:  'OPEN',
        // Nested create — same transaction as the campaign row itself, so a
        // campaign is never left half-created if a requirement fails validation.
        ...(requirements?.length ? { requirements: { create: requirements } } : {}),
      },
      include: {
        business: { select: { businessName: true, logoUrl: true } },
        _count: { select: { applications: true } },
        requirements: {
          include: {
            category: true,
            _count: { select: { applications: { where: { status: 'ACCEPTED' } } } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async findMany(filters: {
    search?: string;
    category?: string[];
    platform?: string[];
    minBudget?: number;
    maxBudget?: number;
    status?: CampaignStatus;
    isFeatured?: boolean;
    deadlineFrom?: Date;
    deadlineTo?: Date;
    campaignType?: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
    page: number;
    limit: number;
  }) {
    // Relevance-ranked full-text + trigram search needs raw SQL (Prisma can't
    // express tsvector/ts_rank/similarity), so it's handled by a dedicated
    // path that applies the same filters directly in SQL — see findManySearch.
    if (filters.search?.trim()) {
      return this.findManySearch({ ...filters, search: filters.search.trim() });
    }

    // Excludes admin-soft-deleted campaigns unconditionally — independent of
    // whatever `status` filter is applied, since a deleted campaign can keep
    // its pre-deletion status (see Campaign.deletedAt's schema comment).
    const where: Prisma.CampaignWhereInput = { deletedAt: null };

    if (filters.category?.length) {
      where.category = { in: filters.category, mode: 'insensitive' };
    }
    if (filters.platform?.length) {
      where.platforms = { hasSome: filters.platform };
    }
    if (filters.campaignType) {
      where.campaignType = filters.campaignType;
    }
    if (filters.minBudget !== undefined) {
      where.budgetMax = { gte: filters.minBudget };
    }
    if (filters.maxBudget !== undefined) {
      where.budgetMin = { ...((where.budgetMin as object) || {}), lte: filters.maxBudget };
    }
    if (filters.status) {
      where.status = filters.status;
    } else {
      where.status = 'ACTIVE'; // default to active for public listing
    }
    if (filters.isFeatured !== undefined) {
      where.isFeatured = filters.isFeatured;
    }
    if (filters.deadlineFrom !== undefined || filters.deadlineTo !== undefined) {
      where.deadline = {};
      if (filters.deadlineFrom) (where.deadline as Prisma.DateTimeFilter).gte = filters.deadlineFrom;
      if (filters.deadlineTo) (where.deadline as Prisma.DateTimeFilter).lte = filters.deadlineTo;
    }

    const skip = (filters.page - 1) * filters.limit;

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          business: { select: { businessName: true, logoUrl: true } },
          _count: { select: { applications: true } },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    return { campaigns, total };
  }

  /**
   * The match + ranking rule for a campaign search, shared by findManySearch
   * and findNearby so the "Find Work" browse list and the search-results
   * screen agree on what a query means.
   *
   * Covers every part of a campaign: title, category and hashtags (weight A in
   * "searchVector"), location/venue (B), description/sampleCaption/target
   * audience/content guidelines (C), plus the posting business's name. Each is
   * matched against the *expanded* term set — see expandSearchQuery — so a
   * search for "coffee" also surfaces a café's latte shoot, while
   * similarity()/ILIKE keep typos ("resturant") and partial words ("photog")
   * working. The description also gets a plain substring check, since the
   * tsvector only holds whole stemmed words from it.
   *
   * Exact hits outrank related ones: ts_rank over the user's own words is
   * weighted 3x the rank over the expansion.
   */
  private searchMatchSql(search: string) {
    const q = expandSearchQuery(search);
    const expandedTsq = expandedTsQuerySql(q);

    const condition = Prisma.sql`(
      c."searchVector" @@ plainto_tsquery('english', ${search})
      ${expandedTsq ? Prisma.sql`OR c."searchVector" @@ ${expandedTsq}` : Prisma.empty}
      OR similarity(c.title, ${search}) > 0.2
      OR similarity(c.category, ${search}) > 0.2
      OR similarity(b."businessName", ${search}) > 0.2
      OR ${matchesAny(Prisma.sql`c.title`, q.all)}
      OR ${matchesAny(Prisma.sql`c.category`, q.all)}
      OR ${matchesAny(Prisma.sql`b."businessName"`, q.all)}
      OR c.description ILIKE ${`%${search}%`}
      OR EXISTS (SELECT 1 FROM unnest(c.hashtags) AS tag WHERE ${matchesAny(Prisma.sql`tag`, q.all)})
      OR ${roleCategoryMatch(q.all)}
      OR EXISTS (SELECT 1 FROM unnest(b.categories) AS bcat WHERE ${matchesAny(Prisma.sql`bcat`, q.all)})
    )`;

    const rank = Prisma.sql`
      ts_rank(c."searchVector", plainto_tsquery('english', ${search})) * 3
      ${expandedTsq ? Prisma.sql`+ ts_rank(c."searchVector", ${expandedTsq})` : Prisma.empty}
      + CASE WHEN ${roleCategoryMatch(q.all)} THEN 1 ELSE 0 END
      + GREATEST(
          similarity(c.title, ${search}),
          similarity(c.category, ${search}),
          similarity(b."businessName", ${search})
        )
    `;

    return { condition, rank };
  }

  /**
   * Search path for findMany — full-text ranking (ts_rank over the weighted
   * "searchVector" column, see the add_campaign_fulltext_search migration)
   * combined with pg_trgm similarity on title/business name for typo
   * tolerance (e.g. "resturant" still matches "Restaurant Launch").
   *
   * Every other findMany filter is re-applied here in raw SQL so a search
   * query stays consistent with category/platform/budget/etc. filters, then
   * ranking + pagination happen in Postgres and only the requested page of
   * ids crosses into Node — mirrors findNearby's distance-ranked pattern
   * below for the same reason (no in-memory sort/page over the full result).
   */
  private async findManySearch(filters: {
    search: string;
    category?: string[];
    platform?: string[];
    minBudget?: number;
    maxBudget?: number;
    status?: CampaignStatus;
    isFeatured?: boolean;
    deadlineFrom?: Date;
    deadlineTo?: Date;
    campaignType?: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
    page: number;
    limit: number;
  }) {
    const { search } = filters;
    const conditions: Prisma.Sql[] = [
      Prisma.sql`c."deletedAt" IS NULL`,
      Prisma.sql`c.status = ${filters.status ?? 'ACTIVE'}::"CampaignStatus"`,
    ];
    if (filters.category?.length) {
      conditions.push(Prisma.sql`LOWER(c.category) IN (${Prisma.join(filters.category.map((v) => v.toLowerCase()))})`);
    }
    if (filters.platform?.length) {
      conditions.push(Prisma.sql`c.platforms && ARRAY[${Prisma.join(filters.platform)}]::text[]`);
    }
    if (filters.campaignType) {
      conditions.push(Prisma.sql`c."campaignType" = ${filters.campaignType}::"CampaignType"`);
    }
    if (filters.minBudget !== undefined) {
      conditions.push(Prisma.sql`c."budgetMax" >= ${filters.minBudget}`);
    }
    if (filters.maxBudget !== undefined) {
      conditions.push(Prisma.sql`c."budgetMin" <= ${filters.maxBudget}`);
    }
    if (filters.isFeatured !== undefined) {
      conditions.push(Prisma.sql`c."isFeatured" = ${filters.isFeatured}`);
    }
    if (filters.deadlineFrom !== undefined) {
      conditions.push(Prisma.sql`c.deadline >= ${filters.deadlineFrom}`);
    }
    if (filters.deadlineTo !== undefined) {
      conditions.push(Prisma.sql`c.deadline <= ${filters.deadlineTo}`);
    }

    const { condition, rank: rankExpr } = this.searchMatchSql(search);
    conditions.push(condition);

    const whereSql = Prisma.join(conditions, ' AND ');
    const skip = (filters.page - 1) * filters.limit;

    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT c.id
        FROM campaigns c
        JOIN business_profiles b ON b.id = c."businessId"
        WHERE ${whereSql}
        ORDER BY (${rankExpr}) DESC, c."createdAt" DESC
        LIMIT ${filters.limit} OFFSET ${skip}
      `),
      prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM campaigns c
        JOIN business_profiles b ON b.id = c."businessId"
        WHERE ${whereSql}
      `),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    if (rows.length === 0) return { campaigns: [], total };

    const ids = rows.map((r) => r.id);
    const hydrated = await prisma.campaign.findMany({
      where: { id: { in: ids } },
      include: {
        business: { select: { businessName: true, logoUrl: true } },
        _count: { select: { applications: true } },
      },
    });

    // findMany doesn't preserve `in` order, so re-sort to match the rank-ranked SQL result
    const byId = new Map(hydrated.map((c) => [c.id, c]));
    const campaigns = ids.map((id) => byId.get(id)).filter((c): c is NonNullable<typeof c> => c != null);

    return { campaigns, total };
  }

  /**
   * Nearby campaigns within radiusKm of (lat, lng), sorted by distance.
   *
   * Distance, radius filtering, sorting, and pagination all happen inside
   * Postgres (Haversine computed in SQL, bounding box pre-filter uses the
   * campaigns_locationLat_locationLng_idx index) so only the requested page
   * of rows ever crosses into Node — the earlier version fetched every
   * campaign in the bounding box into memory before filtering/sorting/paging
   * in application code, which under load testing scaled badly with radius
   * (p50 latency went from ~6ms at 10km to ~84ms at 200km on a 2k-row table).
   */
  async findNearby(params: {
    lat: number; lng: number; radiusKm: number; page: number; limit: number;
    search?: string; category?: string[]; platform?: string[];
  }) {
    const { lat, lng, radiusKm, page, limit, search, category, platform } = params;

    const latDelta = radiusKm / 111; // ~111km per degree of latitude
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
    const offset = (page - 1) * limit;

    // Haversine distance clamped into [-1, 1] before acos() — floating-point
    // rounding can otherwise push the argument just outside that range for
    // near-zero distances and produce NaN.
    const distanceExpr = Prisma.sql`
      6371 * acos(
        LEAST(1, GREATEST(-1,
          cos(radians(${lat})) * cos(radians(c."locationLat")) * cos(radians(c."locationLng") - radians(${lng}))
          + sin(radians(${lat})) * sin(radians(c."locationLat"))
        ))
      )
    `;

    const boundingBoxWhere = Prisma.sql`
      c."deletedAt" IS NULL
      AND c.status = 'ACTIVE'
      AND c."locationLat" IS NOT NULL
      AND c."locationLng" IS NOT NULL
      AND c."locationLat" BETWEEN ${lat - latDelta} AND ${lat + latDelta}
      AND c."locationLng" BETWEEN ${lng - lngDelta} AND ${lng + lngDelta}
    `;

    // Mirrors findMany's filters — search/category/platform are applied on
    // top of the bounding box so "Nearby Events" respects the same active
    // filters as the main list instead of always showing everything nearby.
    const extraConditions: Prisma.Sql[] = [];
    if (search) {
      // Exactly the same match rule as findManySearch above (expanded terms
      // included) — proximity stays the primary sort for "Nearby Events", this
      // just decides which campaigns qualify, same as the other filters below.
      extraConditions.push(this.searchMatchSql(search).condition);
    }
    if (category?.length) {
      extraConditions.push(Prisma.sql`LOWER(c.category) IN (${Prisma.join(category.map((c) => c.toLowerCase()))})`);
    }
    if (platform?.length) {
      extraConditions.push(Prisma.sql`c.platforms && ARRAY[${Prisma.join(platform)}]::text[]`);
    }
    const extraWhere = extraConditions.length
      ? Prisma.join(extraConditions.map((c) => Prisma.sql`AND ${c}`), ' ')
      : Prisma.empty;

    const [rows, countRows, newestRows] = await Promise.all([
      prisma.$queryRaw<{ id: string; distanceKm: number }[]>(Prisma.sql`
        SELECT c.id, ${distanceExpr} AS "distanceKm"
        FROM campaigns c
        JOIN business_profiles b ON b.id = c."businessId"
        WHERE ${boundingBoxWhere}
          AND (${distanceExpr}) <= ${radiusKm}
          ${extraWhere}
        ORDER BY "distanceKm" ASC
        LIMIT ${limit} OFFSET ${offset}
      `),
      prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM campaigns c
        JOIN business_profiles b ON b.id = c."businessId"
        WHERE ${boundingBoxWhere}
          AND (${distanceExpr}) <= ${radiusKm}
          ${extraWhere}
      `),
      // Only needed to pin onto page 1 (see below) — skipped on later pages
      // since none of this app's callers paginate past page 1 today, and
      // pinning there too would risk the same campaign appearing on two pages.
      page === 1
        ? prisma.$queryRaw<{ id: string; distanceKm: number }[]>(Prisma.sql`
            SELECT c.id, ${distanceExpr} AS "distanceKm"
            FROM campaigns c
            JOIN business_profiles b ON b.id = c."businessId"
            WHERE ${boundingBoxWhere}
              AND (${distanceExpr}) <= ${radiusKm}
              ${extraWhere}
            ORDER BY c."createdAt" DESC
            LIMIT 1
          `)
        : Promise.resolve([]),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    if (rows.length === 0) return { campaigns: [], total };

    // Pin the single most-recently-created campaign in this radius into slot
    // one of page 1 — proximity is otherwise the only ranking signal here, so
    // a brand-new listing that's merely farther away than the nearest handful
    // would never surface at all. Mirrors getRecommendedForCreator's same
    // guarantee for the Recommended rail.
    const newest = newestRows[0];
    const finalRows = newest && !rows.some((r) => r.id === newest.id)
      ? [newest, ...rows.slice(0, Math.max(0, limit - 1))]
      : rows;

    const distanceById = new Map(finalRows.map((r) => [r.id, r.distanceKm]));
    const hydrated = await prisma.campaign.findMany({
      where: { id: { in: finalRows.map((r) => r.id) } },
      include: {
        business: { select: { businessName: true, logoUrl: true } },
        _count: { select: { applications: true } },
      },
    });

    // findMany doesn't preserve `in` order, so re-sort to match finalRows' order
    const byId = new Map(hydrated.map((c) => [c.id, c]));
    const campaigns = finalRows
      .map((r) => byId.get(r.id))
      .filter((c): c is NonNullable<typeof c> => c != null)
      .map((c) => ({ ...c, distanceKm: distanceById.get(c.id)! }));

    return { campaigns, total };
  }

  async findById(id: string) {
    // findFirst (not findUnique) — excluding admin-soft-deleted campaigns
    // needs a second where condition alongside `id`, which findUnique can't
    // express. Used throughout CampaignService for every business/creator-
    // facing operation (apply, pay, work management, ...), so this makes a
    // deleted campaign fully inert for everyone except admin's own
    // getCampaignDetail/getAllCampaigns (separate queries in admin.repository.ts).
    return prisma.campaign.findFirst({
      where: { id, deletedAt: null },
      include: {
        business: {
          select: { businessName: true, logoUrl: true, website: true, description: true },
        },
        _count: { select: { applications: true } },
        requirements: {
          include: {
            category: true,
            // Live-computed, not stored — see CampaignRequirement's schema
            // comment. Filtered count of the same relation, not a separate query.
            _count: { select: { applications: { where: { status: 'ACCEPTED' } } } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async findByBusinessId(businessId: string, page: number, limit: number, status?: CampaignStatus) {
    const skip = (page - 1) * limit;
    const where: Prisma.CampaignWhereInput = { businessId, deletedAt: null, ...(status ? { status } : {}) };
    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        // `id` is a tie-breaker, not a display order — createdAt alone isn't
        // unique (bulk-created rows can share a timestamp), and without a
        // fully deterministic sort, Postgres can return the same row on two
        // different pages (or skip one entirely) as the result set shifts
        // between paginated queries.
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: { _count: { select: { applications: true } } },
      }),
      prisma.campaign.count({ where }),
    ]);

    return { campaigns, total };
  }

  // How long an application still counts as "recent" when ranking the creator
  // feed's Trending tab. Three days is long enough that a quiet weekday
  // doesn't erase a campaign that was hot yesterday, short enough that the
  // tab reflects interest now rather than all-time popularity.
  static readonly TRENDING_WINDOW_HOURS = 72;

  // Applications-per-campaign inside the trending window — the velocity half
  // of the trending score (`_count.applications` on the campaign itself is the
  // all-time total, which can't distinguish "50 applications last week" from
  // "50 applications this morning"). One grouped query for the whole page, so
  // this costs a single extra round-trip regardless of page size.
  async countRecentApplications(campaignIds: string[], since: Date): Promise<Map<string, number>> {
    if (campaignIds.length === 0) return new Map();
    const rows = await prisma.application.groupBy({
      by: ['campaignId'],
      where: { campaignId: { in: campaignIds }, createdAt: { gte: since } },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.campaignId, r._count._all]));
  }

  async update(id: string, data: Partial<{
    title: string;
    description: string;
    template: string;
    featureImageUrl: string | null;
    category: string;
    goals: string[];
    platforms: string[];
    minFollowers: number;
    contentType: string;
    deliverables: string;
    deadline: Date;
    location: string | null;
    locationLat: number | null;
    locationLng: number | null;
    locationType: 'ONSITE' | 'REMOTE';
    budgetMin: number;
    budgetMax: number;
    paymentType: string;
    creatorsNeeded: number;
    status: CampaignStatus;
    isFeatured: boolean;
    campaignType: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
    capacity: number | null;
    eventDate: Date | null;
    venue: string | null;
    benefits: string[];
    eventStatus: 'OPEN' | 'FULL' | 'CLOSED';
    objective: string;
    contentGuidelines: string[];
    targetAudience: string[];
    hashtags: string[];
    completionType: 'SERVICE' | 'DELIVERABLE' | null;
    completionReason: string | null;
  }>) {
    return prisma.campaign.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.campaign.delete({ where: { id } });
  }

  // Lightweight id-only fetch — used to exclude campaigns a creator already
  // applied to from their recommendation candidate pool, without paying for
  // findApplicationsByCreator's much heavier select (deliverables, revision
  // notes, business summary, ...) that the recommender has no use for.
  async findAppliedCampaignIds(creatorId: string): Promise<string[]> {
    const rows = await prisma.application.findMany({
      where: { creatorId },
      select: { campaignId: true },
    });
    return rows.map((r) => r.campaignId);
  }

  // Candidate pool for CampaignService.getRecommendedForCreator — active,
  // non-deleted, not already applied-to, newest first. Scoring happens
  // in-memory over this capped pool (mirrors CreatorRepository.findRecommended's
  // same small-pool-then-score-in-JS approach), so this intentionally doesn't
  // try to pre-rank by category/budget/location in SQL the way findMany's
  // filters do — the pool just needs to be reasonably fresh and large enough
  // that scoring has real signal to rank within.
  async findCandidatesForRecommendation(excludeCampaignIds: string[], poolSize: number) {
    return prisma.campaign.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        ...(excludeCampaignIds.length ? { id: { notIn: excludeCampaignIds } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: poolSize,
      include: {
        business: { select: { businessName: true, logoUrl: true } },
        _count: { select: { applications: true } },
      },
    });
  }

  async getDistinctCategories(): Promise<string[]> {
    const rows = await prisma.campaign.findMany({
      where: { status: 'ACTIVE' },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => r.category).filter(Boolean);
  }

  async getDistinctPlatforms(): Promise<string[]> {
    // `distinct` can't target an array column — flatten with unnest() instead.
    const rows = await prisma.$queryRaw<{ platform: string }[]>`
      SELECT DISTINCT unnest(platforms) AS platform
      FROM campaigns
      WHERE status = 'ACTIVE'
      ORDER BY platform ASC
    `;
    return rows.map((r) => r.platform).filter(Boolean);
  }

  // Scoped to requirementId: null — this is the "apply to a simple campaign"
  // path (see CampaignService.applyToCampaign), which doesn't yet create
  // requirement-linked applications. Real uniqueness for this case is now
  // enforced by the partial index applications_campaign_creator_no_requirement_key
  // (see the migration and the comment on Application.@@index([campaignId,
  // creatorId]) in schema.prisma) — the old compound-unique findUnique no
  // longer exists since Prisma can't express a nullable-column unique input.
  async findApplication(campaignId: string, creatorId: string) {
    return prisma.application.findFirst({
      where: { campaignId, creatorId, requirementId: null },
    });
  }

  async createApplication(data: {
    campaignId: string;
    creatorId: string;
    coverLetter: string;
    proposedRate: number;
    timeline: string;
    socialHandles: Record<string, string>;
    portfolioUrl?: string;
    requirementId?: string;
  }) {
    return prisma.application.create({
      data,
      include: {
        campaign: { select: { title: true } },
        creator: { select: { fullName: true } },
      },
    });
  }

  // Requirement-scoped counterpart to findApplication (which is scoped to
  // requirementId: null, the simple-campaign case) — enforces one application
  // per creator per requirement, matching the partial unique index
  // applications_campaign_creator_requirement_key.
  async findApplicationForRequirement(requirementId: string, creatorId: string) {
    return prisma.application.findFirst({ where: { requirementId, creatorId } });
  }

  // Used by the admin-configurable "proposal submission per day" rate limit —
  // see CampaignService.apply. Every submission counts, regardless of later status.
  async countApplicationsCreatedSince(creatorId: string, since: Date): Promise<number> {
    return prisma.application.count({
      where: { creatorId, createdAt: { gte: since } },
    });
  }

  async findApplicationsByCampaign(campaignId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where: { campaignId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              userId: true,
              fullName: true,
              avatarUrl: true,
              location: true,
              categories: true,
              socialLinks: true,
            },
          },
        },
      }),
      prisma.application.count({ where: { campaignId } }),
    ]);

    return { applications, total };
  }

  // Alias used by getCampaignApplications (campaign-proposals page)
  async findApplicationsByCampaignId(campaignId: string, page: number, limit: number) {
    return this.findApplicationsByCampaign(campaignId, page, limit);
  }

  async findApplicationsByBusinessId(
    businessId: string,
    page: number,
    limit: number,
    status?: ApplicationStatus,
    campaignType?: CampaignType,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.ApplicationWhereInput = {
      campaign: { businessId, ...(campaignType ? { campaignType } : {}) },
      ...(status ? { status } : {}),
    };
    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take: limit,
        // `id` tie-breaker — see findByBusinessId above for why this matters
        // once two rows can share a createdAt value.
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        select: {
          id: true,
          campaignId: true,
          coverLetter: true,
          proposedRate: true,
          timeline: true,
          socialHandles: true,
          portfolioUrl: true,
          status: true,
          workStatus: true,
          workNote: true,
          revisionRequestedAt: true,
          revisionNotes: {
            orderBy: { createdAt: 'desc' },
            select: { note: true, createdAt: true },
          },
          submittedAt: true,
          deliverableUrls: true,
          deliverableVideos: true,
          deliverableFiles: true,
          paymentStatus: true,
          paidAt: true,
          createdAt: true,
          creator: {
            select: { id: true, fullName: true, avatarUrl: true, location: true },
          },
          campaign: {
            select: { id: true, title: true, platforms: true, campaignType: true, paymentStatus: true, featureImageUrl: true, commissionRate: true },
          },
        },
      }),
      prisma.application.count({ where }),
    ]);
    return { applications, total };
  }

  async findApplicationById(id: string) {
    return prisma.application.findUnique({
      where: { id },
      include: {
        campaign: { include: { business: { select: { id: true, userId: true, businessName: true } } } },
        creator: { select: { id: true, userId: true, fullName: true } },
      },
    });
  }

  // `workStatus` is written in the same update only for free events (see
  // CampaignService.updateApplicationStatus) — accepting a creator into an
  // OPEN_EVENT is terminal, so the application lands at COMPLETED rather than
  // entering the start → submit → approve work flow a paid campaign follows.
  async updateApplicationStatus(
    id: string,
    status: 'ACCEPTED' | 'REJECTED' | 'SHORTLISTED' | 'PENDING',
    opts?: { workStatus?: WorkStatus },
  ) {
    return prisma.application.update({
      where: { id },
      data: { status, ...(opts?.workStatus ? { workStatus: opts.workStatus } : {}) },
    });
  }

  async findPendingApplicationsByCampaign(campaignId: string, excludeAppId: string) {
    return prisma.application.findMany({
      where: { campaignId, id: { not: excludeAppId }, status: 'PENDING' },
      include: { creator: { select: { userId: true } } },
    });
  }

  async findApplicationsByCreator(creatorId: string, page: number, limit: number, status?: ApplicationStatus) {
    const skip = (page - 1) * limit;
    const where: Prisma.ApplicationWhereInput = { creatorId, ...(status ? { status } : {}) };
    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take: limit,
        // `id` tie-breaker — see findByBusinessId above for why this matters
        // once two rows can share a createdAt value.
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        select: {
          id: true,
          campaignId: true,
          requirementId: true,
          coverLetter: true,
          proposedRate: true,
          timeline: true,
          socialHandles: true,
          portfolioUrl: true,
          status: true,
          workStatus: true,
          workNote: true,
          revisionRequestedAt: true,
          revisionNotes: {
            orderBy: { createdAt: 'desc' },
            select: { note: true, createdAt: true },
          },
          submittedAt: true,
          deliverableUrls: true,
          deliverableVideos: true,
          deliverableFiles: true,
          paymentStatus: true,
          paidAt: true,
          createdAt: true,
          campaign: {
            select: {
              id: true,
              title: true,
              category: true,
              platforms: true,
              budgetMin: true,
              budgetMax: true,
              deadline: true,
              status: true,
              campaignType: true,
              paymentStatus: true,
              paidAt: true,
              featureImageUrl: true,
              business: { select: { id: true, businessName: true, logoUrl: true } },
            },
          },
        },
      }),
      prisma.application.count({ where }),
    ]);

    return { applications, total };
  }

  async payForCampaign(campaignId: string, method: string) {
    return prisma.campaign.update({
      where: { id: campaignId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        paidAt:        new Date(),
        paymentMethod: method,
      },
    });
  }

  async startWork(appId: string) {
    return prisma.application.update({
      where: { id: appId },
      data: { workStatus: WorkStatus.IN_PROGRESS },
    });
  }

  async submitWork(appId: string, data: { note?: string; urls?: string }) {
    return prisma.application.update({
      where: { id: appId },
      data: {
        workStatus:      WorkStatus.SUBMITTED,
        workNote:        data.note ?? null,
        deliverableUrls: data.urls ?? null,
        submittedAt:     new Date(),
      },
    });
  }

  async approveWork(appId: string) {
    return prisma.application.update({
      where: { id: appId },
      data: { workStatus: WorkStatus.APPROVED },
    });
  }

  // Free events (OPEN_EVENT) only — see CampaignService.approveWork. There's
  // no payment to release, so the business's approval is itself the terminal
  // state; a paid campaign instead reaches COMPLETED via the admin's
  // releasePayment below.
  async completeWork(appId: string) {
    return prisma.application.update({
      where: { id: appId },
      data: { workStatus: WorkStatus.COMPLETED },
    });
  }

  async requestRevision(appId: string, note: string) {
    const [updated] = await prisma.$transaction([
      prisma.application.update({
        where: { id: appId },
        data: { workStatus: WorkStatus.IN_PROGRESS, workNote: note, revisionRequestedAt: new Date() },
      }),
      prisma.revisionNote.create({
        data: { applicationId: appId, note },
      }),
    ]);
    return updated;
  }

  // §40 dispute flow — unlike requestRevision, this does NOT reopen the job
  // (workStatus stays out of the normal flow entirely at DISPUTED) since a
  // SERVICE job has nothing left for the provider to "redo" the way a
  // deliverable resubmission would. Reuses RevisionNote for the reason text
  // so it surfaces in the same feedback history the mobile app already reads.
  async reportIssue(appId: string, reason: string) {
    const [updated] = await prisma.$transaction([
      prisma.application.update({
        where: { id: appId },
        // Reuses revisionRequestedAt as a generic "last note flagged at"
        // timestamp rather than adding a dedicated disputedAt column.
        data: { workStatus: WorkStatus.DISPUTED, workNote: reason, revisionRequestedAt: new Date() },
      }),
      prisma.revisionNote.create({
        data: { applicationId: appId, note: reason },
      }),
    ]);
    return updated;
  }

  // Conditional append rather than a plain findUnique->mutate->update: two
  // uploads completing near-simultaneously would otherwise both read the same
  // array and both write back N+1 entries, silently dropping one. Gating the
  // WHERE clause on the current array length makes the 3-video cap atomic —
  // an empty result means the cap was already reached (or hit concurrently),
  // not that anything went wrong.
  async appendDeliverableVideo(appId: string, entry: DeliverableVideo): Promise<boolean> {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      UPDATE applications
      SET "deliverableVideos" = "deliverableVideos" || ${JSON.stringify([entry])}::jsonb
      WHERE id = ${appId} AND jsonb_array_length("deliverableVideos") < 3
      RETURNING id
    `;
    return rows.length > 0;
  }

  async removeDeliverableVideo(appId: string, publicId: string) {
    const app = await prisma.application.findUnique({ where: { id: appId }, select: { deliverableVideos: true } });
    const videos = ((app?.deliverableVideos as DeliverableVideo[] | null) ?? []).filter((v) => v.publicId !== publicId);
    return prisma.application.update({
      where: { id: appId },
      data: { deliverableVideos: videos },
    });
  }

  async renameDeliverableVideo(appId: string, publicId: string, label: string) {
    const app = await prisma.application.findUnique({ where: { id: appId }, select: { deliverableVideos: true } });
    const videos = ((app?.deliverableVideos as DeliverableVideo[] | null) ?? []).map((v) => (v.publicId === publicId ? { ...v, label } : v));
    return prisma.application.update({
      where: { id: appId },
      data: { deliverableVideos: videos },
    });
  }

  // Called from CampaignService.requestRevision — videos are appended rather
  // than replaced (unlike deliverableUrls, which the next submitWork call
  // overwrites wholesale), so without this a creator who filled all 3 slots
  // in one round would have zero slots left after a revision request.
  async clearDeliverableVideos(appId: string) {
    return prisma.application.update({
      where: { id: appId },
      data: { deliverableVideos: [] },
    });
  }

  async getDeliverableVideos(appId: string): Promise<DeliverableVideo[]> {
    const app = await prisma.application.findUnique({ where: { id: appId }, select: { deliverableVideos: true } });
    return (app?.deliverableVideos as DeliverableVideo[] | null) ?? [];
  }

  // Mirrors the deliverableVideos append/remove/clear/get quartet above, capped
  // at 10 instead of 3 — images/docs are much smaller, so a looser cap is fine.
  async appendDeliverableFile(appId: string, entry: DeliverableFile): Promise<boolean> {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      UPDATE applications
      SET "deliverableFiles" = "deliverableFiles" || ${JSON.stringify([entry])}::jsonb
      WHERE id = ${appId} AND jsonb_array_length("deliverableFiles") < 10
      RETURNING id
    `;
    return rows.length > 0;
  }

  async removeDeliverableFile(appId: string, fileId: string) {
    const app = await prisma.application.findUnique({ where: { id: appId }, select: { deliverableFiles: true } });
    const files = ((app?.deliverableFiles as DeliverableFile[] | null) ?? []).filter((f) => f.id !== fileId);
    return prisma.application.update({
      where: { id: appId },
      data: { deliverableFiles: files },
    });
  }

  async clearDeliverableFiles(appId: string) {
    return prisma.application.update({
      where: { id: appId },
      data: { deliverableFiles: [] },
    });
  }

  async getDeliverableFiles(appId: string): Promise<DeliverableFile[]> {
    const app = await prisma.application.findUnique({ where: { id: appId }, select: { deliverableFiles: true } });
    return (app?.deliverableFiles as DeliverableFile[] | null) ?? [];
  }

  async payForApplication(appId: string, method: string) {
    return prisma.application.update({
      where: { id: appId },
      data: { paymentStatus: 'PAID', paidAt: new Date(), paymentMethod: method, khaltiPidx: null },
    });
  }

  async setKhaltiPidx(appId: string, pidx: string) {
    return prisma.application.update({
      where: { id: appId },
      data: { khaltiPidx: pidx },
    });
  }

  // Payment release is the final stage of a project — no separate creator
  // confirmation step — so workStatus flips straight to COMPLETED here too.
  async releaseApplicationPayment(appId: string, adminId: string) {
    return prisma.application.update({
      where: { id: appId },
      data: { paymentStatus: 'RELEASED', releasedAt: new Date(), releasedByAdminId: adminId, workStatus: WorkStatus.COMPLETED },
    });
  }

  // Ledger entry for the business escrowing funds — see PaymentTransaction's
  // schema comment for why this exists alongside Application.paymentStatus.
  async createEscrowTransaction(params: {
    applicationId: string;
    campaignId: string;
    businessId: string;
    creatorId: string;
    amount: number;
    method: string;
  }) {
    return prisma.paymentTransaction.create({
      data: {
        type:          'ESCROW_IN',
        amount:        params.amount,
        method:        params.method,
        applicationId: params.applicationId,
        campaignId:    params.campaignId,
        businessId:    params.businessId,
        creatorId:     params.creatorId,
      },
    });
  }

  // Ledger entry for the platform releasing escrow to the creator.
  async createPayoutTransaction(params: {
    applicationId: string;
    campaignId: string;
    businessId: string;
    creatorId: string;
    adminId: string;
    amount: number;
  }) {
    return prisma.paymentTransaction.create({
      data: {
        type:          'PAYOUT',
        amount:        params.amount,
        applicationId: params.applicationId,
        campaignId:    params.campaignId,
        businessId:    params.businessId,
        creatorId:     params.creatorId,
        adminId:       params.adminId,
      },
    });
  }

  async countAcceptedApplications(campaignId: string): Promise<number> {
    return prisma.application.count({
      where: { campaignId, status: 'ACCEPTED' },
    });
  }

  // "Unresolved" = still pending a decision, or accepted but the work isn't
  // done yet. Used to gate manual campaign close — see CampaignService.update.
  async countUnresolvedApplications(campaignId: string): Promise<number> {
    return prisma.application.count({
      where: {
        campaignId,
        OR: [
          { status: 'PENDING' },
          { status: 'ACCEPTED', workStatus: { not: 'COMPLETED' } },
        ],
      },
    });
  }

  // Narrower than countUnresolvedApplications above — only counts accepted
  // applications where the creator is actively mid-work (has started but not
  // yet submitted/approved). Used to gate pausing a campaign: unlike closing,
  // pausing merely a pending applicant or an accepted-but-not-yet-started
  // proposal is fine, but interrupting a creator's active work isn't.
  async countActiveWorkApplications(campaignId: string): Promise<number> {
    return prisma.application.count({
      where: { campaignId, status: 'ACCEPTED', workStatus: { in: ['IN_PROGRESS', 'SUBMITTED'] } },
    });
  }

  // Drafts don't count against the free-feature quota — only ones the
  // business actually published. See CampaignService.getFeaturedQuota.
  async countFeaturedCampaigns(businessId: string): Promise<number> {
    return prisma.campaign.count({
      where: { businessId, isFeatured: true, status: { not: 'DRAFT' } },
    });
  }

  // Used by the admin-configurable "campaign creation per day" rate limit —
  // see CampaignService.create. Drafts are excluded, matching
  // countFeaturedCampaigns' existing convention (a draft isn't live content).
  async countCampaignsCreatedSince(businessId: string, since: Date): Promise<number> {
    return prisma.campaign.count({
      where: { businessId, createdAt: { gte: since }, status: { not: 'DRAFT' } },
    });
  }

  async rejectPendingApplications(
    campaignId: string,
    excludeAppId: string
  ): Promise<{ id: string; creator: { userId: string } }[]> {
    const pending = await prisma.application.findMany({
      where: { campaignId, id: { not: excludeAppId }, status: 'PENDING' },
      select: { id: true, creator: { select: { userId: true } } },
    });
    if (pending.length === 0) return [];
    await prisma.application.updateMany({
      where: { id: { in: pending.map((a) => a.id) } },
      data: { status: 'REJECTED' },
    });
    return pending;
  }

  // ── CampaignRequirement capacity enforcement ─────────────────────────────────
  // Mirrors the whole-campaign methods above (countAcceptedApplications,
  // rejectPendingApplications, findPendingApplicationsByCampaign) but scoped to
  // one requirement, so filling one role in a multi-requirement campaign
  // doesn't touch applicants for a different, still-open role.

  async countAcceptedApplicationsForRequirement(requirementId: string): Promise<number> {
    return prisma.application.count({ where: { requirementId, status: 'ACCEPTED' } });
  }

  async findPendingApplicationsForRequirement(requirementId: string, excludeAppId: string) {
    return prisma.application.findMany({
      where: { requirementId, id: { not: excludeAppId }, status: 'PENDING' },
      include: { creator: { select: { userId: true } } },
    });
  }

  async rejectPendingApplicationsForRequirement(
    requirementId: string,
    excludeAppId: string
  ): Promise<{ id: string; creator: { userId: string } }[]> {
    const pending = await prisma.application.findMany({
      where: { requirementId, id: { not: excludeAppId }, status: 'PENDING' },
      select: { id: true, creator: { select: { userId: true } } },
    });
    if (pending.length === 0) return [];
    await prisma.application.updateMany({
      where: { id: { in: pending.map((a) => a.id) } },
      data: { status: 'REJECTED' },
    });
    return pending;
  }

  async findRequirementById(requirementId: string) {
    return prisma.campaignRequirement.findUnique({
      where: { id: requirementId },
      select: {
        id: true, campaignId: true, categoryId: true, quantity: true,
        budgetType: true, budgetFixed: true, budgetMin: true, budgetMax: true,
        deliverables: true, description: true, format: true, deadline: true,
        category: { select: { name: true } },
      },
    });
  }

  // True only once every requirement on the campaign has enough ACCEPTED
  // applications to meet its quantity — the trigger for closing the whole
  // campaign once all roles are filled, as opposed to just one.
  async areAllRequirementsFilled(campaignId: string): Promise<boolean> {
    const requirements = await prisma.campaignRequirement.findMany({
      where: { campaignId },
      select: { id: true, quantity: true },
    });
    if (requirements.length === 0) return false;
    const counts = await Promise.all(
      requirements.map((r) => prisma.application.count({ where: { requirementId: r.id, status: 'ACCEPTED' } }))
    );
    return requirements.every((r, i) => counts[i] >= r.quantity);
  }

  async closeCampaign(campaignId: string): Promise<void> {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'CLOSED' },
    });
  }

  async cancelCampaign(campaignId: string) {
    return prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'CANCELLED' },
    });
  }

  // Cascades a past-deadline campaign's expiry onto its still-undecided
  // applications in one transaction — ACCEPTED/REJECTED applications are
  // untouched, so an accepted collaboration keeps working normally even
  // after its parent campaign expires (see CampaignService.expireCampaignsPastDeadline
  // for the notification/activity-log fan-out this feeds).
  async expireCampaignsPastDeadline(): Promise<{
    campaigns: { id: string; title: string; campaignType: CampaignType; business: { userId: string; businessName: string | null } }[];
    applications: { id: string; campaignId: string; creator: { userId: string } }[];
  }> {
    const campaigns = await prisma.campaign.findMany({
      where: { status: 'ACTIVE', deadline: { lt: new Date() } },
      select: { id: true, title: true, campaignType: true, business: { select: { userId: true, businessName: true } } },
    });
    if (campaigns.length === 0) return { campaigns: [], applications: [] };

    const campaignIds = campaigns.map((c) => c.id);
    const applications = await prisma.application.findMany({
      where: { campaignId: { in: campaignIds }, status: 'PENDING' },
      select: { id: true, campaignId: true, creator: { select: { userId: true } } },
    });

    const ops: Prisma.PrismaPromise<unknown>[] = [
      prisma.campaign.updateMany({ where: { id: { in: campaignIds } }, data: { status: 'EXPIRED' } }),
    ];
    if (applications.length > 0) {
      ops.push(
        prisma.application.updateMany({
          where: { id: { in: applications.map((a) => a.id) } },
          data: { status: 'EXPIRED' },
        })
      );
    }
    await prisma.$transaction(ops);

    return { campaigns, applications };
  }

  // Every call site already gates its send on `if (email) { ... }` — omitting
  // opted-out users from the returned Map (rather than threading a separate
  // flag through all 7 call sites) makes that existing check double as the
  // emailNotificationsEnabled gate for free.
  async getUserEmails(userIds: string[]): Promise<Map<string, string>> {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, emailNotificationsEnabled: true },
      select: { id: true, email: true },
    });
    return new Map(users.map((u) => [u.id, u.email]));
  }
}
