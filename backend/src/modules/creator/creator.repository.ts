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
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, fullName: true, bio: true, avatarUrl: true,
          location: true, categories: true, isVerified: true,
          prefBudgetMin: true, prefBudgetMax: true,
          socialAccounts: { select: { platform: true, followers: true } },
        },
      }),
      prisma.creatorProfile.count({ where }),
    ]);
    return { creators, total };
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
        user: { select: { id: true, email: true, role: true, isEmailVerified: true, isOnboarded: true } },
        socialAccounts: { orderBy: { createdAt: 'asc' } },
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
        prefBudgetMin: true,
        prefBudgetMax: true,
        prefPlatforms: true,
        portfolioLinks: true,
        socialLinks: true,
        socialAccounts: {
          select: { id: true, platform: true, followers: true, profileUrl: true },
          orderBy: { followers: 'desc' },
        },
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

  async update(userId: string, data: Partial<{
    username:    string;
    fullName:    string;
    bio:         string;
    location:    string;
    locationLat: number;
    locationLng: number;
    avatarUrl:   string;
    categories:  string[];
  }>) {
    return prisma.creatorProfile.update({ where: { userId }, data });
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
