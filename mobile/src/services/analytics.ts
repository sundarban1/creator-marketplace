import { request } from '@/lib/api';

export type AnalyticsRange = '7d' | '30d' | '90d' | '12mo' | 'all';

export interface ApiCreatorAnalytics {
  range: AnalyticsRange;
  totals: {
    totalProfileViews:      number;
    profileViewsInRange:    number;
    profileViewsLast30Days: number;
    profileViewsTrendPct:   number;
    totalEarnings:          number;
    pendingEarnings:        number;
    invitationsReceived:    number;
    applicationsSubmitted:  number;
    applicationsAccepted:   number;
    applicationsRejected:   number;
    activeCampaigns:        number;
    completedCampaigns:     number;
    averageRating:          number;
    reviewCount:            number;
    responseTimeAvgMins:    number;
    completionRate:         number;
    profileCompletion:      { percent: number; missing: string[] };
  };
  campaignBreakdown: {
    invitationsReceived:   number;
    applicationsSubmitted: number;
    accepted:  number;
    rejected:  number;
    active:    number;
    completed: number;
  };
  referrals: {
    totalInvites:        number;
    successfulReferrals: number;
    pendingRewards:      number;
    rewardsEarned:       number;
  };
  charts: {
    earningsTrend: { bucket: string; amount: number }[];
  };
}

export interface ApiBrandAnalytics {
  range: AnalyticsRange;
  totals: {
    campaignsCreated:     number;
    activeCampaigns:      number;
    completedCampaigns:   number;
    totalSpend:           number;
    applicationsReceived: number;
    creatorsHired:        number;
    averageRatingGiven:   number;
    ratingsGivenCount:    number;
    responseTimeAvgMins:  number;
  };
  campaignStatus: {
    draft: number; active: number; paused: number; closed: number; cancelled: number;
  };
  charts: {
    monthlySpending:      { bucket: string; amount: number }[];
    applicationsReceived: { bucket: string; count: number }[];
  };
}

export const analyticsService = {
  async getCreatorAnalytics(range: AnalyticsRange): Promise<ApiCreatorAnalytics> {
    const res = await request<ApiCreatorAnalytics>('GET', '/api/creator/analytics', undefined, { range });
    return res.data;
  },

  async getBusinessAnalytics(range: AnalyticsRange): Promise<ApiBrandAnalytics> {
    const res = await request<ApiBrandAnalytics>('GET', '/api/business/analytics', undefined, { range });
    return res.data;
  },
};
