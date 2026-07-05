import { request } from '@/lib/api';

export type ReferralStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED';

export interface ApiReferralItem {
  id: string;
  referredName: string;
  referredAvatarUrl: string | null;
  status: ReferralStatus;
  linkedAt: string;
  expiresAt: string;
  completedAt: string | null;
}

export interface ApiReferralOverview {
  code: string;
  rewardAmount: number;
  referredBy: { name: string | null } | null;
  referrals: ApiReferralItem[];
}

export const referralService = {
  async getOverview(): Promise<ApiReferralOverview> {
    const res = await request<ApiReferralOverview>('GET', '/api/creator/referral');
    return res.data;
  },

  async applyCode(code: string): Promise<void> {
    await request('POST', '/api/creator/referral/apply-code', { code });
  },
};
