import { Prisma } from '@prisma/client';
import prisma from '../../prisma';

export class BusinessRepository {
  async findMany(params: {
    search?:    string;
    category?:  string;
    platform?:  string;
    locations?: string[]; // OR-matched against campaign.location
    page:       number;
    limit:      number;
  }) {
    const where: Prisma.BusinessProfileWhereInput = { showPublicProfile: true };

    if (params.search) {
      where.businessName = { contains: params.search, mode: 'insensitive' };
    }
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
        orderBy: [{ isVerified: 'desc' }, { businessName: 'asc' }],
        select: {
          id:           true,
          businessName: true,
          description:  true,
          logoUrl:      true,
          website:      true,
          categories:   true,
          isVerified:   true,
          _count: { select: { campaigns: { where: { status: 'ACTIVE' } } } },
        },
      }),
      prisma.businessProfile.count({ where }),
    ]);
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
        createdAt:            true,
        showPublicProfile:    true,
        hideContactDetails:   true,
        allowDirectMessages:  true,
        userId:               true,
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
        _count: { select: { campaigns: { where: { status: 'ACTIVE' } } } },
      },
    });
  }

  async findByUserId(userId: string) {
    return prisma.businessProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, role: true, isEmailVerified: true } },
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
      website: string | null;
      categories: string[];
      panNo: string | null;
      location: string | null;
      phone: string | null;
      showPublicProfile: boolean;
      hideContactDetails: boolean;
      allowDirectMessages: boolean;
      socialLinks: Record<string, string>;
      presenceServices: string[];
      paymentMethods: string[];
      defaultPlatforms: string[];
      defaultCreatorCategories: string[];
      defaultBudgetRange: string | null;
    }>
  ) {
    return prisma.businessProfile.update({
      where: { userId },
      data,
    });
  }

  async updatePanDoc(userId: string, docUrl: string) {
    return prisma.businessProfile.update({
      where: { userId },
      data:  { panDocUrl: docUrl, panDocStatus: 'PENDING', panDocUploadedAt: new Date() },
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
}
