// Hex mirror of the landing page's violet/orange accent tokens in
// src/index.css's @theme block — GSAP needs raw color strings (it can't
// consume Tailwind utility classes), so these two sources must be kept in
// sync by hand. (Not the admin dashboard's indigo tokens — those live only
// in index.css and are never read by landing-page GSAP code.)
export const COLORS = {
  violet: '#7B5CF5',
  violetDark: '#5B2ED6',
  orange: '#F97316',
} as const;

export const EASE = {
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

export const SECTION_IDS = {
  hero: 'hero',
  showcase: 'showcase',
  trust: 'trust',
  // journey: 'journey', // Campaign Flow section commented out on the landing page for now
  audience: 'audience',
  // categories: 'categories', // Categories section commented out on the landing page for now
  collaboration: 'collaboration',
  partners: 'partners',
  // security: 'security', // Security section commented out on the landing page for now
  stories: 'stories',
  contact: 'contact',
} as const;

export const NAV_LINKS: { key: 'showcase' | 'audience' | 'journey' | 'collaboration' | 'contact'; id: string }[] = [
  { key: 'showcase', id: SECTION_IDS.showcase },
  { key: 'audience', id: SECTION_IDS.audience },
  // { key: 'journey', id: SECTION_IDS.journey }, // Campaign Flow section commented out on the landing page for now
  // { key: 'categories', id: SECTION_IDS.categories }, // Categories section commented out on the landing page for now
  // { key: 'security', id: SECTION_IDS.security }, // Security section commented out on the landing page for now
  { key: 'collaboration', id: SECTION_IDS.collaboration },
  { key: 'contact', id: SECTION_IDS.contact },
];
