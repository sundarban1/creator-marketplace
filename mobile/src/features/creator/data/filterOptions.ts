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

export const CATEGORY_META: Record<string, { icon: string; bg: string }> = {
  All:              { icon: 'star', bg: '#F5F3FF' },

  // New template-based categories
  'Restaurant Promotion':          { icon: 'utensils',       bg: '#FFF7ED' },
  'Café Promotion':                { icon: 'coffee',         bg: '#FFFBEB' },
  'Street Food / Local Food':      { icon: 'hamburger',      bg: '#FFF7ED' },
  'Hotel & Resort':                { icon: 'hotel',          bg: '#EFF6FF' },
  'Travel & Tourism':              { icon: 'mountain',       bg: '#EFF6FF' },
  'Fashion & Clothing Brand':      { icon: 'tshirt',         bg: '#FDF4FF' },
  'Beauty Salon & Spa':            { icon: 'spa',            bg: '#FFF0F5' },
  'Gym & Fitness':                 { icon: 'dumbbell',       bg: '#F0FDF4' },
  'Tech / Gadget Promotion':       { icon: 'mobile-alt',     bg: '#EFF6FF' },
  'Event Promotion':               { icon: 'calendar-alt',   bg: '#FDF4FF' },
  'New Business Opening':          { icon: 'store',          bg: '#FFFBEB' },
  'Product Launch':                { icon: 'rocket',         bg: '#FDF4FF' },
  'Education / Course':            { icon: 'graduation-cap', bg: '#FFFBEB' },
  'Real Estate Promotion':         { icon: 'home',           bg: '#F8FAFC' },
  'Retail Shop Promotion':         { icon: 'shopping-cart',  bg: '#FFFBEB' },
  'Discount / Offer Event':        { icon: 'tags',           bg: '#FFF7ED' },
  'Festival Event':                { icon: 'gift',           bg: '#FDF4FF' },
  'Food Delivery / Cloud Kitchen': { icon: 'motorcycle',     bg: '#FFF7ED' },

  // Legacy "Promote X" categories (from current seeder)
  'Promote Restaurant':          { icon: 'utensils', bg: '#FFF7ED' },
  'Promote Cafe':                { icon: 'coffee',   bg: '#FFFBEB' },
  'Promote Hotel':               { icon: 'hotel',    bg: '#EFF6FF' },
  'Promote Clothing Brand':      { icon: 'tshirt',   bg: '#FDF4FF' },
  'Promote Product':             { icon: 'box',      bg: '#F8FAFC' },
  'Promote Event':               { icon: 'calendar-alt', bg: '#FDF4FF' },
  'Promote Business Opening':    { icon: 'store',    bg: '#FFFBEB' },

  // Generic / API-returned categories
  Food:             { icon: 'utensils',       bg: '#FFF7ED' },
  Travel:           { icon: 'plane',          bg: '#EFF6FF' },
  Fashion:          { icon: 'tshirt',         bg: '#FDF4FF' },
  Beauty:           { icon: 'spa',            bg: '#FFF0F5' },
  Fitness:          { icon: 'dumbbell',       bg: '#F0FDF4' },
  Gaming:           { icon: 'gamepad',        bg: '#EDE9FE' },
  Tech:             { icon: 'microchip',      bg: '#EFF6FF' },
  Technology:       { icon: 'microchip',      bg: '#EFF6FF' },
  Adventure:        { icon: 'mountain',       bg: '#EFF6FF' },
  Education:        { icon: 'graduation-cap', bg: '#FFFBEB' },
  Lifestyle:        { icon: 'leaf',           bg: '#F0FDF4' },
  'Home & Living':  { icon: 'home',           bg: '#F8FAFC' },
  Wellness:         { icon: 'heartbeat',      bg: '#F0FDF4' },
  Music:            { icon: 'music',          bg: '#F5F3FF' },
  'Art & Design':   { icon: 'palette',        bg: '#FDF4FF' },
  Pets:             { icon: 'paw',            bg: '#FFF7ED' },
  Parenting:        { icon: 'baby',           bg: '#FFF0F5' },
  Automotive:       { icon: 'car',            bg: '#EFF6FF' },
  Finance:          { icon: 'wallet',         bg: '#FFFBEB' },
  Sustainability:   { icon: 'recycle',        bg: '#F0FDF4' },
  Photography:      { icon: 'camera',         bg: '#F5F3FF' },
  Sports:           { icon: 'futbol',         bg: '#EFF6FF' },
  'Film & TV':      { icon: 'film',           bg: '#F5F3FF' },
  Mindfulness:      { icon: 'brain',          bg: '#EDE9FE' },
  'Food & Drink':   { icon: 'wine-glass-alt', bg: '#FFF7ED' },
  Entertainment:    { icon: 'theater-masks',  bg: '#FDF4FF' },
  Hotel:            { icon: 'hotel',          bg: '#EFF6FF' },
  Hospitality:      { icon: 'concierge-bell', bg: '#EFF6FF' },
  Events:           { icon: 'calendar-alt',   bg: '#FDF4FF' },
  Skincare:         { icon: 'magic',          bg: '#FFF0F5' },
  Clothing:         { icon: 'tshirt',         bg: '#FDF4FF' },
  Cafe:             { icon: 'coffee',         bg: '#FFFBEB' },
  Coffee:           { icon: 'coffee',         bg: '#FFFBEB' },
  Restaurant:       { icon: 'utensils',       bg: '#FFF7ED' },
  Electronics:      { icon: 'mobile-alt',     bg: '#EFF6FF' },
  Instagram:        { icon: 'instagram',      bg: '#FFF0F5' },
  TikTok:           { icon: 'tiktok',         bg: '#F5F5F5' },
  YouTube:          { icon: 'youtube',        bg: '#FEF2F2' },
  'Twitter / X':    { icon: 'twitter',        bg: '#EFF6FF' },
  Facebook:         { icon: 'facebook',       bg: '#EFF6FF' },
};

export const DEFAULT_META = { icon: 'tag', bg: '#F5F3FF' };

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
