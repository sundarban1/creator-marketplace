/**
 * Preset pills for the competition form. Values are stored as-is (English), the
 * same way free-text tags were, so creators see exactly what the organizer picked.
 */

export const MAX_OBJECTIVES = 3;
export const MAX_TAGS = 10; // server cap for contentFormats / skills

export const OBJECTIVE_OPTIONS = [
  'Brand Awareness', 'Product Promotion', 'Service Promotion', 'Social Awareness', 'Creative Content',
  'Audience Engagement', 'Sales & Conversions', 'Event Promotion', 'Talent Showcase', 'Community Engagement',
  'Social Impact', 'Environmental Awareness', 'Education & Awareness',
]; // + "Other (Custom)" — the picker's add-your-own pill

export const FORMAT_OPTIONS = [
  'Short-Form Video', 'Long-Form Video', 'Product Review', 'Promotional Video', 'Storytelling', 'Comedy / Skit',
  'Educational Content', 'Vlog', 'Tutorial / How-To', 'Unboxing', 'Before & After', 'Photography',
  'Graphic Design', 'Animation', 'User-Generated Content (UGC)',
]; // + "Other (Custom)"

export const SKILL_OPTIONS = [
  'Video Editing', 'Videography', 'Photography', 'Acting', 'Writing', 'Storytelling',
  'Graphic Design', 'Animation', 'Voiceover', 'Creativity', 'Presentation', 'Directing',
]; // + "Other" — the picker's add-your-own pill

export const CRITERIA_SUGGESTIONS = ['Creativity', 'Storytelling', 'Production quality', 'Brand fit', 'Originality', 'Audience engagement'];

// Objectives stay a single text column; each picked objective is one line.
export const parseObjectives = (s: string | null | undefined): string[] =>
  (s ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
export const serializeObjectives = (list: string[]): string | null => (list.length ? list.join('\n') : null);
