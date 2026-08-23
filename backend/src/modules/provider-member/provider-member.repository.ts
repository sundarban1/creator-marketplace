import { InvitationStatus, ProviderMemberRole } from '@prisma/client';
import prisma from '../../prisma';

// Name/avatar/categories are read from the member's own CreatorProfile rather
// than copied onto the membership — see the model comment in schema.prisma.
const MEMBER_SELECT = {
  id: true,
  userId: true,
  fullName: true,
  username: true,
  avatarUrl: true,
  categories: true,
  isVerified: true,
} as const;

const PROVIDER_SELECT = {
  id: true,
  userId: true,
  fullName: true,
  avatarUrl: true,
  providerType: true,
} as const;

export class ProviderMemberRepository {
  async findByProviderId(providerId: string) {
    return prisma.providerMember.findMany({
      where: { providerId, status: { not: InvitationStatus.DECLINED } },
      include: { member: { select: MEMBER_SELECT } },
      orderBy: [{ status: 'asc' }, { invitedAt: 'desc' }],
    });
  }

  // The other direction: memberships this provider was invited into.
  async findByMemberId(memberId: string) {
    return prisma.providerMember.findMany({
      where: { memberId, status: { not: InvitationStatus.DECLINED } },
      include: { provider: { select: PROVIDER_SELECT } },
      orderBy: [{ status: 'asc' }, { invitedAt: 'desc' }],
    });
  }

  async findById(id: string) {
    return prisma.providerMember.findUnique({
      where: { id },
      include: { member: { select: MEMBER_SELECT }, provider: { select: PROVIDER_SELECT } },
    });
  }

  async findByProviderAndMember(providerId: string, memberId: string) {
    return prisma.providerMember.findUnique({
      where: { providerId_memberId: { providerId, memberId } },
      include: { member: { select: MEMBER_SELECT } },
    });
  }

  async create(data: { providerId: string; memberId: string; jobRole?: string; accessRole?: ProviderMemberRole }) {
    return prisma.providerMember.create({
      data,
      include: { member: { select: MEMBER_SELECT } },
    });
  }

  // Re-inviting someone who previously declined reuses their row (the
  // provider+member pair is unique) and puts it back to PENDING.
  async reinvite(id: string, data: { jobRole?: string; accessRole?: ProviderMemberRole }) {
    return prisma.providerMember.update({
      where: { id },
      data: { ...data, status: InvitationStatus.PENDING, invitedAt: new Date(), respondedAt: null },
      include: { member: { select: MEMBER_SELECT } },
    });
  }

  async update(id: string, data: { jobRole?: string | null; accessRole?: ProviderMemberRole }) {
    return prisma.providerMember.update({
      where: { id },
      data,
      include: { member: { select: MEMBER_SELECT } },
    });
  }

  async respond(id: string, status: InvitationStatus) {
    return prisma.providerMember.update({
      where: { id },
      data: { status, respondedAt: new Date() },
      include: { member: { select: MEMBER_SELECT }, provider: { select: PROVIDER_SELECT } },
    });
  }

  async delete(id: string) {
    return prisma.providerMember.delete({ where: { id } });
  }

  async countAccepted(providerId: string) {
    return prisma.providerMember.count({ where: { providerId, status: InvitationStatus.ACCEPTED } });
  }

  // ── §13/§16 assignments ────────────────────────────────────────────────────

  async findApplicationForAssignment(applicationId: string) {
    return prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        creatorId: true,
        status: true,
        campaign: { select: { id: true, title: true } },
      },
    });
  }

  async findAssignments(applicationId: string) {
    return prisma.applicationAssignment.findMany({
      where: { applicationId },
      include: { member: { select: MEMBER_SELECT } },
      orderBy: { assignedAt: 'asc' },
    });
  }

  async findAssignmentById(id: string) {
    return prisma.applicationAssignment.findUnique({
      where: { id },
      include: { application: { select: { id: true, creatorId: true } } },
    });
  }

  async createAssignment(data: { applicationId: string; memberId: string; note?: string }) {
    return prisma.applicationAssignment.create({
      data,
      include: { member: { select: MEMBER_SELECT } },
    });
  }

  async deleteAssignment(id: string) {
    return prisma.applicationAssignment.delete({ where: { id } });
  }

  // The other direction: work assigned TO this provider by a team they're in.
  async findAssignmentsForMember(memberId: string) {
    return prisma.applicationAssignment.findMany({
      where: { memberId },
      orderBy: { assignedAt: 'desc' },
      include: {
        application: {
          select: {
            id: true, status: true, workStatus: true,
            campaign: { select: { id: true, title: true, featureImageUrl: true } },
            creator:  { select: { id: true, fullName: true, avatarUrl: true, providerType: true } },
          },
        },
      },
    });
  }

  async findCreatorByEmailOrPhone(identifier: { email?: string; phone?: string }) {
    const user = await prisma.user.findFirst({
      where: identifier.email ? { email: identifier.email } : { phone: identifier.phone },
      select: { id: true, role: true, creatorProfile: { select: MEMBER_SELECT } },
    });
    return user;
  }
}
