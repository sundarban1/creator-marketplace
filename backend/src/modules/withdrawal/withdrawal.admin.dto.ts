import type { Prisma, Withdrawal } from '@prisma/client';
import { maskAccountIdentifier } from '../payout-method/payout-method.dto';

type WithdrawalWithCreator = Withdrawal & {
  creator: { id: string; userId: string; fullName: string | null; avatarUrl: string | null };
};

export interface PayoutSnapshot {
  type?: string;
  label?: string | null;
  accountName?: string | null;
  bankName?: string | null;
  branch?: string | null;
  accountNumber?: string | null;
  walletId?: string | null;
}

function snapshot(w: Withdrawal): PayoutSnapshot {
  return (w.payoutSnapshot as Prisma.JsonObject as PayoutSnapshot) ?? {};
}

/** One-line masked account for list rows (spec §20 — never expose full numbers in lists). */
export function maskedAccountLine(w: Withdrawal): string {
  const s = snapshot(w);
  const id = maskAccountIdentifier(s.accountNumber ?? s.walletId ?? null);
  return [s.bankName, id].filter(Boolean).join(' · ') || (s.accountName ?? '');
}

export function toAdminWithdrawalListDto(w: WithdrawalWithCreator) {
  return {
    id:                   w.id,
    amount:               w.amount,
    method:               w.method,
    status:               w.status,
    account:              maskedAccountLine(w),
    accountName:          snapshot(w).accountName ?? null,
    referenceCode:        w.referenceCode,
    transactionReference: w.transactionReference,
    createdAt:            w.createdAt,
    processedAt:          w.processedAt,
    creator: {
      id:        w.creator.id,
      name:      w.creator.fullName,
      avatarUrl: w.creator.avatarUrl,
    },
  };
}

/** Full detail — admins get the unmasked payout account (spec §9). */
export function toAdminWithdrawalDetailDto(w: WithdrawalWithCreator) {
  return {
    ...toAdminWithdrawalListDto(w),
    payoutSnapshot:     snapshot(w),
    screenshotUrl:      w.screenshotUrl,
    paymentDate:        w.paymentDate,
    adminNotes:         w.adminNotes,
    rejectionReason:    w.rejectionReason,
    processedByAdminId: w.processedByAdminId,
  };
}
