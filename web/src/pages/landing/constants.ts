// Hex mirror of the tokens in src/index.css's @theme block — GSAP needs raw
// color strings (it can't consume Tailwind utility classes), so these two
// sources must be kept in sync by hand.
export const COLORS = {
  indigo: '#4F46E5',
  indigoDark: '#3730A3',
  orange: '#F97316',
} as const;

export const EASE = {
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

export const SECTION_IDS = {
  hero: 'hero',
  trust: 'trust',
  how: 'how',
  audience: 'audience',
  categories: 'categories',
  collaboration: 'collaboration',
  partners: 'partners',
  security: 'security',
  stories: 'stories',
  contact: 'contact',
} as const;

export const NAV_LINKS: { key: 'how' | 'audience' | 'categories' | 'security' | 'contact'; id: string }[] = [
  { key: 'how', id: SECTION_IDS.how },
  { key: 'audience', id: SECTION_IDS.audience },
  { key: 'categories', id: SECTION_IDS.categories },
  { key: 'security', id: SECTION_IDS.security },
  { key: 'contact', id: SECTION_IDS.contact },
];
