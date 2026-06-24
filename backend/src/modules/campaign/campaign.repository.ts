import { CampaignStatus, Prisma } from '@prisma/client';
import prisma from '../../prisma';

export class CampaignRepository {
  async create(data: {
    businessId: string;
    title: string;
    description: string;
    template?: string;
    category: string;
    goals?: string[];
    platform: string;
    minFollowers: number;
    contentType: string;
    deliverables: string;
    deadline: Date;
    location?: string;
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
  }) {
    return prisma.campaign.create({
      data: {
        ...data,
        campaignType: data.campaignType ?? 'PAID_CAMPAIGN',
        capacity:     data.capacity ?? null,
        eventDate:    data.eventDate ?? null,
        venue:        data.venue ?? null,
        benefits:     data.benefits ?? [],
        eventStatus:  'OPEN',
      },
      include: {
        business: { select: { businessName: true, logoUrl: true } },
        _count: { select: { applications: true } },
      },
    });
  }

  async findMany(filters: {
    category?: string;
    platform?: string;
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

    if (filters.category) {
      where.category = { contains: filters.category, mode: 'insensitive' };
    }
    if (filters.platform) {
      where.platform = { contains: filters.platform, mode: 'insensitive' };
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

  async findByBusinessId(businessId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where: { businessId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { applications: true } } },
      }),
      prisma.campaign.count({ where: { businessId } }),
    ]);

    return { campaigns, total };
  }

  async update(id: string, data: Partial<{
    title: string;
    description: string;
    template: string;
    category: string;
    goals: string[];
    platform: string;
    minFollowers: number;
    contentType: string;
    deliverables: string;
    deadline: Date;
    location: string | null;
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
    const rows = await prisma.campaign.findMany({
      where: { status: 'ACTIVE' },
      select: { platform: true },
      distinct: ['platform'],
      orderBy: { platform: 'asc' },
    });
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

  async findApplicationsByBusinessId(businessId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where: { campaign: { businessId } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: { id: true, fullName: true, avatarUrl: true, location: true },
          },
          campaign: {
            select: { id: true, title: true, platform: true, campaignType: true },
          },
        },
      }),
      prisma.application.count({ where: { campaign: { businessId } } }),
    ]);
    return { applications, total };
  }

  async findApplicationById(id: string) {
    return prisma.application.findUnique({
      where: { id },
      include: {
        campaign: true,
        creator: { select: { userId: true, fullName: true } },
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

  async findApplicationsByCreator(creatorId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where: { creatorId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: {
            select: {
              id: true,
              title: true,
              category: true,
              platform: true,
              budgetMin: true,
              budgetMax: true,
              deadline: true,
              status: true,
              business: { select: { businessName: true, logoUrl: true } },
            },
          },
        },
      }),
      prisma.application.count({ where: { creatorId } }),
    ]);

    return { applications, total };
  }
}
