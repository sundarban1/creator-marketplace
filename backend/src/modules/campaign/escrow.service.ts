import { Prisma, WorkStatus, CampaignEventActor } from '@prisma/client';
import prisma from '../../prisma';
import { AppError } from '../../middleware/error';
import { notificationService } from '../notifications/notification.service';
import { analyticsService } from '../analytics/analytics.service';
import { MessagingService } from '../messaging/messaging.service';
import { recordCampaignEventTx } from './campaign-events';
import { recordWalletTransaction } from '../wallet/wallet.ledger';
import { assertEscrowTransition } from './application-state-machine';
import { logActivity } from '../logging/activity.service';
import { ActivityAction, EntityType } from '../logging/logging.constants';

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
      if (!app) throw new AppError('Application not found', 404);

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
      if (!app) throw new AppError('Application not found', 404);

      if (app.escrowStatus === 'RELEASED') return { moved: false as const, app };
      if (!['HELD', 'RELEASE_PENDING', 'FROZEN'].includes(app.escrowStatus)) {
        throw new AppError(`Escrow is not in a releasable state (${app.escrowStatus})`, 409);
      }
      // A frozen (disputed) escrow only moves under admin resolution.
      if (app.escrowStatus === 'FROZEN' && actor.type !== 'ADMIN') {
        throw new AppError('This engagement is under dispute', 409);
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
}

export const escrowService = new EscrowService();
