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
        // `id` is a tie-breaker, not a display order — isVerified+businessName
        // isn't unique (bulk-seeded/duplicate-named rows can tie on both), and
        // without a fully deterministic sort, Postgres can return the same
        // row on two different pages (or skip one entirely) as the result
        // set shifts between paginated queries.
        orderBy: [{ isVerified: 'desc' }, { businessName: 'asc' }, { id: 'asc' }],
        select: {
          id:           true,
          businessName: true,
          description:  true,
          logoUrl:      true,
          website:      true,
          categories:   true,
          isVerified:   true,
          panDocStatus: true,
          companyRegDocStatus: true,
          user: { select: { isEmailVerified: true, isPhoneVerified: true } },
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
        panDocStatus:         true,
        companyRegDocStatus:  true,
        createdAt:            true,
        showPublicProfile:    true,
        hideContactDetails:   true,
        allowDirectMessages:  true,
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
