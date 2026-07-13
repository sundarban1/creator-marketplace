// Shared semantic accent palette for TabSlider tabs and matching status badges,
// so the same meaning (e.g. "Accepted", "Closed") always renders the same
// color everywhere it appears, on both the creator and business sides.
export const TabColors = {
  neutral:  { color: '#475569', bg: '#F1F5F9' }, // "All" / default
  positive: { color: '#16A34A', bg: '#F0FDF4' }, // accepted / active / paid
  warning:  { color: '#D97706', bg: '#FEF3C7' }, // pending / draft
  danger:   { color: '#DC2626', bg: '#FEF2F2' }, // rejected
  closed:   { color: '#6B7280', bg: '#F3F4F6' }, // closed (kept distinct from warning/draft)
  info:     { color: '#0369A1', bg: '#E0F2FE' }, // recommended / informational
  brand:    { color: '#4F46E5', bg: '#EEF2FF' }, // primary brand accent (free/open, trending, etc.)
} as const;

export type TabColorKey = keyof typeof TabColors;
