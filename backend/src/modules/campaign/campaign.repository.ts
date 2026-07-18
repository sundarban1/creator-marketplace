import { CampaignStatus, CampaignType, ApplicationStatus, WorkStatus, PaymentStatus, Prisma } from '@prisma/client';
import prisma from '../../prisma';

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
    location?: string;
    locationLat?: number;
    locationLng?: number;
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
    status?: 'DRAFT' | 'ACTIVE';
    objective?: string;
    contentGuidelines?: string[];
    targetAudience?: string[];
    hashtags?: string[];
    sampleCaption?: string;
    callToAction?: string;
    approvalRequirements?: string;
    aiGenerated?: boolean;
    aiPrompt?: string;
    aiSuggestedCategories?: string[];
    aiSuggestedPlatforms?: string[];
    aiNeedsInputFields?: string[];
  }) {
    return prisma.campaign.create({
      data: {
        ...data,
        campaignType: data.campaignType ?? 'PAID_CAMPAIGN',
        capacity:     data.capacity ?? null,
        eventDate:    data.eventDate ?? null,
        venue:        data.venue ?? null,
        benefits:     data.benefits ?? [],
        status:       data.status ?? 'ACTIVE',
        eventStatus:  'OPEN',
      },
      include: {
        business: { select: { businessName: true, logoUrl: true } },
        _count: { select: { applications: true } },
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
    const where: Prisma.CampaignWhereInput = {};

    if (filters.search) {
      where.OR = [
        { title:    { contains: filters.search, mode: 'insensitive' } },
        { business: { businessName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

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
  async findNearby(params: { lat: number; lng: number; radiusKm: number; page: number; limit: number }) {
    const { lat, lng, radiusKm, page, limit } = params;

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
      c.status = 'ACTIVE'
      AND c."locationLat" IS NOT NULL
      AND c."locationLng" IS NOT NULL
      AND c."locationLat" BETWEEN ${lat - latDelta} AND ${lat + latDelta}
      AND c."locationLng" BETWEEN ${lng - lngDelta} AND ${lng + lngDelta}
    `;

    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<{ id: string; distanceKm: number }[]>(Prisma.sql`
        SELECT id, ${distanceExpr} AS "distanceKm"
        FROM campaigns c
        WHERE ${boundingBoxWhere}
          AND (${distanceExpr}) <= ${radiusKm}
        ORDER BY "distanceKm" ASC
        LIMIT ${limit} OFFSET ${offset}
      `),
      prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM campaigns c
        WHERE ${boundingBoxWhere}
          AND (${distanceExpr}) <= ${radiusKm}
      `),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    if (rows.length === 0) return { campaigns: [], total };

    const distanceById = new Map(rows.map((r) => [r.id, r.distanceKm]));
    const hydrated = await prisma.campaign.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      include: {
        business: { select: { businessName: true, logoUrl: true } },
        _count: { select: { applications: true } },
      },
    });

    // findMany doesn't preserve `in` order, so re-sort to match the distance-ranked SQL result
    const byId = new Map(hydrated.map((c) => [c.id, c]));
    const campaigns = rows
      .map((r) => byId.get(r.id))
      .filter((c): c is NonNullable<typeof c> => c != null)
      .map((c) => ({ ...c, distanceKm: distanceById.get(c.id)! }));

    return { campaigns, total };
  }

  async findById(id: string) {
    return prisma.campaign.findUnique({
      where: { id },
      include: {
        business: {
          select: { businessName: true, logoUrl: true, website: true, description: true },
        },
        _count: { select: { applications: true } },
      },
    });
  }

  async findByBusinessId(businessId: string, page: number, limit: number, status?: CampaignStatus) {
    const skip = (page - 1) * limit;
    const where: Prisma.CampaignWhereInput = { businessId, ...(status ? { status } : {}) };
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
  }>) {
    return prisma.campaign.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.campaign.delete({ where: { id } });
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

  async findApplication(campaignId: string, creatorId: string) {
    return prisma.application.findUnique({
      where: { campaignId_creatorId: { campaignId, creatorId } },
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
  }) {
    return prisma.application.create({
      data,
      include: {
        campaign: { select: { title: true } },
        creator: { select: { fullName: true } },
      },
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
          submittedAt: true,
          deliverableUrls: true,
          paymentStatus: true,
          paidAt: true,
          createdAt: true,
          creator: {
            select: { id: true, fullName: true, avatarUrl: true, location: true },
          },
          campaign: {
            select: { id: true, title: true, platforms: true, campaignType: true, paymentStatus: true, featureImageUrl: true },
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

  async updateApplicationStatus(id: string, status: 'ACCEPTED' | 'REJECTED') {
    return prisma.application.update({
      where: { id },
      data: { status },
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
          coverLetter: true,
          proposedRate: true,
          timeline: true,
          socialHandles: true,
          portfolioUrl: true,
          status: true,
          workStatus: true,
          workNote: true,
          submittedAt: true,
          deliverableUrls: true,
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

  async requestRevision(appId: string, note: string) {
    return prisma.application.update({
      where: { id: appId },
      data: { workStatus: WorkStatus.IN_PROGRESS, workNote: note },
    });
  }

  async payForApplication(appId: string) {
    return prisma.application.update({
      where: { id: appId },
      data: { paymentStatus: 'PAID', paidAt: new Date() },
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

  async countAcceptedApplications(campaignId: string): Promise<number> {
    return prisma.application.count({
      where: { campaignId, status: 'ACCEPTED' },
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

  async getUserEmails(userIds: string[]): Promise<Map<string, string>> {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    return new Map(users.map((u) => [u.id, u.email]));
  }
}
