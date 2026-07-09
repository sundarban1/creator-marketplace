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

