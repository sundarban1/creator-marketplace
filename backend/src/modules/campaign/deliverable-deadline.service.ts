import { Prisma, WorkStatus } from '@prisma/client';
import prisma from '../../prisma';
import { AppError } from '../../middleware/error';
import { HttpStatus } from '../../constants/httpStatus';
import { logger } from '../../config/logger';
import { notificationService } from '../notifications/notification.service';
import { logActivity } from '../logging/activity.service';
import { logAudit } from '../logging/audit.service';
import { ActivityAction, AuditAction, EntityType } from '../logging/logging.constants';
import { escrowService, lockApplication } from './escrow.service';
import { getEscrowTimings, deadlineFromNow } from './escrow-config';
import { recordCampaignEventTx } from './campaign-events';
import { recordRefundEventTx, REFUND_REASON, refundIdempotencyKey, type RefundReasonCode } from '../refund/refund.core';

// ───────────────────────────────────────────────────────────────────────────────
// Deliverable deadlines & extensions.
//
// The deliverable lives on Application.workStatus (separate from the proposal's
// Application.status and the money's escrowStatus):
//
//   IN_PROGRESS ──deadline passes──▶ CONTENT_OVERDUE ("Overdue")
//        ▲                              │  decision window (escrow.extensionDecisionHours)
//        │ extension approved            │  creator may request ONE extension
//        └──────────────────────────────┤  business approves / rejects / cancels
//                                       ▼
//                              CREATOR_FAILED ("Deadline missed") + refund request
//
// Once an extension has been approved, missing the extended deadline closes
// the deliverable straight away — no second overdue window. An admin may grant
// one exceptional extra extension with recorded business consent, provided no
// refund money has moved yet.
//
// Every transition runs under the application's row lock and re-checks the
// persisted state first, so a stale sweep or a double click is a no-op.
// ───────────────────────────────────────────────────────────────────────────────

const MIN_EXTENSION_MINUTES = 30;

type AppWithParties = Prisma.ApplicationGetPayload<{
  include: {
    campaign: { include: { business: { select: { id: true; userId: true; businessName: true } } } };
    creator: { select: { id: true; userId: true; fullName: true } };
  };
}>;

async function loadApp(appId: string): Promise<AppWithParties> {
  const app = await prisma.application.findUnique({
    where: { id: appId },
    include: {
      campaign: { include: { business: { select: { id: true, userId: true, businessName: true } } } },
      creator:  { select: { id: true, userId: true, fullName: true } },
    },
  });
  if (!app) throw new AppError('Application not found', HttpStatus.NOT_FOUND);
  return app;
}

function fmtNpt(d: Date): string {
  return d.toLocaleString('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium', timeStyle: 'short' });
}

function bell(userId: string, type: string, title: string, body: string, campaignId: string, applicationId: string) {
  notificationService
    .create({ userId, type, title, body, refId: campaignId, refType: 'campaign', applicationId })
    .catch((err) => logger.warn({ err, applicationId, type }, 'deadline notification failed'));
}

class DeliverableDeadlineService {
  // ── Creator: request an extension on an overdue deliverable ────────────────
  async requestExtension(
    appId: string,
    userId: string,
    input: { reason: string; proposedDeadline: string | Date; previewUrl?: string | null },
  ) {
    const reason = input.reason?.trim();
    if (!reason || reason.length < 10) {
      throw new AppError('Please explain why you missed the deadline (at least 10 characters).', HttpStatus.BAD_REQUEST);
    }
    const proposed = new Date(input.proposedDeadline);
    if (Number.isNaN(proposed.getTime())) throw new AppError('Please choose a valid new date and time.', HttpStatus.BAD_REQUEST);
    let previewUrl: string | null = null;
    if (input.previewUrl?.trim()) {
      const raw = input.previewUrl.trim();
      const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      try {
        const u = new URL(url);
        if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.')) throw new Error('bad');
        previewUrl = url;
      } catch {
        throw new AppError('The preview link is not a valid URL.', HttpStatus.BAD_REQUEST);
      }
    }

    const timings = await getEscrowTimings();
    const now = new Date();
    if (proposed.getTime() < now.getTime() + MIN_EXTENSION_MINUTES * 60_000) {
      throw new AppError('The new submission time must be in the future.', HttpStatus.BAD_REQUEST);
    }
    if (proposed > deadlineFromNow(timings.maxExtensionHours, now)) {
      throw new AppError(`An extension can be at most ${timings.maxExtensionHours} hours.`, HttpStatus.BAD_REQUEST);
    }

    const creator = await prisma.creatorProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!creator) throw new AppError('Creator profile not found', HttpStatus.NOT_FOUND);

    const result = await prisma.$transaction(async (tx) => {
      await lockApplication(tx, appId);
      const app = await tx.application.findUnique({ where: { id: appId } });
      if (!app) throw new AppError('Application not found', HttpStatus.NOT_FOUND);
      if (app.creatorId !== creator.id) throw new AppError('Not authorized', HttpStatus.FORBIDDEN);
      if (app.workStatus !== 'CONTENT_OVERDUE') {
        throw new AppError('An extension can only be requested after the submission deadline has passed and before the deliverable is closed.', HttpStatus.CONFLICT);
      }
      if (app.escrowStatus !== 'HELD') throw new AppError('This deliverable is no longer open for an extension.', HttpStatus.CONFLICT);
      if (app.contentGraceDeadline && app.contentGraceDeadline < now) {
        throw new AppError('The window to request an extension has closed.', HttpStatus.CONFLICT);
      }
      if (app.extensionCount > 0) {
        throw new AppError('This deliverable has already been extended once. Further extensions need an admin and the business’s consent.', HttpStatus.CONFLICT);
      }
      const prior = await tx.deliverableExtension.count({ where: { applicationId: appId, kind: 'STANDARD' } });
      if (prior > 0) throw new AppError('You have already requested an extension for this deliverable.', HttpStatus.CONFLICT);

      // The business always gets a full decision window, but only once per
      // deliverable — the creator can't keep the funds parked by re-asking.
      const decisionDueAt = deadlineFromNow(timings.extensionDecisionHours, now);
      const graceUntil = app.contentGraceDeadline && app.contentGraceDeadline > decisionDueAt ? app.contentGraceDeadline : decisionDueAt;

      const ext = await tx.deliverableExtension.create({
        data: {
          applicationId:    appId,
          campaignId:       app.campaignId,
          requestedById:    userId,
          requestedByRole:  'CREATOR',
          reason,
          proposedDeadline: proposed,
          previewUrl,
          previousDeadline: app.contentDeadline,
          decisionDueAt:    graceUntil,
        },
      });
      await tx.application.update({ where: { id: appId }, data: { contentGraceDeadline: graceUntil } });
      await recordCampaignEventTx(tx, {
        campaignId: app.campaignId, applicationId: appId, axis: 'work',
        fromStatus: 'CONTENT_OVERDUE', toStatus: 'EXTENSION_REQUESTED', actorId: userId, actorType: 'CREATOR', reason,
        metadata: { extensionId: ext.id, proposedDeadline: proposed.toISOString(), decisionDueAt: graceUntil.toISOString() },
      });
      return ext;
    });

    const app = await loadApp(appId);
    bell(
      app.campaign.business.userId, 'extension_requested', 'Extension requested',
      `${app.creator.fullName ?? 'The creator'} missed the deadline for "${app.campaign.title}" and asked for more time until ${fmtNpt(proposed)}. Approve or reject before ${fmtNpt(result.decisionDueAt!)}, otherwise the deliverable is cancelled and a refund is requested.`,
      app.campaignId, appId,
    );
    return result;
  }

  // ── Business: approve an extension ─────────────────────────────────────────
  async approveExtension(appId: string, extensionId: string, userId: string, input: { note?: string | null; deadline?: string | Date | null }) {
    const business = await prisma.businessProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!business) throw new AppError('Business profile not found', HttpStatus.NOT_FOUND);
    const timings = await getEscrowTimings();
    const now = new Date();

    const ext = await prisma.$transaction(async (tx) => {
      await lockApplication(tx, appId);
      const app = await tx.application.findUnique({ where: { id: appId }, include: { campaign: { select: { businessId: true } } } });
      if (!app) throw new AppError('Application not found', HttpStatus.NOT_FOUND);
      if (app.campaign.businessId !== business.id) throw new AppError('Not authorized', HttpStatus.FORBIDDEN);
      const ext = await tx.deliverableExtension.findUnique({ where: { id: extensionId } });
      if (!ext || ext.applicationId !== appId) throw new AppError('Extension request not found', HttpStatus.NOT_FOUND);
      if (ext.status !== 'PENDING') throw new AppError('This extension request has already been decided.', HttpStatus.CONFLICT);
      if (app.workStatus !== 'CONTENT_OVERDUE' || app.escrowStatus !== 'HELD') {
        throw new AppError('This deliverable is no longer waiting on an extension decision.', HttpStatus.CONFLICT);
      }
      if (ext.decisionDueAt && ext.decisionDueAt < now) {
        throw new AppError('The decision window for this request has closed.', HttpStatus.CONFLICT);
      }

      const deadline = input.deadline ? new Date(input.deadline) : ext.proposedDeadline;
      if (Number.isNaN(deadline.getTime()) || deadline.getTime() < now.getTime() + MIN_EXTENSION_MINUTES * 60_000) {
        throw new AppError('The new deadline must be in the future — pick a new date and time.', HttpStatus.BAD_REQUEST);
      }
      if (deadline > deadlineFromNow(timings.maxExtensionHours, now)) {
        throw new AppError(`An extension can be at most ${timings.maxExtensionHours} hours from now.`, HttpStatus.BAD_REQUEST);
      }

      await tx.deliverableExtension.update({
        where: { id: ext.id },
        data: {
          status: 'APPROVED', approvedDeadline: deadline, decidedById: userId, decidedByRole: 'BUSINESS',
          decisionNote: input.note?.trim() || null, decidedAt: now,
        },
      });
      await tx.application.update({
        where: { id: appId },
        data: {
          workStatus:              WorkStatus.IN_PROGRESS,
          contentDeadline:         deadline,
          originalContentDeadline: app.originalContentDeadline ?? app.contentDeadline,
          contentGraceDeadline:    null,
          extensionCount:          { increment: 1 },
        },
      });
      await recordCampaignEventTx(tx, {
        campaignId: app.campaignId, applicationId: appId, axis: 'work',
        fromStatus: 'CONTENT_OVERDUE', toStatus: 'IN_PROGRESS', actorId: userId, actorType: 'BUSINESS',
        reason: 'Extension approved', metadata: { extensionId: ext.id, newDeadline: deadline.toISOString(), previousDeadline: app.contentDeadline?.toISOString() ?? null },
      });
      return { ...ext, approvedDeadline: deadline };
    });

    const app = await loadApp(appId);
    const when = fmtNpt(ext.approvedDeadline);
    bell(app.creator.userId, 'extension_approved', 'Extension approved',
      `${app.campaign.business.businessName ?? 'The business'} approved your extension for "${app.campaign.title}". Submit by ${when} — this is the final deadline.`, app.campaignId, appId);
    bell(app.campaign.business.userId, 'extension_approved', 'Extension granted',
      `You gave ${app.creator.fullName ?? 'the creator'} until ${when} to deliver "${app.campaign.title}". Your payment stays held in escrow until then.`, app.campaignId, appId);
    return ext;
  }

  // ── Business: reject the extension → cancel + refund request ───────────────
  async rejectExtension(appId: string, extensionId: string, userId: string, input: { note: string }) {
    const note = input.note?.trim();
    if (!note) throw new AppError('Please give a reason for rejecting the extension.', HttpStatus.BAD_REQUEST);
    const app = await this.assertBusinessOwns(appId, userId);
    const ext = await prisma.deliverableExtension.findUnique({ where: { id: extensionId } });
    if (!ext || ext.applicationId !== appId) throw new AppError('Extension request not found', HttpStatus.NOT_FOUND);
    if (ext.status !== 'PENDING') throw new AppError('This extension request has already been decided.', HttpStatus.CONFLICT);

    const r = await this.closeDeliverable(app, {
      reasonCode: REFUND_REASON.EXTENSION_REJECTED,
      reason:     `Extension rejected by the business: ${note}`,
      actorId:    userId,
      actorType:  'BUSINESS',
      requireWorkStatus: ['CONTENT_OVERDUE'],
      extensionStatus: 'REJECTED',
      extensionDecision: { decidedById: userId, decidedByRole: 'BUSINESS', decisionNote: note },
    });
    if (!r.closed) throw new AppError('This deliverable is no longer waiting on an extension decision.', HttpStatus.CONFLICT);
    bell(app.creator.userId, 'extension_rejected', 'Extension not approved',
      `${app.campaign.business.businessName ?? 'The business'} did not approve your extension for "${app.campaign.title}". The deliverable is now closed and a refund has been initiated for the business.`, app.campaignId, appId);
    this.notifyBusinessRefund(app, r.referenceCode);
    return { closed: true, refundRequestId: r.refundRequestId };
  }

  // ── Business: cancel an overdue deliverable outright ───────────────────────
  async cancelOverdue(appId: string, userId: string, input: { reason?: string | null }) {
    const app = await this.assertBusinessOwns(appId, userId);
    const why = input.reason?.trim();
    const r = await this.closeDeliverable(app, {
      reasonCode: REFUND_REASON.BUSINESS_CANCELLED_OVERDUE,
      reason:     `Cancelled by the business after the deadline was missed${why ? `: ${why}` : ''}`,
      actorId:    userId,
      actorType:  'BUSINESS',
      requireWorkStatus: ['CONTENT_OVERDUE'],
      extensionStatus: 'CANCELLED',
      extensionDecision: { decidedById: userId, decidedByRole: 'BUSINESS', decisionNote: why ?? 'Business cancelled the deliverable' },
    });
    if (!r.closed) throw new AppError('Only an overdue deliverable can be cancelled this way.', HttpStatus.CONFLICT);
    bell(app.creator.userId, 'deliverable_cancelled', 'Deliverable cancelled',
      `${app.campaign.business.businessName ?? 'The business'} cancelled "${app.campaign.title}" after the submission deadline passed. The deliverable is closed and a refund has been initiated for the business.`, app.campaignId, appId);
    this.notifyBusinessRefund(app, r.referenceCode);
    return { closed: true, refundRequestId: r.refundRequestId };
  }

  // ── Admin: exceptional extra extension (with business consent) ─────────────
  async grantExceptionalExtension(
    appId: string,
    adminUserId: string,
    input: { newDeadline: string | Date; reason: string; businessConsent: boolean },
  ) {
    const reason = input.reason?.trim();
    if (!reason) throw new AppError('A reason is required for an exceptional extension.', HttpStatus.BAD_REQUEST);
    if (input.businessConsent !== true) {
      throw new AppError('An exceptional extension needs the business’s explicit consent.', HttpStatus.BAD_REQUEST);
    }
    const timings = await getEscrowTimings();
    const now = new Date();
    const deadline = new Date(input.newDeadline);
    if (Number.isNaN(deadline.getTime()) || deadline.getTime() < now.getTime() + MIN_EXTENSION_MINUTES * 60_000) {
      throw new AppError('The new deadline must be in the future.', HttpStatus.BAD_REQUEST);
    }
    if (deadline > deadlineFromNow(timings.maxExtensionHours, now)) {
      throw new AppError(`An extension can be at most ${timings.maxExtensionHours} hours from now.`, HttpStatus.BAD_REQUEST);
    }

    const out = await prisma.$transaction(async (tx) => {
      await lockApplication(tx, appId);
      const app = await tx.application.findUnique({ where: { id: appId } });
      if (!app) throw new AppError('Application not found', HttpStatus.NOT_FOUND);
      if (!['CONTENT_OVERDUE', 'CREATOR_FAILED'].includes(app.workStatus)) {
        throw new AppError('Only an overdue or deadline-missed deliverable can be given an exceptional extension.', HttpStatus.CONFLICT);
      }
      if (app.extensionCount >= timings.maxDeadlineExtensions) {
        throw new AppError(`This deliverable has already had the maximum of ${timings.maxDeadlineExtensions} extensions.`, HttpStatus.CONFLICT);
      }

      let restoreEscrow: string | null = null;
      if (app.workStatus === 'CREATOR_FAILED') {
        // Reopening is only possible while no refund money has moved.
        const refund = await tx.refundRequest.findUnique({ where: { idempotencyKey: refundIdempotencyKey(appId, false) } });
        if (app.escrowStatus !== 'REFUND_PENDING' || !refund) {
          throw new AppError('This deliverable can no longer be reopened. A new collaboration needs a new agreement.', HttpStatus.CONFLICT);
        }
        if (!['PENDING', 'APPROVED'].includes(refund.status)) {
          throw new AppError(
            refund.status === 'COMPLETED'
              ? 'The refund has already been completed — the original deliverable stays closed. A new collaboration needs a new agreement.'
              : 'The refund is already being processed — cancel or resolve it before reopening the deliverable.',
            HttpStatus.CONFLICT,
          );
        }
        const moved = await tx.refundRequest.updateMany({
          where: { id: refund.id, status: { in: ['PENDING', 'APPROVED'] } },
          data:  { status: 'CANCELLED' },
        });
        if (moved.count === 0) throw new AppError('The refund changed state — reload and try again.', HttpStatus.CONFLICT);
        await recordRefundEventTx(tx, {
          refundRequestId: refund.id, action: 'cancelled', fromStatus: refund.status, toStatus: 'CANCELLED',
          actorId: adminUserId, actorType: 'ADMIN', note: `Deliverable reopened by an exceptional extension: ${reason}`,
        });
        restoreEscrow = refund.escrowStatusBefore ?? 'HELD';
      } else if (app.escrowStatus !== 'HELD') {
        throw new AppError('This deliverable is not in a state that can be extended.', HttpStatus.CONFLICT);
      }

      await tx.deliverableExtension.updateMany({
        where: { applicationId: appId, status: 'PENDING' },
        data:  { status: 'CANCELLED', decidedAt: now, decidedById: adminUserId, decidedByRole: 'ADMIN', decisionNote: 'Superseded by an admin exceptional extension' },
      });
      const ext = await tx.deliverableExtension.create({
        data: {
          applicationId: appId, campaignId: app.campaignId, kind: 'ADMIN_EXCEPTIONAL', status: 'APPROVED',
          requestedById: adminUserId, requestedByRole: 'ADMIN', reason, proposedDeadline: deadline,
          previousDeadline: app.contentDeadline, approvedDeadline: deadline, decidedById: adminUserId,
          decidedByRole: 'ADMIN', decisionNote: reason, decidedAt: now, businessConsent: true,
        },
      });
      await tx.application.update({
        where: { id: appId },
        data: {
          workStatus:              WorkStatus.IN_PROGRESS,
          contentDeadline:         deadline,
          originalContentDeadline: app.originalContentDeadline ?? app.contentDeadline,
          contentGraceDeadline:    null,
          deliverableClosedAt:     null,
          deliverableClosedReason: null,
          extensionCount:          { increment: 1 },
          ...(restoreEscrow ? { escrowStatus: restoreEscrow as never } : {}),
        },
      });
      await recordCampaignEventTx(tx, {
        campaignId: app.campaignId, applicationId: appId, axis: 'work', fromStatus: app.workStatus, toStatus: 'IN_PROGRESS',
        actorId: adminUserId, actorType: 'ADMIN', reason: `Exceptional extension: ${reason}`,
        metadata: { extensionId: ext.id, newDeadline: deadline.toISOString(), businessConsent: true },
      });
      if (restoreEscrow) {
        await recordCampaignEventTx(tx, {
          campaignId: app.campaignId, applicationId: appId, axis: 'escrow', fromStatus: 'REFUND_PENDING', toStatus: restoreEscrow,
          actorId: adminUserId, actorType: 'ADMIN', reason: 'Refund request cancelled — deliverable reopened',
        });
      }
      return { ext, fromStatus: app.workStatus };
    });

    logAudit({
      userId: adminUserId, actorType: 'ADMIN', action: AuditAction.DELIVERABLE_EXCEPTIONAL_EXTENSION,
      entityType: EntityType.APPLICATION, entityId: appId,
      oldValue: { workStatus: out.fromStatus }, newValue: { workStatus: 'IN_PROGRESS', contentDeadline: deadline.toISOString() },
      metadata: { reason, businessConsent: true, extensionId: out.ext.id },
    });
    const app = await loadApp(appId);
    const when = fmtNpt(deadline);
    bell(app.creator.userId, 'extension_approved', 'Deliverable reopened',
      `Kolab reopened "${app.campaign.title}" with the business's agreement. Submit by ${when} — this is the final deadline.`, app.campaignId, appId);
    bell(app.campaign.business.userId, 'extension_approved', 'Deliverable reopened',
      `As agreed, "${app.campaign.title}" was reopened until ${when}. Your payment stays held in escrow; any pending refund request was cancelled.`, app.campaignId, appId);
    return out.ext;
  }

  // ── System (sweeps) ────────────────────────────────────────────────────────

  /**
   * Deadline passed with nothing submitted. First miss → CONTENT_OVERDUE with
   * a decision window; a miss after an approved extension → closed for good.
   * Returns what happened (null = stale, nothing done).
   */
  async handleMissedDeadline(appId: string, now = new Date()): Promise<'overdue' | 'closed' | null> {
    const timings = await getEscrowTimings();
    const app = await prisma.application.findUnique({ where: { id: appId }, select: { extensionCount: true } });
    if (!app) return null;

    if (app.extensionCount > 0) {
      const full = await loadApp(appId);
      const r = await this.closeDeliverable(full, {
        reasonCode: REFUND_REASON.DEADLINE_MISSED,
        reason:     'The extended submission deadline passed without a submission',
        actorType:  'SYSTEM',
        requireWorkStatus: ['IN_PROGRESS'],
        guard: (a) => !!a.contentDeadline && a.contentDeadline < now,
      });
      if (!r.closed) return null;
      this.notifyFinalMiss(full, r.referenceCode);
      return 'closed';
    }

    const decisionDueAt = deadlineFromNow(timings.extensionDecisionHours, now);
    const moved = await prisma.$transaction(async (tx) => {
      await lockApplication(tx, appId);
      const a = await tx.application.findUnique({ where: { id: appId } });
      // Re-read under the lock: a submission or extension that landed since the
      // sweep's query wins.
      if (!a || a.status !== 'ACCEPTED' || a.workStatus !== 'IN_PROGRESS' || !a.contentDeadline || a.contentDeadline >= now) return null;
      await tx.application.update({
        where: { id: appId },
        data: {
          workStatus:              'CONTENT_OVERDUE',
          contentOverdueAt:        now,
          contentGraceDeadline:    decisionDueAt,
          originalContentDeadline: a.originalContentDeadline ?? a.contentDeadline,
        },
      });
      await recordCampaignEventTx(tx, {
        campaignId: a.campaignId, applicationId: appId, axis: 'work', fromStatus: 'IN_PROGRESS', toStatus: 'CONTENT_OVERDUE',
        actorType: 'SYSTEM', reason: 'Content deadline passed', metadata: { deadline: a.contentDeadline.toISOString(), decisionDueAt: decisionDueAt.toISOString() },
      });
      return a;
    });
    if (!moved) return null;

    logActivity({ userId: null, action: ActivityAction.CONTENT_OVERDUE, entityType: EntityType.APPLICATION, entityId: appId, metadata: { campaignId: moved.campaignId } });
    const full = await loadApp(appId);
    bell(full.creator.userId, 'content_overdue', 'Your submission deadline has passed',
      `The deadline for "${full.campaign.title}" has passed. You can request an extension if you still intend to submit your work — the business must approve it before the deliverable reopens. Request it before ${fmtNpt(decisionDueAt)}.`,
      full.campaignId, appId);
    bell(full.campaign.business.userId, 'content_overdue', 'Creator missed the deadline',
      `${full.creator.fullName ?? 'The creator'} did not submit "${full.campaign.title}" on time. You can wait for an extension request or cancel and request a refund. If you take no action by ${fmtNpt(decisionDueAt)}, it is cancelled and refunded automatically.`,
      full.campaignId, appId);
    return 'overdue';
  }

  /** The overdue decision window lapsed — cancel + refund request. */
  async handleDecisionWindowLapsed(appId: string, now = new Date()): Promise<boolean> {
    const full = await loadApp(appId);
    const pending = await prisma.deliverableExtension.findFirst({ where: { applicationId: appId, status: 'PENDING' }, select: { id: true } });
    const r = await this.closeDeliverable(full, {
      reasonCode: pending ? REFUND_REASON.EXTENSION_EXPIRED : REFUND_REASON.DEADLINE_MISSED,
      reason:     pending
        ? 'The business did not respond to the extension request within the decision window'
        : 'The submission deadline passed and no extension was agreed within the decision window',
      actorType:  'SYSTEM',
      requireWorkStatus: ['CONTENT_OVERDUE'],
      guard: (a) => !!a.contentGraceDeadline && a.contentGraceDeadline < now,
      extensionStatus: 'EXPIRED',
      extensionDecision: { decidedById: null, decidedByRole: 'SYSTEM', decisionNote: 'Decision window lapsed' },
    });
    if (!r.closed) return false;
    this.notifyFinalMiss(full, r.referenceCode);
    return true;
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private async assertBusinessOwns(appId: string, userId: string) {
    const business = await prisma.businessProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!business) throw new AppError('Business profile not found', HttpStatus.NOT_FOUND);
    const app = await loadApp(appId);
    if (app.campaign.business.id !== business.id) throw new AppError('Not authorized', HttpStatus.FORBIDDEN);
    return app;
  }

  /**
   * Close the deliverable for good (CREATOR_FAILED) and open the refund
   * request, atomically, via EscrowService.refund. Pending extension requests
   * are resolved in the same transaction.
   */
  private async closeDeliverable(
    app: AppWithParties,
    opts: {
      reasonCode: RefundReasonCode;
      reason: string;
      actorId?: string | null;
      actorType: 'BUSINESS' | 'SYSTEM' | 'ADMIN';
      requireWorkStatus: WorkStatus[];
      guard?: Parameters<typeof escrowService.refund>[0]['guard'];
      extensionStatus?: 'REJECTED' | 'EXPIRED' | 'CANCELLED';
      extensionDecision?: { decidedById: string | null; decidedByRole: 'BUSINESS' | 'SYSTEM' | 'ADMIN'; decisionNote: string };
    },
  ): Promise<{ closed: boolean; refundRequestId?: string; referenceCode?: string }> {
    const now = new Date();
    const r = await escrowService.refund({
      applicationId:     app.id,
      reason:            opts.reason,
      reasonCode:        opts.reasonCode,
      actorId:           opts.actorId ?? null,
      actorType:         opts.actorType,
      workStatusAfter:   WorkStatus.CREATOR_FAILED,
      silent:            true,
      requireWorkStatus: opts.requireWorkStatus,
      guard:             opts.guard,
      closeDeliverable:  opts.reason,
      systemMessage:     'This deliverable has been closed after the submission deadline was missed, and a refund has been initiated for the business.',
      inTx: opts.extensionStatus
        ? async (tx) => {
            await tx.deliverableExtension.updateMany({
              where: { applicationId: app.id, status: 'PENDING' },
              data: {
                status:        opts.extensionStatus!,
                decidedAt:     now,
                decidedById:   opts.extensionDecision?.decidedById ?? null,
                decidedByRole: opts.extensionDecision?.decidedByRole ?? 'SYSTEM',
                decisionNote:  opts.extensionDecision?.decisionNote ?? null,
              },
            });
          }
        : undefined,
    });
    if (!r.refunded) return { closed: false };
    void escrowService.bumpReliability(app.creatorId, 'failed');
    logActivity({ userId: opts.actorId ?? null, action: ActivityAction.CREATOR_FAILED, entityType: EntityType.APPLICATION, entityId: app.id, metadata: { campaignId: app.campaignId, reasonCode: opts.reasonCode } });
    return { closed: true, refundRequestId: r.refundRequestId, referenceCode: r.referenceCode };
  }

  private notifyBusinessRefund(app: AppWithParties, referenceCode?: string) {
    bell(app.campaign.business.userId, 'refund_requested', 'Refund requested',
      `Your refund request${referenceCode ? ` (${referenceCode})` : ''} for "${app.campaign.title}" has been created and is awaiting processing. Kolab will notify you when the transfer is completed.`,
      app.campaignId, app.id);
  }

  private notifyFinalMiss(app: AppWithParties, referenceCode?: string) {
    bell(app.creator.userId, 'deadline_missed', 'Final deadline missed',
      `The final submission deadline for "${app.campaign.title}" has passed. This deliverable is now closed, and the applicable refund process has been initiated. Contact support if you believe this status is incorrect.`,
      app.campaignId, app.id);
    bell(app.campaign.business.userId, 'deadline_missed', 'Deliverable closed — refund requested',
      `${app.creator.fullName ?? 'The creator'} did not deliver "${app.campaign.title}" by the final deadline. The deliverable is closed and your refund request${referenceCode ? ` (${referenceCode})` : ''} is awaiting processing. Kolab will notify you when the transfer is completed.`,
      app.campaignId, app.id);
  }
}

export const deliverableDeadlineService = new DeliverableDeadlineService();
