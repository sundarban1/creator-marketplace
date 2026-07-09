// Static v1 numbers — /api/admin/stats exists but is auth-gated behind Bearer
// tokens, so it can't be called from this public page without adding a new
// public backend endpoint (out of scope for this rebuild). Swap this file's
// values for a live fetch once that endpoint exists.
export const TRUST_STATS: { label: string; value: number; suffix: string; decimals?: number }[] = [
  { label: 'Verified Creators', value: 1000, suffix: '+' },
  { label: 'Active Brands', value: 250, suffix: '+' },
  { label: 'Campaigns Completed', value: 3200, suffix: '+' },
  { label: 'Average Rating', value: 4.8, suffix: '/5', decimals: 1 },
];
