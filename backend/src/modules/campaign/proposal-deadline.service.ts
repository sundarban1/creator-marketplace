import prisma from '../../prisma';
import { AppError } from '../../middleware/error';
import { HttpStatus } from '../../constants/httpStatus';
import { logger } from '../../config/logger';
import { notificationService } from '../notifications/notification.service';
import { notify, NotificationEvent } from '../notifications/notify';
import { logAudit } from '../logging/audit.service';
import { AuditAction, EntityType } from '../logging/logging.constants';
import { recordCampaignEvent } from './campaign-events';

// ───────────────────────────────────────────────────────────────────────────────
// Proposal (application) deadlines — kept separate from deliverable deadlines.
//
//  - A submitted proposal is an Application. Its status (PENDING / SHORTLISTED /
//    ACCEPTED / REJECTED / WITHDRAWN / EXPIRED) is never touched by the
//    application deadline: an on-time proposal the business hasn't reviewed
//    stays PENDING.
//  - A creator who was invited but never submitted has no Application — only a
//    CampaignInvitation. That invitation is what records the miss
//    (DEADLINE_MISSED) or an early close by the business (EXPIRED). No fake
//    proposal is ever created to represent it.
// ───────────────────────────────────────────────────────────────────────────────

const LOOKBACK_MS = 14 * 86_400_000;

/** Throws when the campaign's application deadline has passed. */
export function assertApplicationWindowOpen(campaign: { applicationDeadline: Date | null }, now = new Date()): void {
  if (campaign.applicationDeadline && campaign.applicationDeadline < now) {
    throw new AppError('The application deadline for this opportunity has passed — new proposals are no longer accepted.', HttpStatus.BAD_REQUEST);
  }
}

/** Invitations (still PENDING) whose creator never applied to the campaign. */
async function unansweredInvitationIds(campaignIds: string[]): Promise<{ id: string; campaignId: string; creatorUserId: string }[]> {
  if (campaignIds.length === 0) return [];
  const rows = await prisma.campaignInvitation.findMany({
    where: { campaignId: { in: campaignIds }, status: 'PENDING' },
    select: { id: true, campaignId: true, creatorId: true, creator: { select: { userId: true } } },
  });
  if (rows.length === 0) return [];
  const applied = await prisma.application.findMany({
    where: { campaignId: { in: campaignIds }, creatorId: { in: rows.map((r) => r.creatorId) } },
    select: { campaignId: true, creatorId: true },
  });
  const key = new Set(applied.map((a) => `${a.campaignId}:${a.creatorId}`));
  return rows
    .filter((r) => !key.has(`${r.campaignId}:${r.creatorId}`))
    .map((r) => ({ id: r.id, campaignId: r.campaignId, creatorUserId: r.creator.userId }));
}

/**
 * Sweep: application deadline passed → never-submitted invitations become
 * DEADLINE_MISSED; the business is told once per deadline how many proposals
 * are waiting for review. Idempotent (status-guarded updates + dedupe keys).
 */
export async function sweepApplicationDeadlines(now: Date): Promise<{ missed: number; campaigns: number }> {
  const campaigns = await prisma.campaign.findMany({
    where: {
      applicationDeadline: { lt: now, gt: new Date(now.getTime() - LOOKBACK_MS) },
      deletedAt: null,
      status: { in: ['ACTIVE', 'PAUSED', 'CLOSED', 'EXPIRED'] },
    },
    select: { id: true, title: true, applicationDeadline: true, campaignType: true, business: { select: { userId: true } } },
  });
  if (campaigns.length === 0) return { missed: 0, campaigns: 0 };

  const invites = await unansweredInvitationIds(campaigns.map((c) => c.id));
  let missed = 0;
  for (const inv of invites) {
    const { count } = await prisma.campaignInvitation.updateMany({
      where: { id: inv.id, status: 'PENDING' },
      data:  { status: 'DEADLINE_MISSED', closedAt: now, closedReason: 'No proposal was submitted before the application deadline' },
    });
    if (count === 0) continue;
    missed += 1;
    const c = campaigns.find((x) => x.id === inv.campaignId);
    notificationService.create({
      userId:  inv.creatorUserId,
      type:    'application_deadline_passed',
      title:   'Application deadline passed',
      body:    `The application deadline for "${c?.title ?? 'an opportunity you were invited to'}" has passed without a proposal from you.`,
      refId:   inv.campaignId,
      refType: c?.campaignType === 'OPEN_EVENT' ? 'event' : 'campaign',
    }).catch((err) => logger.warn({ err, invitationId: inv.id }, 'application deadline notification failed'));
  }

  for (const c of campaigns) {
    const pending = await prisma.application.count({ where: { campaignId: c.id, status: { in: ['PENDING', 'SHORTLISTED'] } } });
    await notify({
      userId:  c.business.userId,
      type:    NotificationEvent.APPLICATION_DEADLINE_PASSED,
      title:   'Applications closed',
      body:    pending > 0
        ? `Applications for "${c.title}" have closed. ${pending} proposal${pending === 1 ? ' is' : 's are'} waiting for your review.`
        : `Applications for "${c.title}" have closed.`,
      refId:   c.id,
      refType: c.campaignType === 'OPEN_EVENT' ? 'event' : 'campaign',
      campaignId: c.id,
      dedupeKey:  `campaign:${c.id}:application_deadline_passed:${c.applicationDeadline!.getTime()}`,
    });
  }
  return { missed, campaigns: campaigns.length };
}

/**
 * The business closed / cancelled the opportunity (or it ended) before invited
 * creators applied → their invitations EXPIRE. Not the creator's failure.
 */
export async function expireOpenInvitations(campaignIds: string[], reason: string): Promise<number> {
  const invites = await unansweredInvitationIds(campaignIds);
  if (invites.length === 0) return 0;
  const { count } = await prisma.campaignInvitation.updateMany({
    where: { id: { in: invites.map((i) => i.id) }, status: 'PENDING' },
    data:  { status: 'EXPIRED', closedAt: new Date(), closedReason: reason },
  });
  return count;
}

/** Admin override: reopen applications with a new deadline (recorded + audited). */
export async function reopenApplications(campaignId: string, adminUserId: string, input: { applicationDeadline: string | Date; reason: string }) {
  const reason = input.reason?.trim();
  if (!reason) throw new AppError('A reason is required to reopen applications.', HttpStatus.BAD_REQUEST);
  const deadline = new Date(input.applicationDeadline);
  if (Number.isNaN(deadline.getTime()) || deadline <= new Date()) {
    throw new AppError('The new application deadline must be in the future.', HttpStatus.BAD_REQUEST);
  }
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true, status: true, deadline: true, applicationDeadline: true } });
  if (!campaign) throw new AppError('Campaign not found', HttpStatus.NOT_FOUND);
  if (campaign.status !== 'ACTIVE') throw new AppError('Only an active opportunity can reopen applications.', HttpStatus.CONFLICT);
  if (deadline > campaign.deadline) throw new AppError('The application deadline must be before the opportunity ends.', HttpStatus.BAD_REQUEST);

  const [, restored] = await prisma.$transaction([
    prisma.campaign.update({ where: { id: campaignId }, data: { applicationDeadline: deadline } }),
    prisma.campaignInvitation.updateMany({
      where: { campaignId, status: 'DEADLINE_MISSED' },
      data:  { status: 'PENDING', closedAt: null, closedReason: null },
    }),
  ]);
  recordCampaignEvent({
    campaignId, axis: 'campaign', fromStatus: 'APPLICATIONS_CLOSED', toStatus: 'APPLICATIONS_REOPENED',
    actorId: adminUserId, actorType: 'ADMIN', reason,
    metadata: { previousDeadline: campaign.applicationDeadline?.toISOString() ?? null, newDeadline: deadline.toISOString(), invitationsRestored: restored.count },
  });
  logAudit({
    userId: adminUserId, actorType: 'ADMIN', action: AuditAction.APPLICATIONS_REOPENED,
    entityType: EntityType.CAMPAIGN, entityId: campaignId, campaignId,
    oldValue: { applicationDeadline: campaign.applicationDeadline?.toISOString() ?? null },
    newValue: { applicationDeadline: deadline.toISOString() },
    metadata: { reason, invitationsRestored: restored.count },
  });
  return { applicationDeadline: deadline.toISOString(), invitationsRestored: restored.count };
}
