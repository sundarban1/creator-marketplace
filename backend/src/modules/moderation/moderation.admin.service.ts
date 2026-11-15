// Admin side of UGC moderation: the report queue, investigation detail,
// assignment, verification decisions, enforcement actions and resolution.
//
// Invariants (see moderation.rules.ts):
//   - every report starts NEW and is only closed by an admin decision;
//   - enforcement needs verification VALID, dismissal needs INVALID;
//   - RESOLVED needs ACTION_TAKEN|DISMISSED first;
//   - every step writes an immutable AuditLog row (entityType Report), and
//     every enforcement also a ModerationAction row;
//   - mutations lock the report row (SELECT … FOR UPDATE) and refuse when it
//     is assigned to a different moderator, so two admins can't act at once.
import { Prisma, type ModerationActionType, type ReportPriority, type ReportReason, type ReportStatus, type ReportTargetType, type ReportVerification } from '@prisma/client';
import prisma from '../../prisma';
import { AppError } from '../../middleware/error';
import { HttpStatus } from '../../constants/httpStatus';
import { logger } from '../../config/logger';
import { logAudit } from '../logging/audit.service';
import { AuditAction, EntityType } from '../logging/logging.constants';
import { notificationService } from '../notifications/notification.service';
import { AuthRepository } from '../auth/auth.repository';
import { emitToUser } from '../../socket';
import { sendModerationNoticeEmail } from '../../utils/email/moderation';
import { invalidatePrefix } from '../../utils/cache';
import { resolveReportTarget, MODERATION_ACTOR } from './report.targets';
import { ADMIN_NOTIFICATION_TYPE } from './block.service';
import {
  OPEN_STATUSES, MAX_TEMP_SUSPENSION_DAYS, isContentRemovable,
  canDismiss, canRequestMoreInfo, canResolve, canStartReview, canTakeAction, canVerify, type RuleResult,
} from './moderation.rules';

type Tx = Prisma.TransactionClient;
type LockedReport = {
  id: string; status: ReportStatus; verification: ReportVerification; assignedToId: string | null;
  reportedUserId: string | null; targetType: ReportTargetType; targetId: string; reporterId: string; reviewStartedAt: Date | null;
};

const USER_SUMMARY = {
  id: true, email: true, role: true, isActive: true, suspendedAt: true, suspendedUntil: true, suspensionReason: true,
  messagingRestrictedUntil: true, createdAt: true,
  creatorProfile: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
  businessProfile: { select: { id: true, businessName: true, logoUrl: true, isActive: true } },
} satisfies Prisma.UserSelect;

function nameOf(u: { email: string; creatorProfile: { fullName: string | null; username: string | null } | null; businessProfile: { businessName: string | null } | null } | null) {
  if (!u) return null;
  return u.creatorProfile?.fullName ?? u.creatorProfile?.username ?? u.businessProfile?.businessName ?? u.email;
}

function assertRule(r: RuleResult) {
  if (!r.ok) throw new AppError(r.error, HttpStatus.CONFLICT, true, { code: 'MODERATION_RULE' });
}

function audit(adminId: string, reportId: string | null, action: (typeof AuditAction)[keyof typeof AuditAction], oldValue?: Record<string, unknown>, newValue?: Record<string, unknown>, metadata?: Record<string, unknown>) {
  logAudit({
    userId: adminId, actorType: 'ADMIN', performedBy: adminId, action,
    entityType: reportId ? EntityType.REPORT : EntityType.USER, entityId: reportId ?? (metadata?.targetUserId as string | undefined),
    oldValue, newValue, metadata,
  });
}

async function lockReport(tx: Tx, id: string, adminId: string, opts: { allowOtherAssignee?: boolean } = {}): Promise<LockedReport> {
  await tx.$queryRaw`SELECT id FROM reports WHERE id = ${id} FOR UPDATE`;
  const r = await tx.report.findUnique({
    where: { id },
    select: { id: true, status: true, verification: true, assignedToId: true, reportedUserId: true, targetType: true, targetId: true, reporterId: true, reviewStartedAt: true },
  });
  if (!r) throw new AppError('Report not found', HttpStatus.NOT_FOUND);
  if (!opts.allowOtherAssignee && r.assignedToId && r.assignedToId !== adminId) {
    throw new AppError('This report is assigned to another moderator. Reassign it to yourself first.', HttpStatus.CONFLICT, true, { code: 'REPORT_ASSIGNED_ELSEWHERE' });
  }
  return r;
}

export interface ReportListQuery {
  view?: 'open' | 'closed' | 'all';
  status?: ReportStatus;
  reason?: ReportReason;
  targetType?: ReportTargetType;
  priority?: ReportPriority;
  assigned?: string; // 'me' | 'unassigned' | adminId
  reportedUserId?: string;
  reporterId?: string;
  q?: string;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

export interface ActionInput {
  action: ModerationActionType;
  reason: string;
  notes?: string;
  durationDays?: number;
  // REMOVE_CONTENT before verification = temporary hide pending investigation.
  interim?: boolean;
  confirm?: boolean;
}

export const moderationAdminService = {
  // ── Overview ──────────────────────────────────────────────────────────────
  async stats() {
    const [byStatus, urgentOpen, unassignedOpen, blockEvents, unreviewedBlocks, heldContent] = await Promise.all([
      prisma.report.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.report.count({ where: { status: { in: OPEN_STATUSES }, priority: 'URGENT' } }),
      prisma.report.count({ where: { status: { in: OPEN_STATUSES }, assignedToId: null } }),
      prisma.moderationEvent.count({ where: { type: 'USER_BLOCKED' } }),
      prisma.moderationEvent.count({ where: { type: 'USER_BLOCKED', reviewedAt: null } }),
      prisma.moderationEvent.count({ where: { type: { in: ['CONTENT_HELD_FOR_REVIEW', 'CONTENT_AUTO_REJECTED', 'MODERATION_SERVICE_ERROR'] }, reviewedAt: null } }),
    ]);
    const counts = Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])) as Partial<Record<ReportStatus, number>>;
    const total = byStatus.reduce((n, r) => n + r._count._all, 0);
    return {
      total,
      pending: counts.NEW ?? 0,
      underReview: counts.UNDER_REVIEW ?? 0,
      needsMoreInfo: counts.NEEDS_MORE_INFO ?? 0,
      actionTaken: counts.ACTION_TAKEN ?? 0,
      dismissed: counts.DISMISSED ?? 0,
      resolved: counts.RESOLVED ?? 0,
      urgentOpen,
      unassignedOpen,
      blockEvents,
      unreviewedBlocks,
      unreviewedContentSignals: heldContent,
    };
  },

  async listReports(q: ReportListQuery, adminId: string) {
    const where: Prisma.ReportWhereInput = {};
    if (q.status) where.status = q.status;
    else if (q.view === 'open' || !q.view) where.status = { in: OPEN_STATUSES };
    else if (q.view === 'closed') where.status = { notIn: OPEN_STATUSES };
    if (q.reason) where.reason = q.reason;
    if (q.targetType) where.targetType = q.targetType;
    if (q.priority) where.priority = q.priority;
    if (q.assigned === 'me') where.assignedToId = adminId;
    else if (q.assigned === 'unassigned') where.assignedToId = null;
    else if (q.assigned) where.assignedToId = q.assigned;
    if (q.reportedUserId) where.reportedUserId = q.reportedUserId;
    if (q.reporterId) where.reporterId = q.reporterId;
    if (q.from || q.to) where.createdAt = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };
    if (q.q) {
      const term = q.q.trim();
      const people: Prisma.UserWhereInput = {
        OR: [
          { email: { contains: term, mode: 'insensitive' } },
          { creatorProfile: { OR: [{ fullName: { contains: term, mode: 'insensitive' } }, { username: { contains: term, mode: 'insensitive' } }] } },
          { businessProfile: { businessName: { contains: term, mode: 'insensitive' } } },
        ],
      };
      where.OR = [
        { id: term }, { targetId: term }, { reportedUserId: term }, { reporterId: term }, { messageId: term },
        { reportedUser: people },
      ];
    }

    // Enum order in Postgres = declaration order, so status asc puts NEW
    // (pending) first and priority desc puts URGENT first.
    const [items, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        select: {
          id: true, targetType: true, targetId: true, reason: true, status: true, verification: true, priority: true,
          description: true, evidence: true, createdAt: true, assignedAt: true,
          reporter: { select: { id: true, email: true, creatorProfile: { select: { fullName: true, username: true } }, businessProfile: { select: { businessName: true } } } },
          reportedUser: { select: { id: true, email: true, creatorProfile: { select: { fullName: true, username: true } }, businessProfile: { select: { businessName: true } } } },
          assignedTo: { select: { id: true, email: true } },
        },
      }),
      prisma.report.count({ where }),
    ]);
    return {
      items: items.map((r) => {
        const ev = (r.evidence ?? {}) as Record<string, unknown>;
        const preview = (ev.content ?? ev.title ?? ev.caption ?? ev.description ?? ev.name ?? null) as string | null;
        return {
          id: r.id, targetType: r.targetType, targetId: r.targetId, reason: r.reason, status: r.status,
          verification: r.verification, priority: r.priority, createdAt: r.createdAt, assignedAt: r.assignedAt,
          contentTitle: (ev.title as string | undefined) ?? null,
          contentPreview: typeof preview === 'string' ? preview.slice(0, 160) : null,
          reporter: r.reporter ? { id: r.reporter.id, email: r.reporter.email, name: nameOf(r.reporter) } : null,
          reportedUser: r.reportedUser ? { id: r.reportedUser.id, email: r.reportedUser.email, name: nameOf(r.reportedUser) } : null,
          assignedTo: r.assignedTo,
        };
      }),
      pagination: { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) },
    };
  },

  async getReport(id: string, adminId: string) {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        reporter: { select: USER_SUMMARY },
        reportedUser: { select: USER_SUMMARY },
        assignedTo: { select: { id: true, email: true } },
        actions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!report) throw new AppError('Report not found', HttpStatus.NOT_FOUND);

    const [live, related, userHistory, blocksAgainst, auditTrail] = await Promise.all([
      resolveReportTarget(report.targetType, report.targetId).catch(() => null),
      prisma.report.findMany({
        where: {
          id: { not: id },
          OR: [{ targetType: report.targetType, targetId: report.targetId }, ...(report.reportedUserId ? [{ reportedUserId: report.reportedUserId }] : [])],
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, reason: true, status: true, verification: true, priority: true, targetType: true, targetId: true, createdAt: true },
      }),
      report.reportedUserId
        ? prisma.moderationAction.findMany({ where: { targetUserId: report.reportedUserId }, orderBy: { createdAt: 'desc' }, take: 30 })
        : Promise.resolve([]),
      report.reportedUserId ? prisma.moderationEvent.count({ where: { type: 'USER_BLOCKED', targetUserId: report.reportedUserId } }) : Promise.resolve(0),
      prisma.auditLog.findMany({
        where: { entityType: EntityType.REPORT, entityId: id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { id: true, action: true, userId: true, oldValue: true, newValue: true, metadata: true, createdAt: true },
      }),
    ]);

    audit(adminId, id, AuditAction.REPORT_OPENED);

    const summarize = (u: typeof report.reporter | null) => u && {
      id: u.id, email: u.email, role: u.role, name: nameOf(u), isActive: u.isActive, suspendedAt: u.suspendedAt,
      suspendedUntil: u.suspendedUntil, suspensionReason: u.suspensionReason, messagingRestrictedUntil: u.messagingRestrictedUntil,
      createdAt: u.createdAt, avatarUrl: u.creatorProfile?.avatarUrl ?? u.businessProfile?.logoUrl ?? null,
      creatorProfileId: u.creatorProfile?.id ?? null, businessProfileId: u.businessProfile?.id ?? null,
    };

    return {
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      conversationId: report.conversationId,
      messageId: report.messageId,
      reason: report.reason,
      description: report.description,
      status: report.status,
      verification: report.verification,
      priority: report.priority,
      evidence: report.evidence,
      actionNote: report.actionNote,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      assignedTo: report.assignedTo,
      assignedAt: report.assignedAt,
      reviewStartedAt: report.reviewStartedAt,
      reviewedAt: report.reviewedAt,
      reviewedBy: report.reviewedBy,
      resolvedAt: report.resolvedAt,
      reporter: summarize(report.reporter),
      reportedUser: summarize(report.reportedUser),
      liveContent: live ? { title: live.title, snapshot: live.snapshot, hidden: live.hidden, exists: true } : { exists: false },
      contentRemovable: isContentRemovable(report.targetType),
      actions: report.actions,
      related,
      userHistory,
      blocksAgainstUser: blocksAgainst,
      auditTrail,
    };
  },

  // ── Workflow ──────────────────────────────────────────────────────────────
  async assign(id: string, adminId: string, assigneeId: string | null) {
    if (assigneeId) {
      const a = await prisma.user.findUnique({ where: { id: assigneeId }, select: { role: true } });
      if (a?.role !== 'ADMIN') throw new AppError('Reports can only be assigned to an admin', HttpStatus.BAD_REQUEST);
    }
    const prev = await prisma.$transaction(async (tx) => {
      const r = await lockReport(tx, id, adminId, { allowOtherAssignee: true });
      await tx.report.update({ where: { id }, data: { assignedToId: assigneeId, assignedAt: assigneeId ? new Date() : null } });
      return r;
    });
    audit(adminId, id, AuditAction.REPORT_ASSIGNED, { assignedToId: prev.assignedToId }, { assignedToId: assigneeId });
    if (assigneeId && assigneeId !== adminId) {
      void notificationService.create({
        userId: assigneeId, type: ADMIN_NOTIFICATION_TYPE.ASSIGNED, title: 'Report assigned to you',
        body: 'A moderation report was assigned to you for review.', refId: id, refType: 'report',
      }).catch(() => {});
    }
    return this.getReport(id, adminId);
  },

  async startReview(id: string, adminId: string) {
    const prev = await prisma.$transaction(async (tx) => {
      const r = await lockReport(tx, id, adminId);
      assertRule(canStartReview(r.status));
      const now = new Date();
      await tx.report.update({
        where: { id },
        data: { status: 'UNDER_REVIEW', reviewStartedAt: r.reviewStartedAt ?? now, assignedToId: r.assignedToId ?? adminId, assignedAt: r.assignedToId ? undefined : now },
      });
      return r;
    });
    audit(adminId, id, AuditAction.REPORT_STATUS_CHANGED, { status: prev.status }, { status: 'UNDER_REVIEW' });
    return this.getReport(id, adminId);
  },

  async verify(id: string, adminId: string, decision: ReportVerification, note: string) {
    if (decision === 'UNVERIFIED') throw new AppError('Choose VALID, INVALID or NEEDS_MORE_INFORMATION', HttpStatus.BAD_REQUEST);
    const prev = await prisma.$transaction(async (tx) => {
      const r = await lockReport(tx, id, adminId);
      assertRule(canVerify(r.status));
      if (decision === 'NEEDS_MORE_INFORMATION') assertRule(canRequestMoreInfo(r.status === 'NEEDS_MORE_INFO' ? 'UNDER_REVIEW' : r.status));
      const now = new Date();
      await tx.report.update({
        where: { id },
        data: {
          verification: decision,
          status: decision === 'NEEDS_MORE_INFORMATION' ? 'NEEDS_MORE_INFO' : 'UNDER_REVIEW',
          reviewedBy: adminId, reviewedAt: now, actionNote: note,
          reviewStartedAt: r.reviewStartedAt ?? now,
          assignedToId: r.assignedToId ?? adminId,
        },
      });
      return r;
    });
    audit(adminId, id, AuditAction.REPORT_VERIFIED, { verification: prev.verification, status: prev.status }, { verification: decision }, { note });
    return this.getReport(id, adminId);
  },

  async dismiss(id: string, adminId: string, note: string) {
    const prev = await prisma.$transaction(async (tx) => {
      const r = await lockReport(tx, id, adminId);
      assertRule(canDismiss(r.status, r.verification));
      await tx.report.update({ where: { id }, data: { status: 'DISMISSED', actionNote: note } });
      await tx.moderationAction.create({ data: { reportId: id, targetUserId: r.reportedUserId, adminId, action: 'NO_ACTION', reason: 'Report dismissed — no violation found', notes: note } });
      return r;
    });
    audit(adminId, id, AuditAction.REPORT_STATUS_CHANGED, { status: prev.status }, { status: 'DISMISSED' }, { note });
    return this.getReport(id, adminId);
  },

  async resolve(id: string, adminId: string, note: string | undefined, notifyReporter: boolean) {
    const prev = await prisma.$transaction(async (tx) => {
      const r = await lockReport(tx, id, adminId);
      assertRule(canResolve(r.status, r.verification));
      await tx.report.update({ where: { id }, data: { status: 'RESOLVED', resolvedAt: new Date(), resolvedById: adminId, ...(note ? { actionNote: note } : {}) } });
      return r;
    });
    audit(adminId, id, AuditAction.REPORT_RESOLVED, { status: prev.status }, { status: 'RESOLVED' }, { note });

    if (notifyReporter) {
      // Generic outcome only — never who, what action, or internal notes.
      const actioned = prev.status === 'ACTION_TAKEN';
      void notificationService.create({
        userId: prev.reporterId,
        type: 'report_update',
        title: 'Update on your report',
        body: actioned
          ? 'Thank you for helping keep Kolab safe. We reviewed your report and took appropriate action.'
          : 'We reviewed your report and did not identify a violation of our Community Guidelines.',
      }).catch(() => {});
    }
    return this.getReport(id, adminId);
  },

  // ── Enforcement ───────────────────────────────────────────────────────────
  async takeAction(id: string, adminId: string, input: ActionInput) {
    const reason = input.reason?.trim();
    if (!reason) throw new AppError('A reason is required', HttpStatus.BAD_REQUEST);
    const undo = input.action === 'RESTORE_CONTENT' || input.action === 'LIFT_RESTRICTIONS';
    const interimHide = input.action === 'REMOVE_CONTENT' && !!input.interim;
    if ((input.action === 'SUSPEND_PERMANENT' || input.action === 'SUSPEND_TEMPORARY') && !input.confirm) {
      throw new AppError('Confirm the suspension to continue', HttpStatus.BAD_REQUEST, true, { code: 'CONFIRMATION_REQUIRED' });
    }
    if (input.action === 'SUSPEND_PERMANENT' && !input.notes?.trim()) {
      throw new AppError('Internal notes are required for a permanent suspension', HttpStatus.BAD_REQUEST);
    }
    if (input.action === 'SUSPEND_TEMPORARY' || input.action === 'RESTRICT_MESSAGING') {
      if (!input.durationDays || input.durationDays < 1 || input.durationDays > MAX_TEMP_SUSPENSION_DAYS) {
        throw new AppError(`Duration must be between 1 and ${MAX_TEMP_SUSPENSION_DAYS} days`, HttpStatus.BAD_REQUEST);
      }
    }

    const outcome = await prisma.$transaction(async (tx) => {
      const r = await lockReport(tx, id, adminId);
      if (!undo && !interimHide) assertRule(canTakeAction(r.status, r.verification));
      // An interim hide is only for an investigation still in progress; undo
      // actions (restore / lift) stay available even after resolution.
      if (interimHide && !OPEN_STATUSES.includes(r.status)) assertRule({ ok: false, error: 'Interim hiding is only available while a report is open' });

      const applied = await applyEnforcement(tx, adminId, r, input, reason);
      await tx.moderationAction.create({
        data: {
          reportId: id, targetUserId: applied.targetUserId, adminId, action: input.action,
          contentType: applied.contentType, contentId: applied.contentId, reason, notes: input.notes ?? null,
          durationDays: input.durationDays ?? null, expiresAt: applied.expiresAt ?? null,
          metadata: { ...(applied.metadata ?? {}), interim: interimHide || undefined } as Prisma.InputJsonValue,
        },
      });
      // A real enforcement (not an interim hide or an undo) closes the
      // investigation into ACTION_TAKEN — resolution is still a separate step.
      if (!undo && !interimHide && r.status !== 'ACTION_TAKEN') {
        await tx.report.update({ where: { id }, data: { status: 'ACTION_TAKEN' } });
      }
      return { prev: r, applied };
    });

    audit(adminId, id, AuditAction.MODERATION_ACTION, { status: outcome.prev.status }, { action: input.action, interim: interimHide }, {
      targetUserId: outcome.applied.targetUserId, contentType: outcome.applied.contentType, contentId: outcome.applied.contentId, reason, durationDays: input.durationDays,
    });
    await afterEnforcement(input, outcome.applied, reason);
    return this.getReport(id, adminId);
  },

  // ── Safety signals (blocks, auto-rejections, service errors) ─────────────
  async listEvents(q: { type?: string; reviewed?: 'yes' | 'no'; targetUserId?: string; page: number; limit: number }) {
    const where: Prisma.ModerationEventWhereInput = {
      ...(q.type ? { type: q.type as never } : { type: { not: 'USER_UNBLOCKED' } }),
      ...(q.reviewed === 'yes' ? { reviewedAt: { not: null } } : q.reviewed === 'no' ? { reviewedAt: null } : {}),
      ...(q.targetUserId ? { targetUserId: q.targetUserId } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.moderationEvent.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
      prisma.moderationEvent.count({ where }),
    ]);
    const ids = [...new Set(rows.flatMap((r) => [r.actorUserId, r.targetUserId]).filter(Boolean) as string[])];
    const [users, blockCounts, stillBlocked] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, role: true, creatorProfile: { select: { fullName: true, username: true } }, businessProfile: { select: { businessName: true } } } }),
      prisma.moderationEvent.groupBy({ by: ['targetUserId'], where: { type: 'USER_BLOCKED', targetUserId: { in: ids } }, _count: { _all: true } }),
      prisma.block.findMany({ where: { OR: rows.filter((r) => r.type === 'USER_BLOCKED' && r.actorUserId && r.targetUserId).map((r) => ({ blockerId: r.actorUserId!, blockedId: r.targetUserId! })) }, select: { blockerId: true, blockedId: true } }),
    ]);
    const byId = new Map(users.map((u) => [u.id, { id: u.id, email: u.email, role: u.role, name: nameOf(u) }]));
    const blocksById = new Map(blockCounts.map((b) => [b.targetUserId, b._count._all]));
    const active = new Set(stillBlocked.map((b) => `${b.blockerId}:${b.blockedId}`));
    return {
      items: rows.map((r) => ({
        ...r,
        actor: r.actorUserId ? byId.get(r.actorUserId) ?? null : null,
        target: r.targetUserId ? byId.get(r.targetUserId) ?? null : null,
        timesBlocked: r.targetUserId ? blocksById.get(r.targetUserId) ?? 0 : 0,
        blockActive: r.type === 'USER_BLOCKED' ? active.has(`${r.actorUserId}:${r.targetUserId}`) : undefined,
      })),
      pagination: { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) },
    };
  },

  async reviewEvent(eventId: string, adminId: string, note?: string) {
    const ev = await prisma.moderationEvent.findUnique({ where: { id: eventId } });
    if (!ev) throw new AppError('Event not found', HttpStatus.NOT_FOUND);
    if (ev.reviewedAt) return ev;
    const updated = await prisma.moderationEvent.update({ where: { id: eventId }, data: { reviewedAt: new Date(), reviewedById: adminId } });
    logAudit({ userId: adminId, actorType: 'ADMIN', performedBy: adminId, action: AuditAction.MODERATION_EVENT_REVIEWED, entityType: EntityType.USER, entityId: ev.targetUserId ?? undefined, metadata: { eventId, type: ev.type, note } });
    return updated;
  },

  async userHistory(userId: string) {
    const [user, actions, reportsAgainst, blocks] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: USER_SUMMARY }),
      prisma.moderationAction.findMany({ where: { targetUserId: userId }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.report.findMany({ where: { reportedUserId: userId }, orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, reason: true, status: true, verification: true, priority: true, targetType: true, createdAt: true } }),
      prisma.moderationEvent.count({ where: { type: 'USER_BLOCKED', targetUserId: userId } }),
    ]);
    if (!user) throw new AppError('User not found', HttpStatus.NOT_FOUND);
    return { user: { ...user, name: nameOf(user) }, actions, reportsAgainst, timesBlocked: blocks };
  },

  async moderators() {
    return prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true, email: true }, orderBy: { email: 'asc' } });
  },
};

// ── Enforcement implementation ──────────────────────────────────────────────

interface Applied {
  targetUserId: string | null;
  contentType: string | null;
  contentId: string | null;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
  // What the account owner is told (null = no notice).
  notice?: { title: string; body: string } | null;
  revokeSessions?: boolean;
}

async function applyEnforcement(tx: Tx, adminId: string, r: LockedReport, input: ActionInput, reason: string): Promise<Applied> {
  const now = new Date();
  const userId = r.reportedUserId;
  const content = { contentType: r.targetType as string, contentId: r.targetId };
  const needUser = () => {
    if (!userId) throw new AppError('This report has no identifiable account owner', HttpStatus.BAD_REQUEST);
    return userId;
  };
  const days = input.durationDays ?? 0;
  const until = new Date(now.getTime() + days * 86_400_000);

  switch (input.action) {
    case 'REMOVE_CONTENT':
    case 'RESTORE_CONTENT': {
      if (!isContentRemovable(r.targetType)) throw new AppError('This report type has no removable content — use an account action instead', HttpStatus.BAD_REQUEST);
      const remove = input.action === 'REMOVE_CONTENT';
      const metadata = await setContentHidden(tx, r.targetType, r.targetId, remove, reason);
      return {
        targetUserId: userId, ...content, metadata,
        notice: remove
          ? { title: input.interim ? 'Your content is under review' : 'Your content was removed', body: input.interim
              ? 'Some of your content has been temporarily hidden while our moderation team reviews a report.'
              : 'Some of your content was removed because it does not follow the Kolab Community Guidelines.' }
          : { title: 'Your content was restored', body: 'After review, your content has been restored and is visible again.' },
      };
    }
    case 'WARN_USER':
      needUser();
      return { targetUserId: userId, ...content, notice: { title: 'Official warning from Kolab', body: 'Our moderation team reviewed a report about your activity and found it does not follow the Kolab Community Guidelines. Further violations may lead to restrictions or suspension.' } };
    case 'RESTRICT_MESSAGING': {
      const uid = needUser();
      await tx.user.update({ where: { id: uid }, data: { messagingRestrictedUntil: until } });
      return { targetUserId: uid, ...content, expiresAt: until, notice: { title: 'Messaging restricted', body: `You can’t send messages on Kolab until ${until.toDateString()} because of a Community Guidelines violation.` } };
    }
    case 'SUSPEND_TEMPORARY':
    case 'SUSPEND_PERMANENT': {
      const uid = needUser();
      const target = await tx.user.findUnique({ where: { id: uid }, select: { role: true } });
      if (target?.role === 'ADMIN') throw new AppError('Admin accounts can’t be suspended from moderation', HttpStatus.BAD_REQUEST);
      const temp = input.action === 'SUSPEND_TEMPORARY';
      await tx.user.update({ where: { id: uid }, data: { isActive: false, suspendedAt: now, suspendedUntil: temp ? until : null, suspensionReason: reason } });
      return {
        targetUserId: uid, ...content, expiresAt: temp ? until : undefined, revokeSessions: true,
        notice: { title: temp ? 'Your account is temporarily suspended' : 'Your account has been suspended', body: temp
          ? `Your Kolab account is suspended until ${until.toDateString()} for violating the Community Guidelines.`
          : 'Your Kolab account has been suspended for violating the Community Guidelines.' },
      };
    }
    case 'LIFT_RESTRICTIONS': {
      const uid = needUser();
      await tx.user.update({ where: { id: uid }, data: { messagingRestrictedUntil: null, isActive: true, suspendedAt: null, suspendedUntil: null, suspensionReason: null } });
      return { targetUserId: uid, ...content, notice: { title: 'Restrictions lifted', body: 'The restrictions on your Kolab account have been lifted.' } };
    }
    case 'NO_ACTION':
    default:
      return { targetUserId: userId, ...content, notice: null };
  }
}

// Hide/restore the reported content itself. Returns what was changed so the
// ModerationAction row documents it.
async function setContentHidden(tx: Tx, type: ReportTargetType, id: string, hide: boolean, reason: string): Promise<Record<string, unknown>> {
  const now = new Date();
  switch (type) {
    case 'OPPORTUNITY':
      await tx.campaign.update({ where: { id }, data: { moderationHiddenAt: hide ? now : null } });
      return { campaignId: id };
    case 'COMPETITION': {
      const c = await tx.competition.findUnique({ where: { id }, select: { suspendedAt: true, moderationFlag: true } });
      if (!c) throw new AppError('Competition not found', HttpStatus.NOT_FOUND);
      await tx.competition.update({
        where: { id },
        data: hide
          ? { suspendedAt: c.suspendedAt ?? now, suspensionReason: reason, moderationFlag: 'UNDER_INVESTIGATION' }
          : { suspendedAt: null, suspensionReason: null, moderationFlag: 'CLEARED' },
      });
      return { competitionId: id, previousFlag: c.moderationFlag };
    }
    case 'COMPETITION_SUBMISSION':
      await tx.competitionSubmission.update({ where: { id }, data: { moderationHiddenAt: hide ? now : null } });
      return { submissionId: id };
    case 'PORTFOLIO_ITEM':
      await tx.portfolioItem.update({ where: { id }, data: { moderationHiddenAt: hide ? now : null } });
      return { portfolioItemId: id };
    case 'DELIVERABLE': {
      // Masks the submitted files/videos/links on every app read; the stored
      // arrays (and the report's evidence snapshot) stay intact. Work, escrow
      // and payment state are deliberately untouched.
      const a = await tx.application.findUnique({ where: { id }, select: { deliverableHiddenAt: true, campaignId: true } });
      if (!a) throw new AppError('Deliverable not found', HttpStatus.NOT_FOUND);
      await tx.application.update({ where: { id }, data: { deliverableHiddenAt: hide ? now : null } });
      return { applicationId: id, campaignId: a.campaignId, previouslyHidden: !!a.deliverableHiddenAt };
    }
    case 'SERVICE': {
      const s = await tx.service.findUnique({ where: { id }, select: { status: true } });
      if (!s) throw new AppError('Service not found', HttpStatus.NOT_FOUND);
      await tx.service.update({ where: { id }, data: { status: hide ? 'REMOVED' : 'ACTIVE' } });
      return { serviceId: id, previousStatus: s.status };
    }
    case 'BUSINESS': {
      const b = await tx.businessProfile.findFirst({ where: { OR: [{ id }, { userId: id }] }, select: { id: true, isActive: true } });
      if (!b) throw new AppError('Business not found', HttpStatus.NOT_FOUND);
      await tx.businessProfile.update({ where: { id: b.id }, data: { isActive: !hide } });
      return { businessProfileId: b.id, previousActive: b.isActive };
    }
    case 'MESSAGE': {
      const m = await tx.message.findUnique({ where: { id }, select: { deletedAt: true, deletedBy: true, conversationId: true } });
      if (!m) throw new AppError('Message not found', HttpStatus.NOT_FOUND);
      if (!hide && m.deletedBy !== MODERATION_ACTOR) throw new AppError('Only a message removed by moderation can be restored', HttpStatus.BAD_REQUEST);
      await tx.message.update({ where: { id }, data: hide ? { deletedAt: now, deletedBy: MODERATION_ACTOR } : { deletedAt: null, deletedBy: null } });
      return { messageId: id, conversationId: m.conversationId };
    }
    default:
      throw new AppError('This content type can’t be removed', HttpStatus.BAD_REQUEST);
  }
}

async function afterEnforcement(input: ActionInput, applied: Applied, reason: string) {
  try {
    if (applied.revokeSessions && applied.targetUserId) {
      await new AuthRepository().deleteAllSessions(applied.targetUserId);
      emitToUser(applied.targetUserId, 'session:revoked', { reason: 'suspended' });
    }
    if (applied.contentType === 'MESSAGE' && applied.metadata?.conversationId && input.action === 'REMOVE_CONTENT') {
      // Live chat screens drop the bubble immediately, same event as a sender delete.
      const conv = await prisma.conversation.findUnique({
        where: { id: applied.metadata.conversationId as string },
        select: { creator: { select: { userId: true } }, creator2: { select: { userId: true } }, business: { select: { userId: true } } },
      });
      for (const uid of [conv?.creator?.userId, conv?.creator2?.userId, conv?.business?.userId]) {
        if (uid) emitToUser(uid, 'message:deleted', { conversationId: applied.metadata.conversationId, messageId: applied.contentId });
      }
    }
    if (applied.contentType && applied.contentType !== 'MESSAGE' && applied.targetUserId) {
      // Only the owner's cached public profile (which embeds portfolio /
      // services / business status) is affected — campaign and competition
      // lists aren't cached, so they reflect the change on the next read.
      const owner = await prisma.user.findUnique({ where: { id: applied.targetUserId }, select: { creatorProfile: { select: { id: true } }, businessProfile: { select: { id: true } } } });
      await Promise.all([
        owner?.creatorProfile ? invalidatePrefix(`creator-profile:${owner.creatorProfile.id}:`) : null,
        owner?.businessProfile ? invalidatePrefix(`business-profile:${owner.businessProfile.id}:`) : null,
      ]).catch(() => {});
    }
    if (applied.notice && applied.targetUserId) {
      const { title, body } = applied.notice;
      await notificationService.create({ userId: applied.targetUserId, type: 'moderation_notice', title, body: `${body} Reason: ${reason}. To appeal, email info@kolab.com.np.` });
      const user = await prisma.user.findUnique({ where: { id: applied.targetUserId }, select: { email: true, emailIsPlaceholder: true } });
      if (user && !user.emailIsPlaceholder) void sendModerationNoticeEmail(user.email, { title, body, reason }).catch(() => {});
    }
  } catch (err) {
    // The enforcement itself is committed; follow-ups are best-effort.
    logger.error({ err, action: input.action }, 'Moderation follow-up failed');
  }
}
