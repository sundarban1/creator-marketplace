import { Prisma, RefundRequestStatus } from '@prisma/client';
import prisma from '../../prisma';
import { AppError } from '../../middleware/error';
import { HttpStatus } from '../../constants/httpStatus';
import { uploadImage } from '../../utils/cloudinary';
import { notificationService } from '../notifications/notification.service';
import { logAudit } from '../logging/audit.service';
import { AuditAction } from '../logging/logging.constants';
import { lockApplication } from '../campaign/escrow.service';
import { recordCampaignEventTx } from '../campaign/campaign-events';
import { getRefundDualApprovalThreshold } from '../campaign/escrow-config';
import { money, recordRefundEventTx, remainingRefundableInTx } from './refund.core';

// ───────────────────────────────────────────────────────────────────────────────
// Admin side of manual refunds (Payments → Refund Requests).
//
//   PENDING ─approve─▶ APPROVED ─start─▶ PROCESSING ─record transfer─▶ COMPLETED
//      │                  │                  │
//      └─reject─▶ REJECTED ◀──────────────────┤ fail ─▶ FAILED ─retry─▶ PROCESSING
//
// Money only "moves" (a REFUND / PARTIAL_REFUND payment_transactions row) on
// COMPLETED, which needs a verified destination and a transfer reference. Every
// transition is compare-and-set on the row under FOR UPDATE, and the ledger's
// unique `reference` is the backstop — a double-click, two admins, or a retried
// request can't complete a refund twice.
// ───────────────────────────────────────────────────────────────────────────────

export const TRANSFER_METHODS = ['BANK', 'ESEWA', 'KHALTI', 'CONNECTIPS', 'OTHER'] as const;
export type TransferMethod = (typeof TRANSFER_METHODS)[number];

const STATUSES: RefundRequestStatus[] = ['PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED', 'CANCELLED'];

export interface RefundListQuery {
  page: number;
  limit: number;
  status?: string;
  search?: string;
  reasonCode?: string;
  paymentMethod?: string;
  from?: string;
  to?: string;
  sort?: 'createdAt' | 'amount';
  order?: 'asc' | 'desc';
}

type Locked = {
  id: string; status: RefundRequestStatus; applicationId: string; campaignId: string; businessId: string;
  refundableAmount: Prisma.Decimal; partial: boolean; idempotencyKey: string; escrowStatusBefore: string | null;
  firstApprovedById: string | null; recipientVerifiedAt: Date | null; referenceCode: string;
};

async function lockRefund(tx: Prisma.TransactionClient, id: string): Promise<Locked> {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM refund_requests WHERE id = ${id} FOR UPDATE`;
  if (rows.length === 0) throw new AppError('Refund request not found', HttpStatus.NOT_FOUND);
  return tx.refundRequest.findUniqueOrThrow({
    where: { id },
    select: {
      id: true, status: true, applicationId: true, campaignId: true, businessId: true, refundableAmount: true,
      partial: true, idempotencyKey: true, escrowStatusBefore: true, firstApprovedById: true,
      recipientVerifiedAt: true, referenceCode: true,
    },
  });
}

function requireStatus(row: Locked, allowed: RefundRequestStatus[], action: string) {
  if (!allowed.includes(row.status)) {
    throw new AppError(`Cannot ${action} a refund request that is ${row.status.toLowerCase()}.`, HttpStatus.CONFLICT);
  }
}

const num = (d: Prisma.Decimal | null | undefined) => (d == null ? null : Number(d));

export class RefundAdminService {
  // ── List ────────────────────────────────────────────────────────────────────
  async list(q: RefundListQuery) {
    const where: Prisma.RefundRequestWhereInput = {};
    if (q.status && STATUSES.includes(q.status as RefundRequestStatus)) where.status = q.status as RefundRequestStatus;
    if (q.reasonCode) where.reasonCode = q.reasonCode;
    if (q.paymentMethod) where.paymentMethod = { equals: q.paymentMethod, mode: 'insensitive' };
    const range: Prisma.DateTimeFilter = {};
    if (q.from) { const d = new Date(q.from); if (!Number.isNaN(d.getTime())) range.gte = d; }
    if (q.to)   { const d = new Date(q.to);   if (!Number.isNaN(d.getTime())) range.lte = d; }
    if (range.gte || range.lte) where.createdAt = range;
    const term = q.search?.trim();
    if (term) {
      where.OR = [
        { referenceCode: { contains: term, mode: 'insensitive' } },
        { id: term },
        { applicationId: term },
        { paymentReference: { contains: term, mode: 'insensitive' } },
        { transferReference: { contains: term, mode: 'insensitive' } },
        { business: { businessName: { contains: term, mode: 'insensitive' } } },
      ];
    }
    const orderBy: Prisma.RefundRequestOrderByWithRelationInput =
      q.sort === 'amount' ? { refundableAmount: q.order === 'asc' ? 'asc' : 'desc' } : { createdAt: q.order === 'asc' ? 'asc' : 'desc' };

    const completedWhere: Prisma.RefundRequestWhereInput = {
      status: 'COMPLETED',
      ...(range.gte || range.lte ? { completedAt: range } : {}),
    };

    const [rows, total, counts, pending, completed] = await Promise.all([
      prisma.refundRequest.findMany({
        where, orderBy, skip: (q.page - 1) * q.limit, take: q.limit,
        include: {
          business: { select: { id: true, businessName: true } },
          campaign: { select: { id: true, title: true } },
        },
      }),
      prisma.refundRequest.count({ where }),
      prisma.refundRequest.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.refundRequest.aggregate({
        where: { status: { in: ['PENDING', 'APPROVED', 'PROCESSING', 'FAILED'] } },
        _count: { _all: true }, _sum: { refundableAmount: true },
      }),
      prisma.refundRequest.aggregate({ where: completedWhere, _count: { _all: true }, _sum: { transferAmount: true } }),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        referenceCode: r.referenceCode,
        status: r.status,
        reasonCode: r.reasonCode,
        reason: r.reason,
        partial: r.partial,
        currency: r.currency,
        refundableAmount: num(r.refundableAmount),
        transferAmount: num(r.transferAmount),
        paymentMethod: r.paymentMethod,
        paymentReference: r.paymentReference,
        applicationId: r.applicationId,
        business: r.business,
        campaign: r.campaign,
        needsSecondApproval: !!r.firstApprovedById && r.status === 'PENDING',
        createdAt: r.createdAt.toISOString(),
        completedAt: r.completedAt?.toISOString() ?? null,
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
      page: q.page,
      limit: q.limit,
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Record<string, number>,
      summary: {
        pendingCount: pending._count._all,
        pendingAmount: num(pending._sum.refundableAmount) ?? 0,
        completedCount: completed._count._all,
        completedAmount: num(completed._sum.transferAmount) ?? 0,
      },
    };
  }

  // ── Detail ──────────────────────────────────────────────────────────────────
  async detail(id: string) {
    const r = await prisma.refundRequest.findUnique({
      where: { id },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        business: {
          select: {
            id: true, businessName: true, phone: true, contactPersonName: true, isVerified: true,
            user: { select: { email: true, phone: true } },
          },
        },
        campaign: { select: { id: true, title: true, campaignType: true } },
        application: {
          select: {
            id: true, status: true, workStatus: true, escrowStatus: true, proposedRate: true, paymentMethod: true, paidAt: true,
            contentDeadline: true, originalContentDeadline: true, contentOverdueAt: true, contentGraceDeadline: true,
            extensionCount: true, deliverableClosedAt: true, deliverableClosedReason: true, submittedAt: true,
            creator: { select: { id: true, fullName: true } },
            extensions: { orderBy: { createdAt: 'asc' } },
            events: { where: { axis: { in: ['work', 'escrow'] } }, orderBy: { createdAt: 'asc' } },
            paymentTransactions: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });
    if (!r) throw new AppError('Refund request not found', HttpStatus.NOT_FOUND);

    const actorIds = new Set<string>();
    for (const e of r.events) if (e.actorId) actorIds.add(e.actorId);
    for (const e of r.application.events) if (e.actorId) actorIds.add(e.actorId);
    const users = await prisma.user.findMany({ where: { id: { in: [...actorIds] } }, select: { id: true, email: true, role: true } });
    const who = new Map(users.map((u) => [u.id, u.email]));

    const txs = r.application.paymentTransactions;
    const escrowIn = txs.find((t) => t.type === 'ESCROW_IN');
    const refundsDone = txs.filter((t) => t.type === 'REFUND' || t.type === 'PARTIAL_REFUND');
    const payouts = txs.filter((t) => t.type === 'PAYOUT');
    const remaining = money(escrowIn?.amount ?? 0)
      .minus(money(payouts.reduce((s, t) => s + t.amount, 0)))
      .minus(money(refundsDone.reduce((s, t) => s + t.amount, 0)));
    const threshold = await getRefundDualApprovalThreshold();

    return {
      id: r.id,
      referenceCode: r.referenceCode,
      status: r.status,
      reasonCode: r.reasonCode,
      reason: r.reason,
      partial: r.partial,
      currency: r.currency,
      initiatedByType: r.initiatedByType,
      initiatedBy: r.initiatedById ? who.get(r.initiatedById) ?? r.initiatedById : null,
      createdAt: r.createdAt.toISOString(),
      business: {
        id: r.business.id,
        name: r.business.businessName,
        contactPerson: r.business.contactPersonName,
        email: r.business.user?.email ?? null,
        phone: r.business.phone ?? r.business.user?.phone ?? null,
        isVerified: r.business.isVerified,
      },
      recipient: {
        name: r.recipientName,
        method: r.recipientMethod,
        account: r.recipientAccount,
        verifiedAt: r.recipientVerifiedAt?.toISOString() ?? null,
        verifiedBy: r.recipientVerifiedById ? who.get(r.recipientVerifiedById) ?? r.recipientVerifiedById : null,
      },
      payment: {
        paymentTransactionId: r.paymentTransactionId,
        paymentReference: r.paymentReference,
        method: r.paymentMethod,
        paidAt: r.application.paidAt?.toISOString() ?? null,
        originalAmount: num(r.originalAmount),
        previousRefunds: refundsDone.map((t) => ({ id: t.id, type: t.type, amount: t.amount, reference: t.reference, createdAt: t.createdAt.toISOString() })),
        remainingRefundable: Number(remaining.isNegative() ? 0 : remaining),
      },
      campaign: r.campaign,
      deliverable: {
        applicationId: r.application.id,
        creator: r.application.creator,
        proposalStatus: r.application.status,
        workStatus: r.application.workStatus,
        escrowStatus: r.application.escrowStatus,
        originalDeadline: (r.application.originalContentDeadline ?? r.application.contentDeadline)?.toISOString() ?? null,
        currentDeadline: r.application.contentDeadline?.toISOString() ?? null,
        overdueAt: r.application.contentOverdueAt?.toISOString() ?? null,
        closedAt: r.application.deliverableClosedAt?.toISOString() ?? null,
        closedReason: r.application.deliverableClosedReason,
        extensionCount: r.application.extensionCount,
        extensions: r.application.extensions.map((e) => ({
          id: e.id, kind: e.kind, status: e.status, reason: e.reason, proposedDeadline: e.proposedDeadline.toISOString(),
          approvedDeadline: e.approvedDeadline?.toISOString() ?? null, decisionNote: e.decisionNote,
          decidedByRole: e.decidedByRole, decidedAt: e.decidedAt?.toISOString() ?? null, businessConsent: e.businessConsent,
          createdAt: e.createdAt.toISOString(),
        })),
        history: r.application.events.map((e) => ({
          axis: e.axis, fromStatus: e.fromStatus, toStatus: e.toStatus, actorType: e.actorType,
          actor: e.actorId ? who.get(e.actorId) ?? null : null, reason: e.reason, createdAt: e.createdAt.toISOString(),
        })),
      },
      calculation: {
        originalAmount: num(r.originalAmount),
        deductionAmount: num(r.deductionAmount),
        refundableAmount: num(r.refundableAmount),
        note: r.calculationNote,
      },
      approval: {
        dualApprovalRequired: threshold > 0 && Number(r.refundableAmount) >= threshold,
        threshold,
        firstApprovedBy: r.firstApprovedById ? who.get(r.firstApprovedById) ?? r.firstApprovedById : null,
        firstApprovedAt: r.firstApprovedAt?.toISOString() ?? null,
        approvedBy: r.approvedById ? who.get(r.approvedById) ?? r.approvedById : null,
        approvedAt: r.approvedAt?.toISOString() ?? null,
        rejectedAt: r.rejectedAt?.toISOString() ?? null,
        rejectionReason: r.rejectionReason,
      },
      transfer: {
        method: r.transferMethod,
        amount: num(r.transferAmount),
        transferredAt: r.transferredAt?.toISOString() ?? null,
        reference: r.transferReference,
        proofUrl: r.proofUrl,
        adminNotes: r.adminNotes,
        processingStartedAt: r.processingStartedAt?.toISOString() ?? null,
        completedAt: r.completedAt?.toISOString() ?? null,
        completedBy: r.completedById ? who.get(r.completedById) ?? r.completedById : null,
        failedAt: r.failedAt?.toISOString() ?? null,
        failureReason: r.failureReason,
        attemptCount: r.attemptCount,
      },
      events: r.events.map((e) => ({
        id: e.id, action: e.action, fromStatus: e.fromStatus, toStatus: e.toStatus, actorType: e.actorType,
        actor: e.actorId ? who.get(e.actorId) ?? e.actorId : null, note: e.note, metadata: e.metadata, createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  // ── Recipient ───────────────────────────────────────────────────────────────
  async setRecipient(id: string, adminId: string, input: { recipientName: string; recipientMethod: TransferMethod; account: Record<string, string>; verified: boolean }) {
    if (!input.verified) throw new AppError('Confirm you have verified the recipient before saving.', HttpStatus.BAD_REQUEST);
    await prisma.$transaction(async (tx) => {
      const row = await lockRefund(tx, id);
      requireStatus(row, ['PENDING', 'APPROVED', 'FAILED'], 'change the recipient of');
      await tx.refundRequest.update({
        where: { id },
        data: {
          recipientName: input.recipientName, recipientMethod: input.recipientMethod,
          recipientAccount: input.account as Prisma.InputJsonValue,
          recipientVerifiedAt: new Date(), recipientVerifiedById: adminId,
        },
      });
      await recordRefundEventTx(tx, {
        refundRequestId: id, action: 'recipient_verified', fromStatus: row.status, toStatus: row.status,
        actorId: adminId, actorType: 'ADMIN', note: `${input.recipientMethod} recipient verified`,
      });
    });
    logAudit({ userId: adminId, actorType: 'ADMIN', action: AuditAction.REFUND_RECIPIENT_VERIFIED, entityId: id, metadata: { method: input.recipientMethod } });
    return this.detail(id);
  }

  // ── Approve (optionally with dual approval / reduced amount) ────────────────
  async approve(id: string, adminId: string, input: { note?: string | null; amount?: number | null }) {
    const threshold = await getRefundDualApprovalThreshold();
    const outcome = await prisma.$transaction(async (tx) => {
      const row = await lockRefund(tx, id);
      requireStatus(row, ['PENDING'], 'approve');

      let refundable = row.refundableAmount;
      if (input.amount != null) {
        const a = money(input.amount);
        if (a.lte(0)) throw new AppError('The approved amount must be greater than zero.', HttpStatus.BAD_REQUEST);
        if (a.gt(row.refundableAmount)) throw new AppError('The approved amount cannot exceed the refundable amount.', HttpStatus.BAD_REQUEST);
        refundable = a;
      }
      await lockApplication(tx, row.applicationId);
      const remaining = await remainingRefundableInTx(tx, row.applicationId);
      if (refundable.gt(remaining)) {
        throw new AppError(`Only Rs. ${remaining.toFixed(2)} of this payment is still refundable.`, HttpStatus.BAD_REQUEST);
      }

      const dual = threshold > 0 && refundable.gte(threshold);
      if (dual && !row.firstApprovedById) {
        await tx.refundRequest.update({
          where: { id }, data: { firstApprovedById: adminId, firstApprovedAt: new Date(), ...(input.amount != null ? this.amountChange(row, refundable) : {}) },
        });
        await recordRefundEventTx(tx, {
          refundRequestId: id, action: 'first_approval', fromStatus: 'PENDING', toStatus: 'PENDING',
          actorId: adminId, actorType: 'ADMIN', note: input.note ?? 'First approval — awaiting a second admin',
          metadata: { amount: refundable.toFixed(2), threshold },
        });
        return { final: false };
      }
      if (dual && row.firstApprovedById === adminId) {
        throw new AppError('Refunds of this size need a second, different admin to approve.', HttpStatus.FORBIDDEN);
      }
      const moved = await tx.refundRequest.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'APPROVED', approvedById: adminId, approvedAt: new Date(), ...(input.amount != null ? this.amountChange(row, refundable) : {}) },
      });
      if (moved.count === 0) throw new AppError('This refund request changed — reload and try again.', HttpStatus.CONFLICT);
      await recordRefundEventTx(tx, {
        refundRequestId: id, action: 'approved', fromStatus: 'PENDING', toStatus: 'APPROVED',
        actorId: adminId, actorType: 'ADMIN', note: input.note ?? null, metadata: { amount: refundable.toFixed(2) },
      });
      return { final: true };
    });
    logAudit({ userId: adminId, actorType: 'ADMIN', action: AuditAction.REFUND_APPROVED, entityId: id, metadata: { final: outcome.final, note: input.note, amount: input.amount } });
    if (outcome.final) await this.notifyBusiness(id, 'refund_approved', 'Refund approved', (r) => `Your refund ${r.referenceCode} for "${r.title}" was approved and will be transferred soon. Kolab will notify you when the transfer is completed.`);
    return this.detail(id);
  }

  private amountChange(row: Locked, refundable: Prisma.Decimal) {
    const cut = row.refundableAmount.minus(refundable);
    return cut.gt(0) ? { refundableAmount: refundable, deductionAmount: { increment: cut } } : {};
  }

  // ── Reject (mandatory reason) ───────────────────────────────────────────────
  async reject(id: string, adminId: string, input: { reason: string }) {
    const reason = input.reason?.trim();
    if (!reason) throw new AppError('A rejection reason is required.', HttpStatus.BAD_REQUEST);
    await prisma.$transaction(async (tx) => {
      const row = await lockRefund(tx, id);
      requireStatus(row, ['PENDING', 'APPROVED', 'FAILED'], 'reject');
      await lockApplication(tx, row.applicationId);
      const moved = await tx.refundRequest.updateMany({
        where: { id, status: row.status },
        data: { status: 'REJECTED', rejectedById: adminId, rejectedAt: new Date(), rejectionReason: reason },
      });
      if (moved.count === 0) throw new AppError('This refund request changed — reload and try again.', HttpStatus.CONFLICT);
      await recordRefundEventTx(tx, { refundRequestId: id, action: 'rejected', fromStatus: row.status, toStatus: 'REJECTED', actorId: adminId, actorType: 'ADMIN', note: reason });

      // A rejected refund leaves the escrow where it was before the request —
      // the funds stay held by Kolab for an admin to resolve.
      const app = await tx.application.findUniqueOrThrow({ where: { id: row.applicationId }, select: { escrowStatus: true, campaignId: true } });
      if (app.escrowStatus === 'REFUND_PENDING' && !row.partial) {
        const restore = (row.escrowStatusBefore ?? 'HELD') as 'HELD';
        await tx.application.update({ where: { id: row.applicationId }, data: { escrowStatus: restore } });
        await recordCampaignEventTx(tx, {
          campaignId: app.campaignId, applicationId: row.applicationId, axis: 'escrow', fromStatus: 'REFUND_PENDING', toStatus: restore,
          actorId: adminId, actorType: 'ADMIN', reason: `Refund request ${row.referenceCode} rejected: ${reason}`,
        });
      }
    });
    logAudit({ userId: adminId, actorType: 'ADMIN', action: AuditAction.REFUND_REJECTED, entityId: id, metadata: { reason } });
    await this.notifyBusiness(id, 'refund_rejected', 'Refund request update', (r) => `Your refund request ${r.referenceCode} for "${r.title}" was not approved. Contact support if you have questions.`);
    return this.detail(id);
  }

  // ── Start the manual transfer ───────────────────────────────────────────────
  async startProcessing(id: string, adminId: string, input: { note?: string | null }) {
    await prisma.$transaction(async (tx) => {
      const row = await lockRefund(tx, id);
      requireStatus(row, ['APPROVED', 'FAILED'], 'start processing');
      if (!row.recipientVerifiedAt) throw new AppError('Verify the refund recipient before starting the transfer.', HttpStatus.BAD_REQUEST);
      const moved = await tx.refundRequest.updateMany({
        where: { id, status: row.status },
        data: { status: 'PROCESSING', processingStartedById: adminId, processingStartedAt: new Date(), attemptCount: { increment: 1 }, failedAt: null, failureReason: null },
      });
      if (moved.count === 0) throw new AppError('This refund request changed — reload and try again.', HttpStatus.CONFLICT);
      await recordRefundEventTx(tx, {
        refundRequestId: id, action: row.status === 'FAILED' ? 'retry' : 'processing', fromStatus: row.status, toStatus: 'PROCESSING',
        actorId: adminId, actorType: 'ADMIN', note: input.note ?? null,
      });
    });
    logAudit({ userId: adminId, actorType: 'ADMIN', action: AuditAction.REFUND_PROCESSING, entityId: id });
    return this.detail(id);
  }

  // ── Record the confirmed transfer → COMPLETED ───────────────────────────────
  async complete(
    id: string,
    adminId: string,
    input: { transferMethod: TransferMethod; amount: number; currency?: string; transferredAt: Date; transferReference: string; adminNotes?: string | null },
    proof?: Buffer,
  ) {
    if ((input.currency ?? 'NPR').toUpperCase() !== 'NPR') throw new AppError('Refunds are recorded in NPR only.', HttpStatus.BAD_REQUEST);
    if (!input.transferReference?.trim()) throw new AppError('The bank or wallet transaction reference is required.', HttpStatus.BAD_REQUEST);
    if (input.transferredAt > new Date(Date.now() + 5 * 60_000)) throw new AppError('The transfer date cannot be in the future.', HttpStatus.BAD_REQUEST);
    const amount = money(input.amount);
    if (amount.lte(0)) throw new AppError('The transferred amount must be greater than zero.', HttpStatus.BAD_REQUEST);

    // Pre-flight before uploading a proof for a refund that can't complete.
    const pre = await prisma.refundRequest.findUnique({ where: { id }, select: { status: true } });
    if (!pre) throw new AppError('Refund request not found', HttpStatus.NOT_FOUND);
    if (pre.status === 'COMPLETED') throw new AppError('This refund has already been completed.', HttpStatus.CONFLICT);
    if (pre.status !== 'PROCESSING') throw new AppError('Start processing the refund before recording the transfer.', HttpStatus.CONFLICT);

    const proofUrl = proof
      ? await uploadImage(proof, 'refunds/proofs', `rf_${id}_${Date.now()}`, [{ width: 1200, height: 1600, crop: 'limit' }])
      : null;

    const result = await prisma.$transaction(async (tx) => {
      const row = await lockRefund(tx, id);
      if (row.status === 'COMPLETED') throw new AppError('This refund has already been completed.', HttpStatus.CONFLICT);
      requireStatus(row, ['PROCESSING'], 'complete');
      await lockApplication(tx, row.applicationId);

      if (amount.gt(row.refundableAmount)) {
        throw new AppError(`The transferred amount cannot exceed the approved refund of Rs. ${row.refundableAmount.toFixed(2)}.`, HttpStatus.BAD_REQUEST);
      }
      const remaining = await remainingRefundableInTx(tx, row.applicationId);
      if (amount.gt(remaining)) {
        throw new AppError(`Only Rs. ${remaining.toFixed(2)} of this payment is still refundable.`, HttpStatus.BAD_REQUEST);
      }

      const app = await tx.application.findUniqueOrThrow({
        where: { id: row.applicationId },
        select: { escrowStatus: true, workStatus: true, campaignId: true, proposedRate: true },
      });
      const fullRefund = !row.partial && amount.equals(row.refundableAmount);

      // The ledger row — its unique reference stops a second completion even
      // if every other guard were bypassed.
      await tx.paymentTransaction.create({
        data: {
          type: fullRefund ? 'REFUND' : 'PARTIAL_REFUND',
          amount: Number(amount),
          method: input.transferMethod.toLowerCase(),
          applicationId: row.applicationId,
          campaignId: row.campaignId,
          businessId: row.businessId,
          adminId,
          reference: row.idempotencyKey,
          metadata: {
            refundRequestId: id, referenceCode: row.referenceCode, transferReference: input.transferReference.trim(),
            transferredAt: input.transferredAt.toISOString(), currency: 'NPR',
          } as Prisma.InputJsonValue,
        },
      });
      const moved = await tx.refundRequest.updateMany({
        where: { id, status: 'PROCESSING' },
        data: {
          status: 'COMPLETED', transferMethod: input.transferMethod, transferAmount: amount,
          transferredAt: input.transferredAt, transferReference: input.transferReference.trim(),
          proofUrl, adminNotes: input.adminNotes?.trim() || null, completedById: adminId, completedAt: new Date(),
        },
      });
      if (moved.count === 0) throw new AppError('This refund has already been completed.', HttpStatus.CONFLICT);
      await recordRefundEventTx(tx, {
        refundRequestId: id, action: 'completed', fromStatus: 'PROCESSING', toStatus: 'COMPLETED', actorId: adminId, actorType: 'ADMIN',
        note: input.adminNotes ?? null,
        metadata: { amount: amount.toFixed(2), method: input.transferMethod, transferReference: input.transferReference.trim() },
      });

      if (app.escrowStatus === 'REFUND_PENDING') {
        const next = fullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
        await tx.application.update({ where: { id: row.applicationId }, data: { escrowStatus: next, paymentStatus: 'REFUNDED' } });
        await recordCampaignEventTx(tx, {
          campaignId: app.campaignId, applicationId: row.applicationId, axis: 'escrow', fromStatus: 'REFUND_PENDING', toStatus: next,
          actorId: adminId, actorType: 'ADMIN', reason: `Refund ${row.referenceCode} transferred`,
          metadata: { amount: amount.toFixed(2), refundRequestId: id },
        });
      }
      return { amount };
    }).catch((err) => {
      // The ledger's unique reference fired — someone else completed it first.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError('This refund has already been completed.', HttpStatus.CONFLICT);
      }
      throw err;
    });

    logAudit({
      userId: adminId, actorType: 'ADMIN', action: AuditAction.REFUND_COMPLETED, entityId: id,
      metadata: { amount: result.amount.toFixed(2), method: input.transferMethod, transferReference: input.transferReference, currency: 'NPR' },
    });
    await this.notifyBusiness(id, 'refund_completed', 'Refund completed',
      (r) => `Your refund ${r.referenceCode} of Rs. ${Number(result.amount).toLocaleString()} for "${r.title}" has been transferred. It may take a short time to appear in your account.`);
    return this.detail(id);
  }

  // ── Transfer failed ─────────────────────────────────────────────────────────
  async fail(id: string, adminId: string, input: { reason: string }) {
    const reason = input.reason?.trim();
    if (!reason) throw new AppError('Describe why the transfer failed.', HttpStatus.BAD_REQUEST);
    await prisma.$transaction(async (tx) => {
      const row = await lockRefund(tx, id);
      requireStatus(row, ['PROCESSING'], 'mark as failed');
      const moved = await tx.refundRequest.updateMany({
        where: { id, status: 'PROCESSING' }, data: { status: 'FAILED', failedAt: new Date(), failureReason: reason },
      });
      if (moved.count === 0) throw new AppError('This refund request changed — reload and try again.', HttpStatus.CONFLICT);
      await recordRefundEventTx(tx, { refundRequestId: id, action: 'failed', fromStatus: 'PROCESSING', toStatus: 'FAILED', actorId: adminId, actorType: 'ADMIN', note: reason });
    });
    logAudit({ userId: adminId, actorType: 'ADMIN', action: AuditAction.REFUND_FAILED, entityId: id, metadata: { reason } });
    await this.notifyBusiness(id, 'refund_failed', 'Refund transfer delayed',
      (r) => `We couldn't complete the transfer for your refund ${r.referenceCode} ("${r.title}") yet. Our team is resolving it — no action is needed unless we contact you.`);
    return this.detail(id);
  }

  // Business-facing notifications never include recipient details or admin notes.
  private async notifyBusiness(id: string, type: string, title: string, body: (r: { referenceCode: string; title: string }) => string) {
    const r = await prisma.refundRequest.findUnique({
      where: { id },
      select: { referenceCode: true, applicationId: true, campaignId: true, campaign: { select: { title: true } }, business: { select: { userId: true } } },
    });
    if (!r) return;
    notificationService.create({
      userId: r.business.userId, type, title, body: body({ referenceCode: r.referenceCode, title: r.campaign.title }),
      refId: r.campaignId, refType: 'campaign', applicationId: r.applicationId,
    }).catch(() => {});
  }
}

export const refundAdminService = new RefundAdminService();
