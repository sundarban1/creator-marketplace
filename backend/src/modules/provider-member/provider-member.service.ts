import { InvitationStatus, ProviderMemberRole } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { ProviderMemberRepository } from './provider-member.repository';
import { CreatorRepository } from '../creator/creator.repository';
import { notificationService } from '../notifications/notification.service';
import type { InviteMemberInput, UpdateMemberInput, RespondToMemberInviteInput } from './provider-member.schema';
import { getDict } from '../../i18n';

import { HttpStatus } from '../../constants/httpStatus';

export class ProviderMemberService {
  private repo = new ProviderMemberRepository();
  private creatorRepo = new CreatorRepository();

  private async requireProfile(userId: string) {
    const profile = await this.creatorRepo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().providerMember.providerProfileNotFound, HttpStatus.NOT_FOUND);
    return profile;
  }

  // §7 — who may manage a roster. The provider account itself is the OWNER
  // (there is no ProviderMember row for it, which is also why nobody can remove
  // or demote the owner). An ACCEPTED member whose accessRole is ADMIN manages
  // the roster too; MANAGER and MEMBER never do.
  //
  // `providerId` is explicit rather than inferred because one person can be an
  // ADMIN of several agencies while also running their own team — inferring a
  // single "current team" from the caller would be ambiguous the moment that
  // happens. Omitted means "my own provider account", which is exactly what
  // every existing caller sends.
  private async resolveManagedProviderId(userId: string, providerId?: string): Promise<string> {
    const profile = await this.requireProfile(userId);

    if (!providerId || providerId === profile.id) {
      if (profile.providerType !== 'TEAM' && profile.providerType !== 'AGENCY') {
        throw new AppError(getDict().providerMember.onlyTeamOrAgencyCanHaveMembers, HttpStatus.BAD_REQUEST);
      }
      return profile.id;
    }

    const membership = await this.repo.findByProviderAndMember(providerId, profile.id);
    if (!membership || membership.status !== InvitationStatus.ACCEPTED) {
      throw new AppError(getDict().providerMember.notAuthorizedToManageTeam, HttpStatus.FORBIDDEN);
    }
    if (membership.accessRole !== ProviderMemberRole.ADMIN && membership.accessRole !== ProviderMemberRole.OWNER) {
      throw new AppError(getDict().providerMember.onlyAdminCanManageTeam, HttpStatus.FORBIDDEN);
    }
    return providerId;
  }

  async listMembers(userId: string, providerId?: string) {
    return this.repo.findByProviderId(await this.resolveManagedProviderId(userId, providerId));
  }

  // Invitations this provider has received from other teams/agencies. Available
  // to every provider type, since an INDIVIDUAL is exactly who a team invites.
  async listMyMemberships(userId: string) {
    const profile = await this.requireProfile(userId);
    return this.repo.findByMemberId(profile.id);
  }

  async invite(userId: string, input: InviteMemberInput) {
    const providerProfileId = await this.resolveManagedProviderId(userId, input.providerId);
    const provider = await this.creatorRepo.findById(providerProfileId);
    if (!provider) throw new AppError(getDict().providerMember.providerProfileNotFound, HttpStatus.NOT_FOUND);

    const user = await this.repo.findCreatorByEmailOrPhone({ email: input.email, phone: input.phone });
    if (!user || !user.creatorProfile) {
      throw new AppError(getDict().providerMember.noProviderAccountFound, HttpStatus.NOT_FOUND);
    }
    if (user.role !== 'CREATOR') {
      throw new AppError(getDict().providerMember.accountNotServiceProvider, HttpStatus.BAD_REQUEST);
    }
    if (user.creatorProfile.id === provider.id) {
      throw new AppError(getDict().providerMember.cannotInviteTeamItself, HttpStatus.BAD_REQUEST);
    }

    const accessRole = (input.accessRole ?? 'MEMBER') as ProviderMemberRole;
    const existing = await this.repo.findByProviderAndMember(provider.id, user.creatorProfile.id);
    if (existing) {
      if (existing.status === InvitationStatus.ACCEPTED) throw new AppError(getDict().providerMember.alreadyInYourTeam, HttpStatus.CONFLICT);
      if (existing.status === InvitationStatus.PENDING)  throw new AppError(getDict().providerMember.alreadyHasPendingInvitation, HttpStatus.CONFLICT);
      // DECLINED — let the provider ask again rather than blocking forever.
      const reinvited = await this.repo.reinvite(existing.id, { jobRole: input.jobRole, accessRole });
      this.notifyInvited(user.id, provider.fullName, reinvited.id);
      return reinvited;
    }

    const created = await this.repo.create({
      providerId: provider.id,
      memberId:   user.creatorProfile.id,
      jobRole:    input.jobRole,
      accessRole,
    });
    this.notifyInvited(user.id, provider.fullName, created.id);
    return created;
  }

  private notifyInvited(memberUserId: string, providerName: string | null, membershipId: string) {
    notificationService.create({
      userId: memberUserId,
      type:   'team_invitation',
      title:  `${providerName ?? 'A provider'} invited you to join their team`,
      body:   'Accept or decline the invitation from your invitations screen.',
      refId:  membershipId,
      refType: 'team_invitation',
    }).catch(() => {});
  }

  // The provider is taken from the membership row itself, then authorized —
  // an admin managing someone else's team never has to name it explicitly.
  private async requireManageable(userId: string, membershipId: string) {
    const membership = await this.repo.findById(membershipId);
    if (!membership) throw new AppError(getDict().providerMember.memberNotFound, HttpStatus.NOT_FOUND);
    await this.resolveManagedProviderId(userId, membership.providerId);

    // An admin editing their own row could promote themselves or quietly drop
    // out of the roster through the management endpoints. Neither is a
    // roster-management action; leaving a team would be its own feature.
    const profile = await this.requireProfile(userId);
    if (membership.memberId === profile.id) {
      throw new AppError(getDict().providerMember.cannotChangeOwnMembership, HttpStatus.FORBIDDEN);
    }
    return membership;
  }

  async updateMember(userId: string, membershipId: string, input: UpdateMemberInput) {
    await this.requireManageable(userId, membershipId);
    return this.repo.update(membershipId, {
      jobRole:    input.jobRole,
      accessRole: input.accessRole as ProviderMemberRole | undefined,
    });
  }

  async removeMember(userId: string, membershipId: string) {
    await this.requireManageable(userId, membershipId);
    await this.repo.delete(membershipId);
  }

  // ── §13/§16 — assigning members to a booking the team won ────────────────
  //
  // Ownership of the booking itself needs nothing new: a TEAM/AGENCY is a
  // CreatorProfile, so the Application, its review and its payout already
  // belong to the team account. These records only say who inside the team is
  // doing the work — no money is attached, keeping §15's "no automatic
  // splitting in V1" true by construction.

  private async requireAssignableApplication(userId: string, applicationId: string) {
    const application = await this.repo.findApplicationForAssignment(applicationId);
    if (!application) throw new AppError(getDict().providerMember.bookingNotFound, HttpStatus.NOT_FOUND);
    // Same authorization as the roster: the provider that won the work, or an
    // ACCEPTED ADMIN member of it.
    await this.resolveManagedProviderId(userId, application.creatorId);
    return application;
  }

  async listAssignments(userId: string, applicationId: string) {
    await this.requireAssignableApplication(userId, applicationId);
    return this.repo.findAssignments(applicationId);
  }

  async assignMember(userId: string, applicationId: string, memberId: string, note?: string) {
    const application = await this.requireAssignableApplication(userId, applicationId);

    // Staffing a job the team hasn't won yet would be meaningless, and would
    // let a rejected application accumulate assignments.
    if (application.status !== 'ACCEPTED') {
      throw new AppError(getDict().providerMember.onlyAcceptedBookingCanHaveMembersAssigned, HttpStatus.BAD_REQUEST);
    }

    const membership = await this.repo.findByProviderAndMember(application.creatorId, memberId);
    if (!membership || membership.status !== InvitationStatus.ACCEPTED) {
      throw new AppError(getDict().providerMember.providerNotActiveMember, HttpStatus.BAD_REQUEST);
    }

    const existing = await this.repo.findAssignments(applicationId);
    if (existing.some((a) => a.memberId === memberId)) {
      throw new AppError(getDict().providerMember.alreadyAssignedToBooking, HttpStatus.CONFLICT);
    }

    const created = await this.repo.createAssignment({ applicationId, memberId, note });

    notificationService.create({
      userId:  membership.member.userId,
      type:    'work_assigned',
      title:   'You were assigned to a booking',
      body:    application.campaign.title,
      refId:   application.id,
      refType: 'application',
    }).catch(() => {});

    return created;
  }

  async unassignMember(userId: string, assignmentId: string) {
    const assignment = await this.repo.findAssignmentById(assignmentId);
    if (!assignment) throw new AppError(getDict().providerMember.assignmentNotFound, HttpStatus.NOT_FOUND);
    await this.resolveManagedProviderId(userId, assignment.application.creatorId);
    await this.repo.deleteAssignment(assignmentId);
  }

  // Work assigned to this provider by a team they belong to (§16 "Assigned work").
  async listMyAssignments(userId: string) {
    const profile = await this.requireProfile(userId);
    return this.repo.findAssignmentsForMember(profile.id);
  }

  // §4 — "The invited person must accept the invitation before becoming an
  // active team member". Only the invitee can answer, and only once.
  async respond(userId: string, membershipId: string, input: RespondToMemberInviteInput) {
    const profile = await this.requireProfile(userId);
    const membership = await this.repo.findById(membershipId);
    if (!membership) throw new AppError(getDict().providerMember.invitationNotFound, HttpStatus.NOT_FOUND);
    if (membership.memberId !== profile.id) throw new AppError(getDict().providerMember.notAuthorizedToRespondToInvitation, HttpStatus.FORBIDDEN);
    if (membership.status !== InvitationStatus.PENDING) throw new AppError(getDict().providerMember.invitationAlreadyResponded, HttpStatus.CONFLICT);

    const updated = await this.repo.respond(membershipId, input.status as InvitationStatus);

    notificationService.create({
      userId:  membership.provider.userId,
      type:    'team_invitation_response',
      title:   input.status === 'ACCEPTED'
        ? `${profile.fullName ?? 'A provider'} joined your team`
        : `${profile.fullName ?? 'A provider'} declined your invitation`,
      body:    membership.jobRole ?? 'Team member',
      refId:   membership.id,
      refType: 'team_member',
    }).catch(() => {});

    return updated;
  }
}
