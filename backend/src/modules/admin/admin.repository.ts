import { Role, CampaignStatus } from '@prisma/client';
import prisma from '../../prisma';

// ── Default platform settings ──────────────────────────────────────────────────

const DEFAULTS: Record<string, unknown> = {
  'registration.enabled':          true,
  'creator.onboarding':            true,
  'business.onboarding':           true,
  'campaign.autoApproval':         false,
  'payment.escrow':                true,
  'messaging.enabled':             true,
  'messaging.directMessages':      true,
  'messaging.pushNotifications':   true,
  'messaging.typingIndicators':    true,
  'notifications.email':           true,
  'notifications.reportAlerts':    true,
  'notifications.paymentAlerts':   true,
  'notifications.weeklySummary':   false,
  'security.twoFactor':            true,
  'security.ipAllowlist':          false,
  'security.auditLogging':         true,
  'security.sessionTimeout':       true,
};

export class AdminRepository {
  async getStats() {
    const [totalUsers, totalCreators, totalBusinesses, activeCampaigns, totalCampaigns, pendingApplications] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: Role.CREATOR } }),
        prisma.user.count({ where: { role: Role.BUSINESS } }),
        prisma.campaign.count({ where: { status: CampaignStatus.ACTIVE } }),
        prisma.campaign.count(),
        prisma.application.count({ where: { status: 'PENDING' } }),
      ]);

    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        creatorProfile:  { select: { fullName: true } },
        businessProfile: { select: { businessName: true } },
      },
    });

    return {
      totalUsers,
      totalCreators,
      totalBusinesses,
      activeCampaigns,
      totalCampaigns,
      pendingApplications,
      recentUsers,
    };
  }

  async getAllUsers(
    page: number,
    limit: number,
    role?: string,
    search?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (role) where['role'] = role as Role;
    if (search) {
      where['OR'] = [
        { email: { contains: search, mode: 'insensitive' } },
        { creatorProfile:  { fullName:     { contains: search, mode: 'insensitive' } } },
        { businessProfile: { businessName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        // `id` is a tie-breaker, not a display order — createdAt alone isn't
        // unique, so without it Postgres can return the same row on two
        // different pages (or skip one) as the result set shifts between
        // paginated queries.
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        select: {
          id:              true,
          email:           true,
          role:            true,
          isEmailVerified: true,
          isActive:        true,
          createdAt:       true,
          creatorProfile:  { select: { fullName:     true, avatarUrl: true, isVerified: true } },
          businessProfile: { select: { businessName: true, logoUrl:   true, isVerified: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async getAllCreators(page: number, limit: number, search?: string) {
    const where: Record<string, unknown> = {};
    if (search) {
      where['OR'] = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [creators, total] = await Promise.all([
      prisma.creatorProfile.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: {
          user:   { select: { id: true, email: true, isEmailVerified: true, isActive: true, createdAt: true } },
          _count: { select: { applications: true } },
        },
      }),
      prisma.creatorProfile.count({ where }),
    ]);

    return { creators, total };
  }

  async getAllBusinesses(page: number, limit: number, search?: string) {
    const where: Record<string, unknown> = {};
    if (search) {
      where['OR'] = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [businesses, total] = await Promise.all([
      prisma.businessProfile.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: {
          user:   { select: { id: true, email: true, isEmailVerified: true, isActive: true, createdAt: true } },
          _count: { select: { campaigns: true } },
        },
      }),
      prisma.businessProfile.count({ where }),
    ]);

    return { businesses, total };
  }

  async getAllCampaigns(
    page: number,
    limit: number,
    status?: string,
    search?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (status) where['status'] = status as CampaignStatus;
    if (search) {
      where['OR'] = [
        { title:    { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { business: { businessName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: {
          business: { select: { businessName: true, logoUrl: true } },
          _count:   { select: { applications: true } },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    return { campaigns, total };
  }

  async getCampaignDetail(campaignId: string) {
    return prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        business: {
          select: { id: true, businessName: true, logoUrl: true, website: true, description: true },
        },
        applications: {
          orderBy: { createdAt: 'desc' },
          include: {
            creator: {
              select: {
                id: true, fullName: true, avatarUrl: true, location: true, categories: true,
                user: { select: { email: true } },
              },
            },
          },
        },
        _count: { select: { applications: true } },
      },
    });
  }

  async updateUserVerification(userId: string, isEmailVerified: boolean) {
    return prisma.user.update({
      where: { id: userId },
      data:  { isEmailVerified },
      select: { id: true, email: true, isEmailVerified: true },
    });
  }

  async updateCreatorVerification(creatorProfileId: string, isVerified: boolean) {
    const data: { isVerified: boolean; citizenshipStatus?: 'APPROVED' } = { isVerified };
    if (isVerified) {
      const existing = await prisma.creatorProfile.findUnique({
        where:  { id: creatorProfileId },
        select: { citizenshipDocUrl: true },
      });
      if (existing?.citizenshipDocUrl) data.citizenshipStatus = 'APPROVED';
    }
    return prisma.creatorProfile.update({
      where: { id: creatorProfileId },
      data,
      select: {
        id: true, userId: true, fullName: true, isVerified: true, citizenshipStatus: true, citizenshipDocUrl: true,
        user: { select: { email: true } },
      },
    });
  }

  async updateBusinessVerification(businessProfileId: string, isVerified: boolean) {
    const data: { isVerified: boolean; panDocStatus?: 'APPROVED'; companyRegDocStatus?: 'APPROVED' } = { isVerified };
    if (isVerified) {
      const existing = await prisma.businessProfile.findUnique({
        where:  { id: businessProfileId },
        select: { panDocUrl: true, companyRegDocUrl: true },
      });
      if (existing?.panDocUrl) data.panDocStatus = 'APPROVED';
      if (existing?.companyRegDocUrl) data.companyRegDocStatus = 'APPROVED';
    }
    return prisma.businessProfile.update({
      where: { id: businessProfileId },
      data,
      select: {
        id: true, userId: true, businessName: true, isVerified: true,
        panDocUrl: true, panDocStatus: true, companyRegDocUrl: true, companyRegDocStatus: true,
        user: { select: { email: true } },
      },
    });
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { id: true, email: true, isActive: true },
    });
    if (!user) throw new Error('User not found');
    return user;
  }

  async updateUserActiveStatus(userId: string, isActive: boolean) {
    return prisma.user.update({
      where:  { id: userId },
      data:   { isActive, suspendedAt: isActive ? null : new Date() },
      select: { id: true, email: true, isActive: true },
    });
  }

  async updateCampaignStatus(campaignId: string, status: CampaignStatus) {
    return prisma.campaign.update({
      where: { id: campaignId },
      data:  { status },
      select: { id: true, title: true, status: true },
    });
  }

  async deleteUser(userId: string) {
    return prisma.user.delete({ where: { id: userId } });
  }

  // ── Platform Settings ────────────────────────────────────────────────────────

  async getSettings(): Promise<Record<string, unknown>> {
    const rows = await prisma.platformSetting.findMany();
    const stored: Record<string, unknown> = {};
    for (const row of rows) {
      try { stored[row.key] = JSON.parse(row.value); } catch { stored[row.key] = row.value; }
    }
    return { ...DEFAULTS, ...stored };
  }

  async upsertSettings(settings: Record<string, unknown>): Promise<void> {
    await prisma.$transaction(
      Object.entries(settings).map(([key, value]) =>
        prisma.platformSetting.upsert({
          where:  { key },
          update: { value: JSON.stringify(value) },
          create: { key, value: JSON.stringify(value) },
        })
      )
    );
  }

  async getSetting(key: string): Promise<unknown> {
    const row = await prisma.platformSetting.findUnique({ where: { key } });
    if (!row) return DEFAULTS[key] ?? null;
    try { return JSON.parse(row.value); } catch { return row.value; }
  }

  // ── Admin Conversations ──────────────────────────────────────────────────────

  async getConversationStats() {
    const [total, pending, accepted, declined, totalMessages] = await Promise.all([
      prisma.conversation.count(),
      prisma.conversation.count({ where: { status: 'PENDING' } }),
      prisma.conversation.count({ where: { status: 'ACCEPTED' } }),
      prisma.conversation.count({ where: { status: 'DECLINED' } }),
      prisma.message.count(),
    ]);
    return { total, pending, accepted, declined, totalMessages };
  }

  async getAllConversations(page: number, limit: number, status?: string, search?: string) {
    const where: Record<string, unknown> = {};
    if (status) where['status'] = status;
    if (search) {
      where['OR'] = [
        { creator:  { fullName:     { contains: search, mode: 'insensitive' } } },
        { business: { businessName: { contains: search, mode: 'insensitive' } } },
        { campaign: { title:        { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        // `id` tie-breaker matters even more here since lastMessageAt is
        // nullable — ties (including null vs null) are common.
        orderBy: [{ lastMessageAt: 'desc' }, { id: 'asc' }],
        include: {
          creator:  { select: { fullName: true, avatarUrl: true } },
          business: { select: { businessName: true, logoUrl: true } },
          campaign: { select: { title: true } },
          _count:   { select: { messages: true } },
        },
      }),
      prisma.conversation.count({ where }),
    ]);

    return { conversations, total };
  }

  async deleteConversation(id: string) {
    return prisma.conversation.delete({ where: { id } });
  }
}
