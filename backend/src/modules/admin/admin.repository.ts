import { Role, CampaignStatus } from '@prisma/client';
import prisma from '../../prisma';

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
        orderBy: { createdAt: 'desc' },
        select: {
          id:              true,
          email:           true,
          role:            true,
          isEmailVerified: true,
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
        orderBy: { createdAt: 'desc' },
        include: {
          user:   { select: { email: true, isEmailVerified: true, createdAt: true } },
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
        orderBy: { createdAt: 'desc' },
        include: {
          user:   { select: { email: true, isEmailVerified: true, createdAt: true } },
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
        orderBy: { createdAt: 'desc' },
        include: {
          business: { select: { businessName: true, logoUrl: true } },
          _count:   { select: { applications: true } },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    return { campaigns, total };
  }

  async updateUserVerification(userId: string, isEmailVerified: boolean) {
    return prisma.user.update({
      where: { id: userId },
      data:  { isEmailVerified },
      select: { id: true, email: true, isEmailVerified: true },
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
}
