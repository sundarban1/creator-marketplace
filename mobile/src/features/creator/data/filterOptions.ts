// Icon → accent color, shared by every screen that renders a FontAwesome5
// icon so the same glyph always gets the same thematic color instead of a
// uniform brand-purple everywhere.
export const ICON_COLORS: Record<string, string> = {
  utensils: '#F97316', coffee: '#92400E', hamburger: '#EA580C', 'wine-glass-alt': '#BE185D',
  motorcycle: '#DC2626', plane: '#0EA5E9', mountain: '#0891B2', hotel: '#6366F1',
  'concierge-bell': '#4F46E5', tshirt: '#EC4899', spa: '#D946EF', magic: '#A855F7',
  dumbbell: '#16A34A', gamepad: '#8B5CF6', microchip: '#3B82F6', 'mobile-alt': '#38BDF8',
  'graduation-cap': '#F59E0B', leaf: '#22C55E', home: '#0D9488', heartbeat: '#EF4444',
  music: '#A78BFA', palette: '#F472B6', paw: '#CA8A04', baby: '#FB7185', car: '#2563EB',
  wallet: '#059669', recycle: '#10B981', camera: '#334155', futbol: '#0D9488',
  film: '#6D28D9', brain: '#7C3AED', 'theater-masks': '#C026D3', rocket: '#4338CA',
  'shopping-cart': '#D97706', store: '#B45309', box: '#78716C', tag: '#6B7280',
  tags: '#FB923C', gift: '#DB2777', 'calendar-alt': '#F59E0B', star: '#FBBF24',
  instagram: '#E1306C', tiktok: '#010101', youtube: '#FF0000', twitter: '#1DA1F2',
  facebook: '#1877F2', 'briefcase-medical': '#0891B2', 'paper-plane': '#3B82F6',
  key: '#D97706', 'info-circle': '#3B82F6', 'exclamation-triangle': '#F59E0B',
  users: '#3B82F6', bookmark: '#EF4444', trophy: '#F59E0B', 'user-slash': '#EF4444',
  building: '#6366F1', bullseye: '#DC2626', 'calendar-day': '#F59E0B',
  'money-bill-wave': '#059669', 'map-marker-alt': '#DC2626', 'chart-bar': '#6366F1',
  'calendar-times': '#DC2626', filter: '#6366F1', inbox: '#6B7280',
  'hourglass-half': '#D97706', 'check-circle': '#16A34A', 'times-circle': '#DC2626',
  'clipboard-list': '#7C3AED', 'comment-dots': '#0EA5E9', 'envelope-open': '#3B82F6',
};

export function getIconColor(icon: string, fallback = '#6B7280'): string {
  return ICON_COLORS[icon] ?? fallback;
}

export const CREATOR_CATEGORIES: { icon: string; label: string; color: string }[] = [
  { icon: 'utensils',       label: 'Food',          color: ICON_COLORS.utensils },
  { icon: 'plane',          label: 'Travel',        color: ICON_COLORS.plane },
  { icon: 'tshirt',         label: 'Fashion',       color: ICON_COLORS.tshirt },
  { icon: 'spa',            label: 'Beauty',        color: ICON_COLORS.spa },
  { icon: 'dumbbell',       label: 'Fitness',       color: ICON_COLORS.dumbbell },
  { icon: 'gamepad',        label: 'Gaming',        color: ICON_COLORS.gamepad },
  { icon: 'microchip',      label: 'Tech',          color: ICON_COLORS.microchip },
  { icon: 'graduation-cap', label: 'Education',     color: ICON_COLORS['graduation-cap'] },
  { icon: 'leaf',           label: 'Lifestyle',     color: ICON_COLORS.leaf },
  { icon: 'home',           label: 'Home & Living', color: ICON_COLORS.home },
  { icon: 'heartbeat',      label: 'Wellness',      color: ICON_COLORS.heartbeat },
  { icon: 'music',          label: 'Music',         color: ICON_COLORS.music },
  { icon: 'palette',        label: 'Art & Design',  color: ICON_COLORS.palette },
  { icon: 'paw',            label: 'Pets',          color: ICON_COLORS.paw },
  { icon: 'baby',           label: 'Parenting',     color: ICON_COLORS.baby },
  { icon: 'car',            label: 'Automotive',    color: ICON_COLORS.car },
  { icon: 'wallet',         label: 'Finance',       color: ICON_COLORS.wallet },
  { icon: 'recycle',        label: 'Sustainability',color: ICON_COLORS.recycle },
  { icon: 'camera',         label: 'Photography',   color: ICON_COLORS.camera },
  { icon: 'futbol',         label: 'Sports',        color: ICON_COLORS.futbol },
  { icon: 'film',           label: 'Film & TV',     color: ICON_COLORS.film },
  { icon: 'brain',          label: 'Mindfulness',   color: ICON_COLORS.brain },
  { icon: 'wine-glass-alt', label: 'Food & Drink',  color: ICON_COLORS['wine-glass-alt'] },
  { icon: 'theater-masks',  label: 'Entertainment', color: ICON_COLORS['theater-masks'] },
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
