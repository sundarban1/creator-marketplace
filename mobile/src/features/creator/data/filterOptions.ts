export const CATEGORY_META: Record<string, { emoji: string; bg: string }> = {
  All:              { emoji: '🌟', bg: '#F5F3FF' },
  Food:             { emoji: '🍽️', bg: '#FFF7ED' },
  Travel:           { emoji: '✈️', bg: '#EFF6FF' },
  Fashion:          { emoji: '👗', bg: '#FDF4FF' },
  Beauty:           { emoji: '💄', bg: '#FFF0F5' },
  Fitness:          { emoji: '💪', bg: '#F0FDF4' },
  Gaming:           { emoji: '🎮', bg: '#EDE9FE' },
  Tech:             { emoji: '💻', bg: '#EFF6FF' },
  Technology:       { emoji: '💻', bg: '#EFF6FF' },
  Beauty:           { emoji: '💄', bg: '#FFF0F5' },
  Adventure:        { emoji: '🏔️', bg: '#EFF6FF' },
  Education:        { emoji: '📚', bg: '#FFFBEB' },
  Lifestyle:        { emoji: '🌿', bg: '#F0FDF4' },
  'Home & Living':  { emoji: '🏠', bg: '#F8FAFC' },
  Wellness:         { emoji: '🧘', bg: '#F0FDF4' },
  Music:            { emoji: '🎵', bg: '#F5F3FF' },
  'Art & Design':   { emoji: '🎨', bg: '#FDF4FF' },
  Pets:             { emoji: '🐾', bg: '#FFF7ED' },
  Parenting:        { emoji: '👶', bg: '#FFF0F5' },
  Automotive:       { emoji: '🚗', bg: '#EFF6FF' },
  Finance:          { emoji: '💰', bg: '#FFFBEB' },
  Sustainability:   { emoji: '♻️', bg: '#F0FDF4' },
  Photography:      { emoji: '📷', bg: '#F5F3FF' },
  Sports:           { emoji: '⚽', bg: '#EFF6FF' },
  'Film & TV':      { emoji: '🎬', bg: '#F5F3FF' },
  Mindfulness:      { emoji: '🧠', bg: '#EDE9FE' },
  'Food & Drink':   { emoji: '🥂', bg: '#FFF7ED' },
  Entertainment:    { emoji: '🎭', bg: '#FDF4FF' },
  Instagram:        { emoji: '📸', bg: '#FFF0F5' },
  TikTok:           { emoji: '🎵', bg: '#F5F5F5' },
  YouTube:          { emoji: '▶️', bg: '#FEF2F2' },
  'Twitter / X':    { emoji: '🐦', bg: '#EFF6FF' },
  LinkedIn:         { emoji: '💼', bg: '#EFF6FF' },
  Facebook:         { emoji: '👥', bg: '#EFF6FF' },
};

export const DEFAULT_META = { emoji: '✨', bg: '#F5F3FF' };

export const NEPAL_LOCATIONS = [
  'Kathmandu', 'Pokhara', 'Lalitpur', 'Bhaktapur',
  'Butwal', 'Biratnagar', 'Remote',
];

export const FILTER_TABS = ['All', 'New', 'Recommended', 'Trending', 'Ending Soon'];

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
  'Food & Drink':   '#F2E6DC',
  Food:             '#F2E6DC',
  'Health & Fitness': '#DCF2E6',
  Fitness:          '#DCF2E6',
  Fashion:          '#F2DCF0',
  Gaming:           '#DCE6F2',
  Education:        '#F2F2DC',
  Travel:           '#DCF2F2',
  Technology:       '#DCE8F2',
  Tech:             '#DCE8F2',
  Beauty:           '#F2DCE8',
  Wellness:         '#DCF2EA',
  Lifestyle:        '#EAF2DC',
  Sports:           '#DCF2E6',
};

export function cardBg(cat: string): string { return CARD_BG[cat] ?? '#EAEBF5'; }
