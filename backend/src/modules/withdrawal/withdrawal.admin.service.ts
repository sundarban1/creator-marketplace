import type { WithdrawalStatus } from '@prisma/client';
import prisma from '../../prisma';
import { AppError } from '../../middleware/error';
import { uploadImage } from '../../utils/cloudinary';
import { notificationService } from '../notifications/notification.service';
import { recordWalletTransaction } from '../wallet/wallet.ledger';
import { logAudit } from '../logging/audit.service';
import { AuditAction } from '../logging/logging.constants';
import { WithdrawalRepository } from './withdrawal.repository';
import { toAdminWithdrawalDetailDto, toAdminWithdrawalListDto } from './withdrawal.admin.dto';
import type { MarkWithdrawalPaidInput, RejectWithdrawalInput } from './withdrawal.admin.schema';

const VALID_STATUSES: WithdrawalStatus[] = ['PENDING', 'PROCESSING', 'PAID', 'REJECTED', 'CANCELLED'];

export class WithdrawalAdminService {
  private repo = new WithdrawalRepository();

  async list(page: number, limit: number, statusRaw?: string, search?: string) {
    const status = statusRaw && VALID_STATUSES.includes(statusRaw as WithdrawalStatus)
      ? (statusRaw as WithdrawalStatus)
      : undefined;
    const [{ rows, total }, counts] = await Promise.all([
      this.repo.list({ page, limit, status, search }),
      this.repo.countsByStatus(),
    ]);
    return { withdrawals: rows.map(toAdminWithdrawalListDto), total, counts };
  }

  async detail(id: string) {
    const w = await this.repo.findById(id);
    if (!w) throw new AppError('Withdrawal not found', 404);
    return toAdminWithdrawalDetailDto(w);
  }

  async startProcessing(id: string, adminId: string) {
    const w = await this.repo.findById(id);
    if (!w) throw new AppError('Withdrawal not found', 404);
    if (w.status !== 'PENDING') {
      throw new AppError(`Only a pending withdrawal can be moved to processing`, 400);
    }
    const updated = await this.repo.update(id, { status: 'PROCESSING', processedByAdminId: adminId });

    logAudit({ performedBy: adminId, action: AuditAction.WITHDRAWAL_PROCESSING, newValue: { withdrawalId: id } });
    notificationService.create({
      userId:  w.creator.userId,
      type:    'withdrawal_processing',
      title:   'Withdrawal Processing',
      body:    `Your withdrawal ${w.referenceCode} for Rs. ${w.amount.toLocaleString()} is now being processed.`,
      refId:   id,
      refType: 'withdrawal',
    }).catch(() => {});

    return toAdminWithdrawalDetailDto(updated);
  }

  async reject(id: string, adminId: string, input: RejectWithdrawalInput) {
    const w = await this.repo.findById(id);
    if (!w) throw new AppError('Withdrawal not found', 404);
    if (w.status === 'PAID')     throw new AppError('A paid withdrawal cannot be rejected', 400);
    if (w.status === 'REJECTED') throw new AppError('This withdrawal is already rejected', 400);
    if (w.status === 'CANCELLED') throw new AppError('This withdrawal was cancelled', 400);

    const updated = await this.repo.update(id, {
      status:             'REJECTED',
      rejectionReason:    input.reason,
      processedByAdminId: adminId,
      processedAt:        new Date(),
    });
    // The reservation releases automatically — a REJECTED withdrawal is no
    // longer counted in pendingWithdrawals, so withdrawableBalance recovers.

    logAudit({ performedBy: adminId, action: AuditAction.WITHDRAWAL_REJECTED, newValue: { withdrawalId: id, reason: input.reason } });
    notificationService.create({
      userId:  w.creator.userId,
      type:    'withdrawal_rejected',
      title:   'Withdrawal Rejected',
      body:    `Your withdrawal ${w.referenceCode} for Rs. ${w.amount.toLocaleString()} was rejected: ${input.reason}`,
      refId:   id,
      refType: 'withdrawal',
    }).catch(() => {});

    return toAdminWithdrawalDetailDto(updated);
  }

  async markPaid(id: string, adminId: string, input: MarkWithdrawalPaidInput, screenshotBuffer: Buffer) {
    // Pre-flight so we don't upload a screenshot for a withdrawal that can't be paid.
    const existing = await this.repo.findById(id);
    if (!existing) throw new AppError('Withdrawal not found', 404);
    if (existing.status === 'PAID')      throw new AppError('This withdrawal has already been marked paid', 409);
    if (existing.status === 'REJECTED')  throw new AppError('A rejected withdrawal cannot be paid', 400);
    if (existing.status === 'CANCELLED') throw new AppError('A cancelled withdrawal cannot be paid', 400);

    const screenshotUrl = await uploadImage(
      screenshotBuffer,
      'withdrawals/proofs',
      `wd_${id}_${Date.now()}`,
      [{ width: 1200, height: 1600, crop: 'limit' }],
    );

    // Atomic: lock the row, re-check status under the lock, flip to PAID and
    // debit the ledger together. The WalletTransaction (referenceId, type)
    // unique index is the second line of defense — a duplicate DEBIT throws
    // P2002 and rolls the whole transaction back.
    await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ status: WithdrawalStatus; amount: number; creatorId: string; method: string }[]>`
        SELECT status, amount, "creatorId", method FROM withdrawals WHERE id = ${id} FOR UPDATE`;
      const row = locked[0];
      if (!row) throw new AppError('Withdrawal not found', 404);
      if (row.status === 'PAID') throw new AppError('This withdrawal has already been marked paid', 409);
      if (row.status !== 'PENDING' && row.status !== 'PROCESSING') {
        throw new AppError(`Cannot mark a ${row.status.toLowerCase()} withdrawal as paid`, 400);
      }

      await tx.withdrawal.update({
        where: { id },
        data: {
          status:               'PAID',
          transactionReference: input.transactionReference,
          paymentDate:          input.paymentDate,
          screenshotUrl,
          adminNotes:           input.adminNotes ?? null,
          processedByAdminId:   adminId,
          processedAt:          new Date(),
        },
      });

      await recordWalletTransaction(tx, {
        creatorId:        row.creatorId,
        type:             'WITHDRAWAL',
        direction:        'DEBIT',
        amount:           row.amount,
        description:      `Withdrawal via ${row.method}`,
        referenceType:    'withdrawal',
        referenceId:      id,
        createdByAdminId: adminId,
      });
    }, { isolationLevel: 'Serializable' });

    const updated = await this.repo.findById(id);
    logAudit({
      performedBy: adminId,
      action:      AuditAction.WITHDRAWAL_PAID,
      newValue:    { withdrawalId: id, amount: updated!.amount, transactionReference: input.transactionReference },
    });
    notificationService.create({
      userId:  existing.creator.userId,
      type:    'withdrawal_paid',
      title:   'Withdrawal Completed',
      body:    `Your withdrawal ${updated!.referenceCode} of Rs. ${updated!.amount.toLocaleString()} via ${updated!.method} has been completed. Transfer ref: ${input.transactionReference}`,
      refId:   id,
      refType: 'withdrawal',
    }).catch(() => {});

    return toAdminWithdrawalDetailDto(updated!);
  }
}
