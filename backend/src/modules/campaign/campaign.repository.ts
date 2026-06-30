import { CampaignStatus, WorkStatus, PaymentStatus, Prisma } from '@prisma/client';
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
    search?: string;
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

    if (filters.search) {
      where.OR = [
        { title:    { contains: filters.search, mode: 'insensitive' } },
        { business: { businessName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

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

  async findApplicationsByBusinessId(businessId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where: { campaign: { businessId } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
            select: { id: true, title: true, platform: true, campaignType: true, paymentStatus: true },
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

  async findApplicationsByCreator(creatorId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where: { creatorId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
              platform: true,
              budgetMin: true,
              budgetMax: true,
              deadline: true,
              status: true,
              campaignType: true,
              paymentStatus: true,
              paidAt: true,
              business: { select: { id: true, businessName: true, logoUrl: true } },
            },
          },
        },
      }),
      prisma.application.count({ where: { creatorId } }),
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

  async releaseApplicationPayment(appId: string) {
    return prisma.application.update({
      where: { id: appId },
      data: { paymentStatus: 'RELEASED' },
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
      data: { status: 'CLOSED' },
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
