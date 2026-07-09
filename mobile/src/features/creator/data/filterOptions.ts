export const CREATOR_CATEGORIES: { icon: string; label: string }[] = [
  { icon: 'utensils',       label: 'Food' },
  { icon: 'plane',          label: 'Travel' },
  { icon: 'tshirt',         label: 'Fashion' },
  { icon: 'spa',            label: 'Beauty' },
  { icon: 'dumbbell',       label: 'Fitness' },
  { icon: 'gamepad',        label: 'Gaming' },
  { icon: 'microchip',      label: 'Tech' },
  { icon: 'graduation-cap', label: 'Education' },
  { icon: 'leaf',           label: 'Lifestyle' },
  { icon: 'home',           label: 'Home & Living' },
  { icon: 'heartbeat',      label: 'Wellness' },
  { icon: 'music',          label: 'Music' },
  { icon: 'palette',        label: 'Art & Design' },
  { icon: 'paw',            label: 'Pets' },
  { icon: 'baby',           label: 'Parenting' },
  { icon: 'car',            label: 'Automotive' },
  { icon: 'wallet',         label: 'Finance' },
  { icon: 'recycle',        label: 'Sustainability' },
  { icon: 'camera',         label: 'Photography' },
  { icon: 'futbol',         label: 'Sports' },
  { icon: 'film',           label: 'Film & TV' },
  { icon: 'brain',          label: 'Mindfulness' },
  { icon: 'wine-glass-alt', label: 'Food & Drink' },
  { icon: 'theater-masks',  label: 'Entertainment' },
];

export const CATEGORY_META: Record<string, { icon: string; bg: string; color: string }> = {
  All:              { icon: 'star', bg: '#F5F3FF', color: '#FBBF24' },

  // New template-based categories
  'Restaurant Promotion':          { icon: 'utensils',       bg: '#FFF7ED', color: '#F97316' },
  'Café Promotion':                { icon: 'coffee',         bg: '#FFFBEB', color: '#92400E' },
  'Street Food / Local Food':      { icon: 'hamburger',      bg: '#FFF7ED', color: '#EA580C' },
  'Hotel & Resort':                { icon: 'hotel',          bg: '#EFF6FF', color: '#6366F1' },
  'Travel & Tourism':              { icon: 'mountain',       bg: '#EFF6FF', color: '#0891B2' },
  'Fashion & Clothing Brand':      { icon: 'tshirt',         bg: '#FDF4FF', color: '#EC4899' },
  'Beauty Salon & Spa':            { icon: 'spa',            bg: '#FFF0F5', color: '#D946EF' },
  'Gym & Fitness':                 { icon: 'dumbbell',       bg: '#F0FDF4', color: '#16A34A' },
  'Tech / Gadget Promotion':       { icon: 'mobile-alt',     bg: '#EFF6FF', color: '#38BDF8' },
  'Event Promotion':               { icon: 'calendar-alt',   bg: '#FDF4FF', color: '#F59E0B' },
  'New Business Opening':          { icon: 'store',          bg: '#FFFBEB', color: '#B45309' },
  'Product Launch':                { icon: 'rocket',         bg: '#FDF4FF', color: '#4338CA' },
  'Education / Course':            { icon: 'graduation-cap', bg: '#FFFBEB', color: '#F59E0B' },
  'Real Estate Promotion':         { icon: 'home',           bg: '#F8FAFC', color: '#0D9488' },
  'Retail Shop Promotion':         { icon: 'shopping-cart',  bg: '#FFFBEB', color: '#D97706' },
  'Discount / Offer Event':        { icon: 'tags',           bg: '#FFF7ED', color: '#FB923C' },
  'Festival Event':                { icon: 'gift',           bg: '#FDF4FF', color: '#DB2777' },
  'Food Delivery / Cloud Kitchen': { icon: 'motorcycle',     bg: '#FFF7ED', color: '#DC2626' },

  // Legacy "Promote X" categories (from current seeder)
  'Promote Restaurant':          { icon: 'utensils', bg: '#FFF7ED', color: '#F97316' },
  'Promote Cafe':                { icon: 'coffee',   bg: '#FFFBEB', color: '#92400E' },
  'Promote Hotel':               { icon: 'hotel',    bg: '#EFF6FF', color: '#6366F1' },
  'Promote Clothing Brand':      { icon: 'tshirt',   bg: '#FDF4FF', color: '#EC4899' },
  'Promote Product':             { icon: 'box',      bg: '#F8FAFC', color: '#78716C' },
  'Promote Event':               { icon: 'calendar-alt', bg: '#FDF4FF', color: '#F59E0B' },
  'Promote Business Opening':    { icon: 'store',    bg: '#FFFBEB', color: '#B45309' },

  // Generic / API-returned categories
  Food:             { icon: 'utensils',       bg: '#FFF7ED', color: '#F97316' },
  Travel:           { icon: 'plane',          bg: '#EFF6FF', color: '#0EA5E9' },
  Fashion:          { icon: 'tshirt',         bg: '#FDF4FF', color: '#EC4899' },
  Beauty:           { icon: 'spa',            bg: '#FFF0F5', color: '#D946EF' },
  Fitness:          { icon: 'dumbbell',       bg: '#F0FDF4', color: '#16A34A' },
  Gaming:           { icon: 'gamepad',        bg: '#EDE9FE', color: '#8B5CF6' },
  Tech:             { icon: 'microchip',      bg: '#EFF6FF', color: '#3B82F6' },
  Technology:       { icon: 'microchip',      bg: '#EFF6FF', color: '#3B82F6' },
  Adventure:        { icon: 'mountain',       bg: '#EFF6FF', color: '#0891B2' },
  Education:        { icon: 'graduation-cap', bg: '#FFFBEB', color: '#F59E0B' },
  Lifestyle:        { icon: 'leaf',           bg: '#F0FDF4', color: '#22C55E' },
  'Home & Living':  { icon: 'home',           bg: '#F8FAFC', color: '#0D9488' },
  Wellness:         { icon: 'heartbeat',      bg: '#F0FDF4', color: '#EF4444' },
  Music:            { icon: 'music',          bg: '#F5F3FF', color: '#A78BFA' },
  'Art & Design':   { icon: 'palette',        bg: '#FDF4FF', color: '#F472B6' },
  Pets:             { icon: 'paw',            bg: '#FFF7ED', color: '#CA8A04' },
  Parenting:        { icon: 'baby',           bg: '#FFF0F5', color: '#FB7185' },
  Automotive:       { icon: 'car',            bg: '#EFF6FF', color: '#2563EB' },
  Finance:          { icon: 'wallet',         bg: '#FFFBEB', color: '#059669' },
  Sustainability:   { icon: 'recycle',        bg: '#F0FDF4', color: '#10B981' },
  Photography:      { icon: 'camera',         bg: '#F5F3FF', color: '#334155' },
  Sports:           { icon: 'futbol',         bg: '#EFF6FF', color: '#0D9488' },
  'Film & TV':      { icon: 'film',           bg: '#F5F3FF', color: '#6D28D9' },
  Mindfulness:      { icon: 'brain',          bg: '#EDE9FE', color: '#7C3AED' },
  'Food & Drink':   { icon: 'wine-glass-alt', bg: '#FFF7ED', color: '#BE185D' },
  Entertainment:    { icon: 'theater-masks',  bg: '#FDF4FF', color: '#C026D3' },
  Hotel:            { icon: 'hotel',          bg: '#EFF6FF', color: '#6366F1' },
  Hospitality:      { icon: 'concierge-bell', bg: '#EFF6FF', color: '#4F46E5' },
  Events:           { icon: 'calendar-alt',   bg: '#FDF4FF', color: '#F59E0B' },
  Skincare:         { icon: 'magic',          bg: '#FFF0F5', color: '#A855F7' },
  Clothing:         { icon: 'tshirt',         bg: '#FDF4FF', color: '#EC4899' },
  Cafe:             { icon: 'coffee',         bg: '#FFFBEB', color: '#92400E' },
  Coffee:           { icon: 'coffee',         bg: '#FFFBEB', color: '#92400E' },
  Restaurant:       { icon: 'utensils',       bg: '#FFF7ED', color: '#F97316' },
  Electronics:      { icon: 'mobile-alt',     bg: '#EFF6FF', color: '#38BDF8' },
  Instagram:        { icon: 'instagram',      bg: '#FFF0F5', color: '#E1306C' },
  TikTok:           { icon: 'tiktok',         bg: '#F5F5F5', color: '#010101' },
  YouTube:          { icon: 'youtube',        bg: '#FEF2F2', color: '#FF0000' },
  'Twitter / X':    { icon: 'twitter',        bg: '#EFF6FF', color: '#1DA1F2' },
  Facebook:         { icon: 'facebook',       bg: '#EFF6FF', color: '#1877F2' },
};

export const DEFAULT_META = { icon: 'tag', bg: '#F5F3FF', color: '#6B7280' };

/** Strip "Promote " prefix for creator-facing display labels. */
export function displayCategory(label: string): string {
  if (label === 'All') return 'All';
  return label.replace(/^Promote\s+/i, '');
}

export const NEPAL_LOCATIONS = [
  'Kathmandu', 'Pokhara', 'Lalitpur', 'Bhaktapur',
  'Butwal', 'Biratnagar', 'Remote',
];

export const FILTER_TABS = ['New', 'Recommended', 'Trending', 'Ending Soon'];

export const PRICE_OPTIONS = [
  { key: 'any',      label: 'Any' },
  { key: 'under150', label: 'Under $150' },
  { key: '150to300', label: '$150 – $300' },
  { key: '300plus',  label: '$300+' },
];

export const TIME_OPTIONS = [
  { key: 'any', label: 'Any Time' },
  { key: '24h', label: 'Past 24 Hours' },
  { key: '1w',  label: 'Past Week' },
  { key: '1m',  label: 'Past Month' },
];

export const CARD_BG: Record<string, string> = {
  'Food & Drink':     '#F2E6DC',
  Food:               '#F2E6DC',
  Restaurant:         '#F2E6DC',
  'Health & Fitness': '#DCF2E6',
  Fitness:            '#DCF2E6',
  Fashion:            '#F2DCF0',
  Gaming:             '#DCE6F2',
  Education:          '#F2F2DC',
  Travel:             '#DCF2F2',
  Technology:         '#DCE8F2',
  Tech:               '#DCE8F2',
  Beauty:             '#F2DCE8',
  Wellness:           '#DCF2EA',
  Lifestyle:          '#EAF2DC',
  Sports:             '#DCF2E6',
  Events:             '#F2DCEF',
  Entertainment:      '#F2DCEF',
  Hotel:              '#DCE8F2',
  Hospitality:        '#DCE8F2',
};

export function cardBg(cat: string): string { return CARD_BG[cat] ?? '#EAEBF5'; }
