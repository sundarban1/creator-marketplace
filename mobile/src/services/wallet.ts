import { request } from '@/lib/api';

export interface ApiWalletSummary {
  totalEarned: number;
  pendingEarnings: number;
  /** Realized balance — still includes money reserved by in-flight withdrawals. */
  availableBalance: number;
  /** Reserved by PENDING/PROCESSING withdrawal requests. */
  pendingWithdrawals: number;
  /** availableBalance − pendingWithdrawals — what can actually be requested now. */
  withdrawableBalance: number;
  /** Smallest amount allowed per withdrawal request (Rs.). */
  minWithdrawal: number;
  /** Largest amount allowed in a single withdrawal request (Rs.). */
  maxWithdrawal: number;
  /** Max total that can be requested in a rolling 24h window (Rs.). */
  dailyLimit: number;
  /** Amount already requested in the current 24h window (Rs.). */
  dailyWithdrawalUsed: number;
  /** dailyLimit − dailyWithdrawalUsed — headroom left today (Rs.). */
  dailyWithdrawalLeft: number;
  /** True when today's requests leave less headroom than minWithdrawal — no more requests possible today. */
  dailyLimitReached: boolean;
  /** True while a PENDING/PROCESSING request exists — only one is allowed at a time. */
  hasPendingWithdrawal: boolean;
}

export type WithdrawalStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'CANCELLED';

export interface ApiWithdrawalSnapshot {
  type: string;
  label: string | null;
  accountName: string;
  bankName: string | null;
  branch: string | null;
  accountNumber: string | null;
  walletId: string | null;
}

export interface ApiWithdrawal {
  id: string;
  amount: number;
  method: string;
  status: WithdrawalStatus;
  /** Auto-generated request reference (e.g. "WD-A7K2QP9M"), set when the request is submitted. */
  referenceCode: string;
  payoutSnapshot: ApiWithdrawalSnapshot | null;
  /** External bank/wallet transfer id — only set once an admin marks it paid. */
  transactionReference: string | null;
  paymentDate: string | null;
  rejectionReason: string | null;
  processedAt: string | null;
  createdAt: string;
}

export type TransactionKind = 'CAMPAIGN_PAYOUT' | 'REFERRAL_REWARD' | 'REFERRAL_BONUS' | 'WITHDRAWAL' | 'ADJUSTMENT';

export interface ApiWalletTransaction {
  id: string;
  kind: TransactionKind;
  direction: 'CREDIT' | 'DEBIT';
  amount: number;
  /** 'COMPLETED' for ledger rows; the withdrawal's own status for in-flight requests. */
  status: string;
  title: string;
  /** The campaign name for a CAMPAIGN_PAYOUT row; null for every other kind. */
  campaignTitle: string | null;
  method: string | null;
  reference: string | null;
  /** Admin's transfer-proof screenshot for a PAID withdrawal; null otherwise. */
  proofUrl: string | null;
  createdAt: string;
}

export type PayoutMethodType = 'BANK' | 'ESEWA' | 'KHALTI';

export interface ApiPayoutMethod {
  id: string;
  type: PayoutMethodType;
  label: string | null;
  accountName: string;
  bankName: string | null;
  branch: string | null;
  accountNumber: string | null;
  walletId: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutMethodInput {
  type: PayoutMethodType;
  accountName: string;
  bankName?: string;
  branch?: string;
  accountNumber?: string;
  walletId?: string;
  label?: string;
  isDefault?: boolean;
}

const PAYOUT_METHODS_PATH = '/api/creator/wallet/payout-methods';

export const walletService = {
  async getSummary(): Promise<ApiWalletSummary> {
    const res = await request<ApiWalletSummary>('GET', '/api/creator/wallet');
    return res.data;
  },

  async createWithdrawal(amount: number, payoutMethodId: string): Promise<{ withdrawal: ApiWithdrawal } & ApiWalletSummary> {
    const res = await request<{ withdrawal: ApiWithdrawal } & ApiWalletSummary>(
      'POST', '/api/creator/wallet/withdrawals', { amount, payoutMethodId },
    );
    return res.data;
  },

  async listWithdrawals(): Promise<ApiWithdrawal[]> {
    const res = await request<ApiWithdrawal[]>('GET', '/api/creator/wallet/withdrawals');
    return res.data;
  },

  async getTransactions(): Promise<ApiWalletTransaction[]> {
    const res = await request<ApiWalletTransaction[]>('GET', '/api/creator/wallet/transactions');
    return res.data;
  },

  async listPayoutMethods(): Promise<ApiPayoutMethod[]> {
    const res = await request<ApiPayoutMethod[]>('GET', PAYOUT_METHODS_PATH);
    return res.data;
  },

  async createPayoutMethod(input: PayoutMethodInput): Promise<ApiPayoutMethod> {
    const res = await request<ApiPayoutMethod>('POST', PAYOUT_METHODS_PATH, input);
    return res.data;
  },

  async updatePayoutMethod(id: string, input: PayoutMethodInput): Promise<ApiPayoutMethod> {
    const res = await request<ApiPayoutMethod>('PUT', `${PAYOUT_METHODS_PATH}/${id}`, input);
    return res.data;
  },

  async deletePayoutMethod(id: string): Promise<void> {
    await request('DELETE', `${PAYOUT_METHODS_PATH}/${id}`);
  },
};
