import type { Withdrawal, WalletTransaction } from '@prisma/client';

// Shape returned by GET /api/creator/wallet/withdrawals — one row per request,
// carrying its lifecycle status and (once paid) the admin's transfer proof.
export function toWithdrawalDto(w: Withdrawal) {
  return {
    id:                   w.id,
    amount:               w.amount,
    method:               w.method,
    status:               w.status,
    referenceCode:        w.referenceCode,
    payoutSnapshot:       w.payoutSnapshot,
    transactionReference: w.transactionReference,
    paymentDate:          w.paymentDate,
    // Admin's transfer-proof screenshot, uploaded at "Mark as Paid".
    screenshotUrl:        w.screenshotUrl,
    rejectionReason:      w.rejectionReason,
    processedAt:          w.processedAt,
    createdAt:            w.createdAt,
  };
}

export type UnifiedTransactionKind =
  | 'CAMPAIGN_PAYOUT'
  | 'REFERRAL_REWARD'
  | 'REFERRAL_BONUS'
  | 'WITHDRAWAL'
  | 'ADJUSTMENT';

export interface UnifiedTransaction {
  id: string;
  kind: UnifiedTransactionKind;
  direction: 'CREDIT' | 'DEBIT';
  amount: number;
  // COMPLETED for realized ledger rows; the withdrawal's own status
  // (PENDING/PROCESSING/REJECTED/CANCELLED) for in-flight requests.
  status: string;
  title: string;
  method: string | null;
  reference: string | null;
  // The admin's transfer-proof screenshot for a PAID withdrawal (null otherwise).
  // Drives the creator's "View Transaction Details" preview in the wallet.
  proofUrl: string | null;
  createdAt: Date;
}

// Unified statement: realized ledger rows, plus withdrawal requests that
// haven't landed in the ledger yet (a PAID withdrawal is represented by its
// WITHDRAWAL ledger row, so it is never double-counted here).
const IN_FLIGHT_STATUSES = ['PENDING', 'PROCESSING', 'REJECTED', 'CANCELLED'];

export function buildUnifiedStatement(
  ledger: WalletTransaction[],
  withdrawals: Withdrawal[],
): UnifiedTransaction[] {
  const withdrawalById = new Map(withdrawals.map((w) => [w.id, w]));

  const ledgerItems: UnifiedTransaction[] = ledger
    .filter((tx) => tx.status === 'COMPLETED')
    .map((tx) => {
      const w = tx.referenceType === 'withdrawal' && tx.referenceId
        ? withdrawalById.get(tx.referenceId)
        : undefined;
      return {
        id:        tx.id,
        kind:      tx.type as UnifiedTransactionKind,
        direction: tx.direction,
        amount:    tx.amount,
        status:    'COMPLETED',
        title:     tx.description,
        method:    w?.method ?? null,
        reference: w?.referenceCode ?? w?.transactionReference ?? null,
        proofUrl:  w?.screenshotUrl ?? null,
        createdAt: tx.createdAt,
      };
    });

  const withdrawalItems: UnifiedTransaction[] = withdrawals
    .filter((w) => IN_FLIGHT_STATUSES.includes(w.status))
    .map((w) => ({
      id:        w.id,
      kind:      'WITHDRAWAL',
      direction: 'DEBIT',
      amount:    w.amount,
      status:    w.status,
      title:     `Withdrawal via ${w.method}`,
      method:    w.method,
      reference: w.referenceCode,
      proofUrl:  null,
      createdAt: w.createdAt,
    }));

  return [...ledgerItems, ...withdrawalItems].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}
