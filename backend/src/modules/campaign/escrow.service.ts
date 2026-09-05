import { Prisma, WorkStatus, CampaignEventActor } from '@prisma/client';
import prisma from '../../prisma';
import { AppError } from '../../middleware/error';
import { getDict } from '../../i18n';
import { notificationService } from '../notifications/notification.service';
import { analyticsService } from '../analytics/analytics.service';
import { MessagingService } from '../messaging/messaging.service';
import { recordCampaignEventTx } from './campaign-events';
import { recordWalletTransaction } from '../wallet/wallet.ledger';
import { assertEscrowTransition } from './application-state-machine';
import { logActivity } from '../logging/activity.service';
import { ActivityAction, EntityType } from '../logging/logging.constants';

import { HttpStatus } from '../../constants/httpStatus';

const messagingService = new MessagingService();

// ───────────────────────────────────────────────────────────────────────────────
// EscrowService — the money operations of the campaign state machine, each one
// a single atomic DB transaction that rolls back completely on any failure
// (escrow spec §42) and is idempotent through a unique PaymentTransaction
// `reference` (§43). Escrow release itself still lives in campaign.service.ts
// for now and is folded in here in the settlement task.
// ───────────────────────────────────────────────────────────────────────────────

interface RefundInput {
  applicationId: string;
  /** Omitted or ≥ proposedRate ⇒ full refund. */
  amount?: number;
  reason: string;
  actorId?: string | null;
  actorType?: CampaignEventActor;
  /**
   * workStatus to set once the refund lands. Defaults to CANCELLED for a full
   * refund; pass `null` to leave workStatus untouched (dispute split, where the
   * creator is simultaneously being paid their share).
   */
  workStatusAfter?: WorkStatus | null;
  /** Suppress the default business/creator notifications (caller sends its own). */
  silent?: boolean;
}

interface RefundResult {
  refunded: boolean;      // false ⇒ nothing to do (already refunded / not funded)
  amount: number;
  partial: boolean;
}

class EscrowService {
  /**
   * Return held escrow to the business, fully or partially. Safe to call more
   * than once for the same (applicationId, partial?) — the second call is a
   * no-op. Notifications fire only on the transaction that actually moved money.
   */
  async refund(input: RefundInput): Promise<RefundResult> {
    const {
      applicationId,
      reason,
      actorId = null,
      actorType = CampaignEventActor.SYSTEM,
      silent = false,
    } = input;

    const outcome = await prisma.$transaction(async (tx) => {
      const app = await tx.application.findUnique({
        where: { id: applicationId },
        include: {
          campaign: { include: { business: { select: { id: true, userId: true, businessName: true } } } },
          creator:  { select: { userId: true, fullName: true } },
        },
      });
      if (!app) throw new AppError(getDict().campaign.applicationNotFound, HttpStatus.NOT_FOUND);

      const REFUNDABLE = ['HELD', 'FROZEN', 'RELEASE_PENDING', 'REFUND_PENDING'];
      if (!REFUNDABLE.includes(app.escrowStatus)) {
        return { moved: false as const, app, amount: 0, partial: false };
      }

      const full = input.amount == null || input.amount >= app.proposedRate;
      const amount = full ? app.proposedRate : Math.max(0, input.amount!);
      if (amount <= 0) return { moved: false as const, app, amount: 0, partial: false };

      const partial = !full;
      const reference = partial ? `refund:${applicationId}:partial` : `refund:${applicationId}`;

      const existing = await tx.paymentTransaction.findUnique({ where: { reference } });
      if (existing) return { moved: false as const, app, amount, partial };

      await tx.paymentTransaction.create({
        data: {
          type:          partial ? 'PARTIAL_REFUND' : 'REFUND',
          amount,
          method:        app.paymentMethod,
          applicationId,
          campaignId:    app.campaignId,
          businessId:    app.campaign.business.id,
          reference,
          metadata:      { reason, actorType } as Prisma.InputJsonValue,
        },
      });

      const nextEscrow = partial ? 'PARTIALLY_REFUNDED' : 'REFUNDED';
      const workStatusAfter =
        input.workStatusAfter === null
          ? undefined
          : input.workStatusAfter ?? (full ? WorkStatus.CANCELLED : undefined);

      await tx.application.update({
        where: { id: applicationId },
        data: {
          escrowStatus:  nextEscrow,
          // Keep the legacy coarse flag in step for existing reads.
          paymentStatus: partial ? undefined : 'REFUNDED',
          ...(workStatusAfter ? { workStatus: workStatusAfter } : {}),
        },
      });

      await recordCampaignEventTx(tx, {
        campaignId:    app.campaignId,
        applicationId,
        axis:          'escrow',
        fromStatus:    app.escrowStatus,
        toStatus:      nextEscrow,
        actorId,
        actorType,
        reason,
        metadata:      { amount, partial },
      });

      return { moved: true as const, app, amount, partial };
    });

    if (!outcome.moved) {
      return { refunded: false, amount: outcome.amount, partial: outcome.partial };
    }

    const { app, amount, partial } = outcome;
    logActivity({
      userId:     actorId,
      action:     ActivityAction.PAYMENT_REFUNDED,
      entityType: EntityType.APPLICATION,
      entityId:   applicationId,
      metadata:   { campaignId: app.campaignId, amount, partial, reason },
    });

    if (!silent) {
      notificationService.create({
        userId:  app.campaign.business.userId,
        type:    'payment_refunded',
        title:   partial ? 'Partial refund processed' : 'Refund processed',
        body:    `A ${partial ? 'partial ' : ''}refund of Rs. ${amount.toLocaleString()} for "${app.campaign.title}" is being returned to your original payment method within 3–5 business days.`,
        refId:   app.campaignId,
        refType: 'campaign',
      }).catch(() => {});

      if (app.creator?.userId && !partial) {
        notificationService.create({
          userId:  app.creator.userId,
          type:    'campaign_closed',
          title:   'Campaign closed',
          body:    `"${app.campaign.title}" has been closed and the business refunded. ${reason}`,
          refId:   app.campaignId,
          refType: 'campaign',
        }).catch(() => {});
      }
    }

    return { refunded: true, amount, partial };
  }

  /**
   * Release held escrow to the creator's wallet — the one implementation, used
   * by manual approval, the settlement sweep, the auto-approve sweep and admin
   * dispute resolution. The money movement (payout ledger row + wallet credit +
   * status flip + campaign events) is a single DB transaction that rolls back
   * entirely on any failure (escrow spec §42); every write is idempotent, so a
   * retried release credits nothing twice (§43). Side effects (notifications,
   * chat, analytics) fire only after a transaction that actually moved money.
   */
  async release(params: {
    applicationId: string;
    actor: { userId?: string | null; type: 'BUSINESS' | 'ADMIN' | 'SYSTEM' };
    /** Full amount defaults to proposedRate; pass a smaller value for a dispute split. */
    amount?: number;
    reason?: string;
    /** Suppress the standard completion notifications/chat (dispute flow sends its own). */
    silent?: boolean;
  }): Promise<{ released: boolean }> {
    const { applicationId, actor } = params;

    const outcome = await prisma.$transaction(async (tx) => {
      const app = await tx.application.findUnique({
        where: { id: applicationId },
        include: {
          campaign: { include: { business: { select: { id: true, userId: true, businessName: true } } } },
          creator:  { select: { id: true, userId: true, fullName: true } },
        },
      });
      if (!app) throw new AppError(getDict().campaign.applicationNotFound, HttpStatus.NOT_FOUND);

      if (app.escrowStatus === 'RELEASED') return { moved: false as const, app };
      if (!['HELD', 'RELEASE_PENDING', 'FROZEN'].includes(app.escrowStatus)) {
        throw new AppError(getDict().campaign.escrowNotReleasable(app.escrowStatus), HttpStatus.CONFLICT);
      }
      // A frozen (disputed) escrow only moves under admin resolution.
      if (app.escrowStatus === 'FROZEN' && actor.type !== 'ADMIN') {
        throw new AppError(getDict().campaign.engagementUnderDispute, HttpStatus.CONFLICT);
      }
      assertEscrowTransition(app.escrowStatus, 'RELEASED');

      const amount = params.amount != null ? Math.max(0, params.amount) : app.proposedRate;
      const adminId = actor.type === 'ADMIN' ? actor.userId ?? null : null;

      const payoutRef = `payout:${applicationId}`;
      if (!(await tx.paymentTransaction.findUnique({ where: { reference: payoutRef } }))) {
        await tx.paymentTransaction.create({
          data: {
            type:          'PAYOUT',
            amount,
            applicationId,
            campaignId:    app.campaignId,
            businessId:    app.campaign.business.id,
            creatorId:     app.creatorId,
            adminId,
            reference:     payoutRef,
            metadata:      { actorType: actor.type, reason: params.reason ?? null } as Prisma.InputJsonValue,
          },
        });
      }

      // Wallet credit — idempotent via WalletTransaction's (referenceId, type)
      // unique index; a P2002 here rolls the whole transaction back, which is
      // the backstop against a double credit.
      const creditedAlready = await tx.walletTransaction.findFirst({
        where: { referenceId: applicationId, type: 'CAMPAIGN_PAYOUT' },
        select: { id: true },
      });
      if (!creditedAlready) {
        await recordWalletTransaction(tx, {
          creatorId:     app.creatorId,
          type:          'CAMPAIGN_PAYOUT',
          direction:     'CREDIT',
          amount,
          description:   `Payment for "${app.campaign.title}"`,
          referenceType: 'application',
          referenceId:   applicationId,
        });
      }

      await tx.application.update({
        where: { id: applicationId },
        data: {
          paymentStatus:     'RELEASED',
          escrowStatus:      'RELEASED',
          workStatus:        'COMPLETED',
          releasedAt:        new Date(),
          releasedByAdminId: adminId,
          paymentReleaseAt:  null,
        },
      });

      await recordCampaignEventTx(tx, {
        campaignId:    app.campaignId,
        applicationId,
        axis:          'escrow',
        fromStatus:    app.escrowStatus,
        toStatus:      'RELEASED',
        actorId:       actor.userId ?? null,
        actorType:     actor.type,
        reason:        params.reason,
        metadata:      { amount },
      });
      await recordCampaignEventTx(tx, {
        campaignId:    app.campaignId,
        applicationId,
        axis:          'work',
        fromStatus:    app.workStatus,
        toStatus:      'COMPLETED',
        actorId:       actor.userId ?? null,
        actorType:     actor.type,
      });

      return { moved: true as const, app, amount };
    });

    if (!outcome.moved) return { released: false };

    const { app, amount } = outcome;
    const creatorUserId  = app.creator.userId;
    const businessUserId  = app.campaign.business.userId;

    logActivity({
      userId:     actor.type === 'SYSTEM' ? null : actor.userId ?? null,
      action:     ActivityAction.PAYMENT_RELEASED,
      entityType: EntityType.APPLICATION,
      entityId:   applicationId,
      metadata:   { campaignId: app.campaignId, amount, actorType: actor.type },
    });
    analyticsService.incrPaymentReleased(creatorUserId, businessUserId, amount);
    analyticsService.incrCampaignCompleted(creatorUserId, businessUserId);
    void this.bumpReliability(app.creatorId, app.submittedLate ? 'late' : 'completed');

    if (!params.silent) {
      notificationService.create({
        userId:  creatorUserId,
        type:    'payment_released',
        title:   'Payment released to your wallet',
        body:    `Your payment for "${app.campaign.title}" has been released to your wallet.`,
        refId:   app.campaignId,
        refType: 'campaign',
      }).catch(() => {});
      notificationService.create({
        userId:  businessUserId,
        type:    'project_completed',
        title:   'Project Complete',
        body:    `Payment for "${app.campaign.title}" has been released — the project is now complete.`,
        refId:   app.campaignId,
        refType: 'campaign',
      }).catch(() => {});

      await messagingService
        .sendSystemMessage(app.creator.id, app.campaign.business.id, app.campaignId, businessUserId, 'BUSINESS', 'Payment released.')
        .catch(() => {});
      messagingService
        .closeConversationAfterCompletion(creatorUserId, businessUserId, app.creator.id, app.campaign.business.id)
        .catch(() => {});
    }

    return { released: true };
  }

  /**
   * Void an accepted-but-not-yet-funded (or not-yet-confirmed) assignment: mark
   * the application EXPIRED, free the slot, and re-open the campaign if it was
   * closed only because this slot filled. No money is involved.
   */
  async voidAssignment(params: {
    applicationId: string;
    reason: string;
    fromApplicationStatus?: string;
  }): Promise<{ voided: boolean }> {
    const voided = await prisma.$transaction(async (tx) => {
      const app = await tx.application.findUnique({
        where: { id: params.applicationId },
        include: { campaign: { select: { id: true, status: true, deadline: true } } },
      });
      if (!app || app.status !== 'ACCEPTED') return false;

      await tx.application.update({
        where: { id: params.applicationId },
        data: { status: 'EXPIRED' },
      });

      // Re-open a campaign that closed only because this slot filled, as long as
      // it hasn't itself passed its deadline.
      if (app.campaign.status === 'CLOSED' && app.campaign.deadline > new Date()) {
        await tx.campaign.update({
          where: { id: app.campaignId },
          data:  { status: 'ACTIVE', eventStatus: 'OPEN' },
        });
      }

      await recordCampaignEventTx(tx, {
        campaignId:    app.campaignId,
        applicationId: params.applicationId,
        axis:          'application',
        fromStatus:    params.fromApplicationStatus ?? 'ACCEPTED',
        toStatus:      'EXPIRED',
        actorType:     'SYSTEM',
        reason:        params.reason,
      });

      return true;
    });

    return { voided };
  }

  // ── Reliability (escrow spec §40) ────────────────────────────────────────
  // One row per creator, lazily created. reliabilityScore is fully derived from
  // the counters and floored at 0 — a single miss is a small dent, not a ban.
  async bumpReliability(
    creatorId: string,
    event: 'completed' | 'late' | 'failed' | 'missedConfirmation' | 'cancelledAfterConfirmation',
  ): Promise<void> {
    const field: string = {
      completed:                  'completedCampaigns',
      late:                       'lateCampaigns',
      failed:                     'failedCampaigns',
      missedConfirmation:         'missedConfirmations',
      cancelledAfterConfirmation: 'cancelledAfterConfirmation',
    }[event];

    try {
      await prisma.creatorReliability.upsert({
        where:  { creatorId },
        create: { creatorId, [field]: 1, ...(event === 'late' ? { completedCampaigns: 1 } : {}) },
        update: {
          [field]: { increment: 1 },
          // 'late' also counts as a completed campaign for the ratio's sake.
          ...(event === 'late' ? { completedCampaigns: { increment: 1 } } : {}),
        },
      });
      const fresh = await prisma.creatorReliability.findUniqueOrThrow({ where: { creatorId } });
      const score = Math.max(
        0,
        100
          - 15 * fresh.failedCampaigns
          - 5  * fresh.lateCampaigns
          - 10 * fresh.cancelledAfterConfirmation
          - 5  * fresh.missedConfirmations,
      );
      if (score !== fresh.reliabilityScore) {
        await prisma.creatorReliability.update({ where: { creatorId }, data: { reliabilityScore: score } });
      }
    } catch {
      // Reliability tracking is best-effort — never fail a money operation for it.
    }
  }

  // ── Disputes (escrow spec §27–§28) ──────────────────────────────────────
  // Either party freezes the escrow by raising a dispute; only an admin
  // resolution (below) moves the money afterwards.
  async raiseDispute(params: {
    applicationId: string;
    raisedByUserId: string;
    raisedByRole: 'BUSINESS' | 'CREATOR';
    reason: string;
  }): Promise<{ disputeId: string }> {
    const { applicationId, raisedByUserId, raisedByRole, reason } = params;

    const result = await prisma.$transaction(async (tx) => {
      const app = await tx.application.findUnique({
        where: { id: applicationId },
        include: {
          campaign: { include: { business: { select: { id: true, userId: true, businessName: true } } } },
          creator:  { select: { id: true, userId: true, fullName: true } },
          dispute:  true,
        },
      });
      if (!app) throw new AppError(getDict().campaign.applicationNotFound, HttpStatus.NOT_FOUND);
      if (app.dispute) throw new AppError(getDict().campaign.disputeAlreadyOpen, HttpStatus.CONFLICT);
      if (!['HELD', 'RELEASE_PENDING'].includes(app.escrowStatus)) {
        throw new AppError(getDict().campaign.noHeldPaymentToDispute, HttpStatus.CONFLICT);
      }
      if (['COMPLETED', 'CANCELLED', 'CREATOR_FAILED'].includes(app.workStatus)) {
        throw new AppError(getDict().campaign.engagementAlreadyFinished, HttpStatus.CONFLICT);
      }
      assertEscrowTransition(app.escrowStatus, 'FROZEN');
      const prevEscrow = app.escrowStatus;

      const dispute = await tx.dispute.create({
        data: {
          applicationId,
          campaignId:   app.campaignId,
          raisedById:   raisedByUserId,
          raisedByRole,
          reason,
        },
      });

      await tx.application.update({
        where: { id: applicationId },
        data: {
          workStatus:          'DISPUTED',
          escrowStatus:        'FROZEN',
          businessReviewDueAt:  null,
          paymentReleaseAt:     null,
          contentGraceDeadline: null,
        },
      });
      await tx.revisionNote.create({
        data: { applicationId, note: `[Dispute raised by ${raisedByRole.toLowerCase()}] ${reason}` },
      });
      const latestVersion = await tx.campaignSubmissionVersion.findFirst({
        where: { applicationId }, orderBy: { version: 'desc' }, select: { id: true },
      });
      if (latestVersion) {
        await tx.campaignSubmissionVersion.update({
          where: { id: latestVersion.id },
          data:  { reviewOutcome: 'DISPUTED', reviewNote: reason, reviewedAt: new Date() },
        });
      }

      await recordCampaignEventTx(tx, {
        campaignId: app.campaignId, applicationId, axis: 'dispute',
        fromStatus: null, toStatus: 'OPEN', actorId: raisedByUserId, actorType: raisedByRole, reason,
      });
      await recordCampaignEventTx(tx, {
        campaignId: app.campaignId, applicationId, axis: 'escrow',
        fromStatus: prevEscrow, toStatus: 'FROZEN', actorId: raisedByUserId, actorType: raisedByRole, reason,
      });

      return { dispute, app };
    });

    const { dispute, app } = result;
    logActivity({
      userId: raisedByUserId, action: ActivityAction.APPLICATION_DISPUTED,
      entityType: EntityType.APPLICATION, entityId: applicationId,
      metadata: { campaignId: app.campaignId, raisedByRole },
    });

    const otherUserId = raisedByRole === 'BUSINESS' ? app.creator.userId : app.campaign.business.userId;
    notificationService.create({
      userId:  otherUserId,
      type:    'dispute_opened',
      title:   'A dispute was opened',
      body:    `A dispute was raised on "${app.campaign.title}". The payment is held while Kolab reviews it.`,
      refId:   app.campaignId,
      refType: 'campaign',
    }).catch(() => {});
    notificationService.createForAdmins({
      type:    'dispute_opened',
      title:   '⚖️ Dispute opened',
      body:    `${raisedByRole === 'BUSINESS' ? app.campaign.business.businessName : app.creator.fullName} raised a dispute on "${app.campaign.title}".`,
      refId:   applicationId,
      refType: 'dispute',
    }).catch(() => {});

    return { disputeId: dispute.id };
  }

  // Admin-only resolution. Every outcome routes through the same idempotent
  // money primitives; the whole thing is audited with a mandatory reason (§35).
  async resolveDispute(params: {
    disputeId: string;
    adminUserId: string;
    outcome: 'CREATOR_WON' | 'BUSINESS_WON' | 'PARTIAL' | 'DISMISSED';
    note: string;
    creatorAmount?: number;
    businessAmount?: number;
  }): Promise<void> {
    const { disputeId, adminUserId, outcome, note } = params;
    if (!note?.trim()) throw new AppError(getDict().campaign.resolutionReasonRequired, HttpStatus.BAD_REQUEST);

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        application: {
          include: {
            campaign: { include: { business: { select: { id: true, userId: true, businessName: true } } } },
            creator:  { select: { id: true, userId: true, fullName: true } },
          },
        },
      },
    });
    if (!dispute) throw new AppError(getDict().campaign.disputeNotFound, HttpStatus.NOT_FOUND);
    if (dispute.status === 'RESOLVED') throw new AppError(getDict().campaign.disputeAlreadyResolved, HttpStatus.CONFLICT);

    const app = dispute.application;
    const total = app.proposedRate;

    if (outcome === 'CREATOR_WON') {
      await this.release({ applicationId: app.id, actor: { userId: adminUserId, type: 'ADMIN' }, reason: `Dispute resolved — creator: ${note}` });
    } else if (outcome === 'BUSINESS_WON') {
      await this.refund({ applicationId: app.id, reason: `Dispute resolved — business: ${note}`, actorId: adminUserId, actorType: 'ADMIN', workStatusAfter: WorkStatus.CANCELLED, silent: true });
    } else if (outcome === 'PARTIAL') {
      const cAmt = Math.max(0, params.creatorAmount ?? 0);
      const bAmt = Math.max(0, params.businessAmount ?? 0);
      if (Math.abs(cAmt + bAmt - total) > 0.01) {
        throw new AppError(getDict().campaign.splitMustEqualEscrowedAmount(cAmt, bAmt, total), HttpStatus.BAD_REQUEST);
      }
      await this.settleSplit({ applicationId: app.id, adminUserId, creatorAmount: cAmt, businessAmount: bAmt, note });
    } else {
      // DISMISSED — unfreeze and let the normal flow resume.
      await this.unfreeze({ applicationId: app.id, adminUserId, note });
    }

    await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status:            'RESOLVED',
        resolution:        outcome,
        resolutionNote:    note,
        creatorAmount:     params.creatorAmount ?? null,
        businessAmount:    params.businessAmount ?? null,
        resolvedByAdminId: adminUserId,
        resolvedAt:        new Date(),
      },
    });

    logActivity({
      userId: adminUserId, action: ActivityAction.DISPUTE_RESOLVED,
      entityType: EntityType.APPLICATION, entityId: app.id,
      metadata: { disputeId, outcome, note, creatorAmount: params.creatorAmount, businessAmount: params.businessAmount },
    });
    recordCampaignEventTx(prisma, {
      campaignId: app.campaignId, applicationId: app.id, axis: 'dispute',
      fromStatus: 'OPEN', toStatus: 'RESOLVED', actorId: adminUserId, actorType: 'ADMIN', reason: `${outcome}: ${note}`,
    }).catch(() => {});

    for (const userId of [app.creator.userId, app.campaign.business.userId]) {
      notificationService.create({
        userId,
        type:    'dispute_resolved',
        title:   'Dispute resolved',
        body:    `The dispute on "${app.campaign.title}" was resolved (${outcome.replace('_', ' ').toLowerCase()}). ${note}`,
        refId:   app.campaignId,
        refType: 'campaign',
      }).catch(() => {});
    }
  }

  // PARTIAL dispute settlement — one transaction that pays the creator their
  // share and returns the rest to the business.
  private async settleSplit(params: {
    applicationId: string;
    adminUserId: string;
    creatorAmount: number;
    businessAmount: number;
    note: string;
  }): Promise<void> {
    const { applicationId, adminUserId, creatorAmount, businessAmount } = params;

    await prisma.$transaction(async (tx) => {
      const app = await tx.application.findUnique({
        where: { id: applicationId },
        include: { campaign: { include: { business: { select: { id: true } } } } },
      });
      if (!app) throw new AppError(getDict().campaign.applicationNotFound, HttpStatus.NOT_FOUND);
      if (app.escrowStatus === 'PARTIALLY_REFUNDED' || app.escrowStatus === 'RELEASED') return;
      assertEscrowTransition(app.escrowStatus, 'PARTIALLY_REFUNDED');

      if (businessAmount > 0) {
        const ref = `refund:${applicationId}:partial`;
        if (!(await tx.paymentTransaction.findUnique({ where: { reference: ref } }))) {
          await tx.paymentTransaction.create({
            data: {
              type: 'PARTIAL_REFUND', amount: businessAmount, method: app.paymentMethod,
              applicationId, campaignId: app.campaignId, businessId: app.campaign.business.id,
              adminId: adminUserId, reference: ref,
              metadata: { reason: params.note, split: true } as Prisma.InputJsonValue,
            },
          });
        }
      }
      if (creatorAmount > 0) {
        const ref = `payout:${applicationId}`;
        if (!(await tx.paymentTransaction.findUnique({ where: { reference: ref } }))) {
          await tx.paymentTransaction.create({
            data: {
              type: 'PAYOUT', amount: creatorAmount,
              applicationId, campaignId: app.campaignId, businessId: app.campaign.business.id,
              creatorId: app.creatorId, adminId: adminUserId, reference: ref,
              metadata: { reason: params.note, split: true } as Prisma.InputJsonValue,
            },
          });
        }
        const credited = await tx.walletTransaction.findFirst({ where: { referenceId: applicationId, type: 'CAMPAIGN_PAYOUT' }, select: { id: true } });
        if (!credited) {
          await recordWalletTransaction(tx, {
            creatorId: app.creatorId, type: 'CAMPAIGN_PAYOUT', direction: 'CREDIT',
            amount: creatorAmount, description: `Dispute settlement for "${app.campaign.title}"`,
            referenceType: 'application', referenceId: applicationId,
          });
        }
      }

      await tx.application.update({
        where: { id: applicationId },
        data: {
          escrowStatus:      'PARTIALLY_REFUNDED',
          paymentStatus:     creatorAmount > 0 ? 'RELEASED' : 'REFUNDED',
          workStatus:        'COMPLETED',
          releasedAt:        new Date(),
          releasedByAdminId: adminUserId,
          paymentReleaseAt:  null,
        },
      });
      await recordCampaignEventTx(tx, {
        campaignId: app.campaignId, applicationId, axis: 'escrow',
        fromStatus: app.escrowStatus, toStatus: 'PARTIALLY_REFUNDED', actorId: adminUserId, actorType: 'ADMIN',
        metadata: { creatorAmount, businessAmount },
      });
      await recordCampaignEventTx(tx, {
        campaignId: app.campaignId, applicationId, axis: 'work',
        fromStatus: app.workStatus, toStatus: 'COMPLETED', actorId: adminUserId, actorType: 'ADMIN',
      });
    });
  }

  // DISMISSED — thaw the escrow and put the engagement back on the normal flow.
  private async unfreeze(params: { applicationId: string; adminUserId: string; note: string }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const app = await tx.application.findUnique({
        where: { id: params.applicationId },
        include: { submissionVersions: { select: { id: true }, take: 1 } },
      });
      if (!app || app.escrowStatus !== 'FROZEN') return;
      assertEscrowTransition('FROZEN', 'HELD');

      const nextWork = app.submissionVersions.length > 0 ? 'SUBMITTED' : 'IN_PROGRESS';
      await tx.application.update({
        where: { id: params.applicationId },
        data: { escrowStatus: 'HELD', workStatus: nextWork },
      });
      await recordCampaignEventTx(tx, {
        campaignId: app.campaignId, applicationId: params.applicationId, axis: 'escrow',
        fromStatus: 'FROZEN', toStatus: 'HELD', actorId: params.adminUserId, actorType: 'ADMIN', reason: params.note,
      });
      await recordCampaignEventTx(tx, {
        campaignId: app.campaignId, applicationId: params.applicationId, axis: 'work',
        fromStatus: 'DISPUTED', toStatus: nextWork, actorId: params.adminUserId, actorType: 'ADMIN',
      });
    });
  }

  /** Whether a creator is currently allowed to apply, per their reliability score. */
  async canCreatorApply(creatorId: string, minScore: number): Promise<boolean> {
    if (minScore <= 0) return true;
    const row = await prisma.creatorReliability.findUnique({ where: { creatorId }, select: { reliabilityScore: true } });
    return !row || row.reliabilityScore >= minScore;
  }
}

export const escrowService = new EscrowService();
