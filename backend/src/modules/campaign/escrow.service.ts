import { Prisma, WorkStatus, CampaignEventActor } from '@prisma/client';
import prisma from '../../prisma';
import { AppError } from '../../middleware/error';
import { notificationService } from '../notifications/notification.service';
import { recordCampaignEventTx } from './campaign-events';
import { logActivity } from '../logging/activity.service';
import { ActivityAction, EntityType } from '../logging/logging.constants';

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
