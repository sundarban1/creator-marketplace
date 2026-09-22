import prisma from '../../prisma';
import type { Prisma, MeetupRegistrationStatus } from '@prisma/client';

export class MeetupRepository {
  async findCreatorProfileByUserId(userId: string) {
    return prisma.creatorProfile.findUnique({
      where: { userId },
      include: { user: { select: { email: true } } },
    });
  }

  async create(data: Prisma.CreatorMeetupCreateInput) {
    return prisma.creatorMeetup.create({ data });
  }

  async update(id: string, data: Prisma.CreatorMeetupUpdateInput) {
    return prisma.creatorMeetup.update({ where: { id }, data });
  }

  async findById(id: string) {
    return prisma.creatorMeetup.findUnique({ where: { id } });
  }

  async findBySlugOrId(idOrSlug: string) {
    return prisma.creatorMeetup.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });
  }

  async isSlugTaken(slug: string) {
    const existing = await prisma.creatorMeetup.findUnique({ where: { slug }, select: { id: true } });
    return !!existing;
  }

  /** Meetups a creator should currently see — open for registration and not completed/cancelled (spec §25). */
  async findVisibleOpenForCreator() {
    return prisma.creatorMeetup.findMany({
      where: {
        registrationStatus: 'OPEN',
        status: { in: ['UPCOMING', 'ACTIVE'] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAllForAdmin() {
    return prisma.creatorMeetup.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async countRegistrationsByStatus(meetupId: string) {
    const [rows, checkedIn] = await Promise.all([
      prisma.creatorMeetupRegistration.groupBy({
        by:    ['status'],
        where: { meetupId },
        _count: { _all: true },
      }),
      prisma.creatorMeetupRegistration.count({ where: { meetupId, checkedInAt: { not: null } } }),
    ]);
    const counts = { total: 0, pending: 0, accepted: 0, rejected: 0, checkedIn };
    for (const row of rows) {
      counts.total += row._count._all;
      if (row.status === 'PENDING') counts.pending = row._count._all;
      if (row.status === 'ACCEPTED') counts.accepted = row._count._all;
      if (row.status === 'REJECTED') counts.rejected = row._count._all;
    }
    return counts;
  }

  async findRegistration(meetupId: string, creatorId: string) {
    return prisma.creatorMeetupRegistration.findUnique({
      where: { meetupId_creatorId: { meetupId, creatorId } },
    });
  }

  async createRegistration(data: Prisma.CreatorMeetupRegistrationCreateInput) {
    return prisma.creatorMeetupRegistration.create({ data });
  }

  async findMyRegistrations(creatorId: string) {
    return prisma.creatorMeetupRegistration.findMany({
      where:   { creatorId },
      include: { meetup: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listRegistrations(meetupId: string, filter: { status?: MeetupRegistrationStatus; search?: string }) {
    return prisma.creatorMeetupRegistration.findMany({
      where: {
        meetupId,
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.search
          ? {
              OR: [
                { fullName: { contains: filter.search, mode: 'insensitive' } },
                { phoneNumber: { contains: filter.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findRegistrationById(meetupId: string, registrationId: string) {
    return prisma.creatorMeetupRegistration.findFirst({
      where: { id: registrationId, meetupId },
      include: { creator: { select: { user: { select: { email: true } } } } },
    });
  }

  async updateRegistration(id: string, data: Prisma.CreatorMeetupRegistrationUpdateInput) {
    return prisma.creatorMeetupRegistration.update({ where: { id }, data });
  }
}
