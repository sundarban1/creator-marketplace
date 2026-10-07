import { api } from '../lib/apiClient';

/**
 * Share Opportunity — a creator passing an event/campaign to other creators.
 * Opportunity distribution + analytics attribution only: there is no reward,
 * points or referral code anywhere in this flow.
 */

export type SharePlatform = 'WHATSAPP' | 'SMS' | 'COPY_LINK' | 'NATIVE_SHARE' | 'OTHER';

export interface OpportunityShareLink {
  shareToken: string;
  shareUrl: string;
}

/** Tracked `/events/{slug}?ref=…` link for the signed-in creator (reused per platform). */
export function createOpportunityShare(campaignId: string, platform: SharePlatform): Promise<OpportunityShareLink> {
  return api<OpportunityShareLink>('POST', '/api/opportunity-shares', { campaignId, platform });
}

export type ShareVisit = { valid: false } | { valid: true; campaignId: string; receipt: string | null };

/** Records a share-link open. Always resolves — an unknown token is `{ valid: false }`. */
export function recordShareVisit(token: string): Promise<ShareVisit> {
  return api<ShareVisit>('POST', `/api/opportunity-shares/${encodeURIComponent(token)}/visit`);
}

/** Credits a just-created account to the share link it opened before registering. */
export function claimShareSignup(receipt: string): Promise<{ attributed: boolean }> {
  return api<{ attributed: boolean }>('POST', '/api/opportunity-shares/attribution/signup', { receipt });
}
