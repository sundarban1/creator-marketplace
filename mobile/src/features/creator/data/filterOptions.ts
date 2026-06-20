export const CREATOR_CATEGORIES: { emoji: string; label: string }[] = [
  { emoji: '🍔', label: 'Food' },
  { emoji: '✈️', label: 'Travel' },
  { emoji: '👗', label: 'Fashion' },
  { emoji: '💄', label: 'Beauty' },
  { emoji: '💪', label: 'Fitness' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '📱', label: 'Tech' },
  { emoji: '📚', label: 'Education' },
  { emoji: '🌟', label: 'Lifestyle' },
  { emoji: '🏠', label: 'Home & Living' },
  { emoji: '🌿', label: 'Wellness' },
  { emoji: '🎵', label: 'Music' },
  { emoji: '🎨', label: 'Art & Design' },
  { emoji: '🐾', label: 'Pets' },
  { emoji: '🧸', label: 'Parenting' },
  { emoji: '🚗', label: 'Automotive' },
  { emoji: '💰', label: 'Finance' },
  { emoji: '🌍', label: 'Sustainability' },
  { emoji: '📷', label: 'Photography' },
  { emoji: '🏋️', label: 'Sports' },
  { emoji: '🎬', label: 'Film & TV' },
  { emoji: '🧘', label: 'Mindfulness' },
  { emoji: '🍷', label: 'Food & Drink' },
  { emoji: '🎪', label: 'Entertainment' },
];

export const CATEGORY_META: Record<string, { emoji: string; bg: string }> = {
  All:              { emoji: '🌟', bg: '#F5F3FF' },

  // New template-based categories
  'Restaurant Promotion':          { emoji: '🍛',  bg: '#FFF7ED' },
  'Café Promotion':                { emoji: '☕',  bg: '#FFFBEB' },
  'Street Food / Local Food':      { emoji: '🍜',  bg: '#FFF7ED' },
  'Hotel & Resort':                { emoji: '🏨',  bg: '#EFF6FF' },
  'Travel & Tourism':              { emoji: '🏔️', bg: '#EFF6FF' },
  'Fashion & Clothing Brand':      { emoji: '👗',  bg: '#FDF4FF' },
  'Beauty Salon & Spa':            { emoji: '💄',  bg: '#FFF0F5' },
  'Gym & Fitness':                 { emoji: '💪',  bg: '#F0FDF4' },
  'Tech / Gadget Promotion':       { emoji: '📱',  bg: '#EFF6FF' },
  'Event Promotion':               { emoji: '🎉',  bg: '#FDF4FF' },
  'New Business Opening':          { emoji: '🏬',  bg: '#FFFBEB' },
  'Product Launch':                { emoji: '🛍️', bg: '#FDF4FF' },
  'Education / Course':            { emoji: '🎓',  bg: '#FFFBEB' },
  'Real Estate Promotion':         { emoji: '🏠',  bg: '#F8FAFC' },
  'Retail Shop Promotion':         { emoji: '🛒',  bg: '#FFFBEB' },
  'Discount / Offer Campaign':     { emoji: '🎯',  bg: '#FFF7ED' },
  'Festival Campaign':             { emoji: '🎊',  bg: '#FDF4FF' },
  'Food Delivery / Cloud Kitchen': { emoji: '🍽️', bg: '#FFF7ED' },

  // Legacy "Promote X" categories (from current seeder)
  'Promote Restaurant':          { emoji: '🍛', bg: '#FFF7ED' },
  'Promote Cafe':                { emoji: '☕', bg: '#FFFBEB' },
  'Promote Hotel':               { emoji: '🏨', bg: '#EFF6FF' },
  'Promote Clothing Brand':      { emoji: '👗', bg: '#FDF4FF' },
  'Promote Product':             { emoji: '📦', bg: '#F8FAFC' },
  'Promote Event':               { emoji: '🎉', bg: '#FDF4FF' },
  'Promote Business Opening':    { emoji: '🏬', bg: '#FFFBEB' },

  // Generic / API-returned categories
  Food:             { emoji: '🍽️', bg: '#FFF7ED' },
  Travel:           { emoji: '✈️',  bg: '#EFF6FF' },
  Fashion:          { emoji: '👗',  bg: '#FDF4FF' },
  Beauty:           { emoji: '💄',  bg: '#FFF0F5' },
  Fitness:          { emoji: '💪',  bg: '#F0FDF4' },
  Gaming:           { emoji: '🎮',  bg: '#EDE9FE' },
  Tech:             { emoji: '💻',  bg: '#EFF6FF' },
  Technology:       { emoji: '💻',  bg: '#EFF6FF' },
  Adventure:        { emoji: '🏔️', bg: '#EFF6FF' },
  Education:        { emoji: '📚',  bg: '#FFFBEB' },
  Lifestyle:        { emoji: '🌿',  bg: '#F0FDF4' },
  'Home & Living':  { emoji: '🏠',  bg: '#F8FAFC' },
  Wellness:         { emoji: '🧘',  bg: '#F0FDF4' },
  Music:            { emoji: '🎵',  bg: '#F5F3FF' },
  'Art & Design':   { emoji: '🎨',  bg: '#FDF4FF' },
  Pets:             { emoji: '🐾',  bg: '#FFF7ED' },
  Parenting:        { emoji: '👶',  bg: '#FFF0F5' },
  Automotive:       { emoji: '🚗',  bg: '#EFF6FF' },
  Finance:          { emoji: '💰',  bg: '#FFFBEB' },
  Sustainability:   { emoji: '♻️', bg: '#F0FDF4' },
  Photography:      { emoji: '📷',  bg: '#F5F3FF' },
  Sports:           { emoji: '⚽',  bg: '#EFF6FF' },
  'Film & TV':      { emoji: '🎬',  bg: '#F5F3FF' },
  Mindfulness:      { emoji: '🧠',  bg: '#EDE9FE' },
  'Food & Drink':   { emoji: '🥂',  bg: '#FFF7ED' },
  Entertainment:    { emoji: '🎭',  bg: '#FDF4FF' },
  Hotel:            { emoji: '🏨',  bg: '#EFF6FF' },
  Hospitality:      { emoji: '🏨',  bg: '#EFF6FF' },
  Events:           { emoji: '🎉',  bg: '#FDF4FF' },
  Skincare:         { emoji: '✨',  bg: '#FFF0F5' },
  Clothing:         { emoji: '👗',  bg: '#FDF4FF' },
  Cafe:             { emoji: '☕',  bg: '#FFFBEB' },
  Coffee:           { emoji: '☕',  bg: '#FFFBEB' },
  Restaurant:       { emoji: '🍛',  bg: '#FFF7ED' },
  Electronics:      { emoji: '📱',  bg: '#EFF6FF' },
  Instagram:        { emoji: '📸',  bg: '#FFF0F5' },
  TikTok:           { emoji: '🎵',  bg: '#F5F5F5' },
  YouTube:          { emoji: '▶️', bg: '#FEF2F2' },
  'Twitter / X':    { emoji: '🐦',  bg: '#EFF6FF' },
  Facebook:         { emoji: '👥',  bg: '#EFF6FF' },
};

export const DEFAULT_META = { emoji: '✨', bg: '#F5F3FF' };

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
