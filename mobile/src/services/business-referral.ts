import { request } from '@/lib/api';

export type BusinessReferralStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED';

export interface ApiBusinessReferralItem {
  id: string;
  referredName: string;
  referredLogoUrl: string | null;
  status: BusinessReferralStatus;
  linkedAt: string;
  expiresAt: string;
  completedAt: string | null;
}

export interface ApiBusinessReferralOverview {
  code: string;
  rewardAmount: number;
  referredBy: { name: string | null } | null;
  referrals: ApiBusinessReferralItem[];
}

export const businessReferralService = {
  async getOverview(): Promise<ApiBusinessReferralOverview> {
    const res = await request<ApiBusinessReferralOverview>('GET', '/api/business/referral');
    return res.data;
  },

  async applyCode(code: string): Promise<void> {
    await request('POST', '/api/business/referral/apply-code', { code });
  },

  async resendCode(id: string): Promise<void> {
    await request('POST', `/api/business/referral/${id}/resend`);
  },
};
