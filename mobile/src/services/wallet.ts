import { request } from '@/lib/api';

export interface ApiWalletSummary {
  totalEarned: number;
  pendingEarnings: number;
  availableBalance: number;
  paymentMethods: string[];
}

export interface ApiWithdrawal {
  id: string;
  amount: number;
  method: string;
  createdAt: string;
}

export const walletService = {
  async getSummary(): Promise<ApiWalletSummary> {
    const res = await request<ApiWalletSummary>('GET', '/api/creator/wallet');
    return res.data;
  },

  async withdraw(amount: number, method: string): Promise<ApiWalletSummary> {
    const res = await request<ApiWalletSummary>('POST', '/api/creator/wallet/withdraw', { amount, method });
    return res.data;
  },

  async getTransactions(): Promise<ApiWithdrawal[]> {
    const res = await request<ApiWithdrawal[]>('GET', '/api/creator/wallet/transactions');
    return res.data;
  },
};
