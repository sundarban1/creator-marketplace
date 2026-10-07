import { request } from '@/lib/api';

// Share Opportunity — a creator passing an event/campaign to other creators.
// Opportunity distribution + analytics attribution only: no reward, points or
// referral code anywhere in this flow (unlike services/referral.ts).

export type SharePlatform = 'WHATSAPP' | 'SMS' | 'COPY_LINK' | 'NATIVE_SHARE' | 'OTHER';

export interface OpportunityShareLink {
  shareToken: string;
  shareUrl: string;
}

export const opportunityShareService = {
  /** Tracked web link (`/events/{slug}?ref=…`); reused per creator × opportunity × platform. */
  async create(campaignId: string, platform: SharePlatform): Promise<OpportunityShareLink> {
    const res = await request<OpportunityShareLink>('POST', '/api/opportunity-shares', { campaignId, platform });
    return res.data;
  },
};
