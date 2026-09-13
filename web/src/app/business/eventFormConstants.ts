// Kept in sync with BENEFIT_OPTIONS / EXCHANGE_OPTIONS in
// backend/src/modules/campaign-ai/campaign-ai.schema.ts and OFFERING_OPTIONS /
// EXCHANGE_OPTIONS / ROLE_TYPE_OPTIONS in mobile/src/app/create-campaign.tsx —
// same vocabulary the AI draft and the mobile app use for free events.
export const OFFERING_OPTIONS = ['Free Event Access', 'Food & Drinks', 'Free Products / Gifts', 'Free Service / Experience', 'Product Launch / Preview', 'Other'];
export const EXCHANGE_OPTIONS = [
  'Social media post', 'Reel / short video', 'Video content', 'Photos', 'Story mention',
  'Honest review', 'Event promotion (pre-event post)', 'Mention / tag the business',
  'Just attend & share organically', 'Other',
];
export const ROLE_TYPE_OPTIONS = ['Content Creators', 'UGC Creators', 'Influencers', 'Social Media Creators', 'Other'];

// Kept in sync with MIN_BUDGET_PER_CREATOR in mobile/src/app/create-campaign.tsx.
export const MIN_BUDGET_PER_CREATOR = 500;

export function isoInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
