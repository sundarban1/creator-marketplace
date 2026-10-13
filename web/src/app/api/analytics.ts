/** Creator / business analytics — same endpoints mobile's analyticsService hits. */

import { apiRequest } from '../lib/apiClient';

export type AnalyticsRange = '7d' | '30d' | '90d' | '12mo' | 'all';

export interface CreatorAnalytics {
  range: AnalyticsRange;
  totals: {
    totalProfileViews: number;
    profileViewsInRange: number;
    profileViewsLast30Days: number;
    profileViewsTrendPct: number;
    totalEarnings: number;
    pendingEarnings: number;
    invitationsReceived: number;
    applicationsSubmitted: number;
    applicationsAccepted: number;
    applicationsRejected: number;
    activeCampaigns: number;
    completedCampaigns: number;
    averageRating: number;
    reviewCount: number;
    responseTimeAvgMins: number;
    completionRate: number;
    profileCompletion: { percent: number; missing: string[] };
  };
  campaignBreakdown: {
    invitationsReceived: number;
    applicationsSubmitted: number;
    accepted: number;
    rejected: number;
    active: number;
    completed: number;
  };
  referrals: { totalInvites: number; successfulReferrals: number; pendingRewards: number; rewardsEarned: number };
  charts: { earningsTrend: { bucket: string; amount: number }[] };
}

export interface BusinessAnalytics {
  range: AnalyticsRange;
  totals: {
    campaignsCreated: number;
    activeCampaigns: number;
    completedCampaigns: number;
    totalSpend: number;
    applicationsReceived: number;
    creatorsHired: number;
    averageRatingGiven: number;
    ratingsGivenCount: number;
    responseTimeAvgMins: number;
  };
  campaignStatus: { draft: number; active: number; paused: number; closed: number; cancelled: number };
  charts: {
    monthlySpending: { bucket: string; amount: number }[];
    applicationsReceived: { bucket: string; count: number }[];
  };
}

export function fetchCreatorAnalytics(range: AnalyticsRange, signal?: AbortSignal): Promise<CreatorAnalytics> {
  return apiRequest<CreatorAnalytics>('GET', '/api/creator/analytics', undefined, { signal, params: { range } }).then(
    (r) => r.data,
  );
}

export function fetchBusinessAnalytics(range: AnalyticsRange, signal?: AbortSignal): Promise<BusinessAnalytics> {
  return apiRequest<BusinessAnalytics>('GET', '/api/business/analytics', undefined, { signal, params: { range } }).then(
    (r) => r.data,
  );
}

/** "2026-10" → "Oct", "2026-10-05" → "5 Oct" — chart bucket labels. */
export function fmtBucket(bucket: string): string {
  const parts = bucket.split('-');
  if (parts.length === 3) return new Date(bucket).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const [y, m] = parts;
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'short' });
}

export const ANALYTICS_RANGES: AnalyticsRange[] = ['7d', '30d', '90d', '12mo', 'all'];
