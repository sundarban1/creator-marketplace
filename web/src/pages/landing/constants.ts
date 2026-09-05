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
  possibilities: 'possibilities',
  audience: 'audience',
  aiDiscovery: 'ai-discovery',
  opportunities: 'opportunities',
  categories: 'categories',
  stories: 'stories',
  security: 'security',
  finalCta: 'get-started',
  contact: 'contact',
} as const;

export const NAV_LINKS: { key: 'discover' | 'services' | 'opportunities' | 'contact'; id: string; offset?: number }[] = [
  { key: 'discover', id: SECTION_IDS.possibilities },
  { key: 'opportunities', id: SECTION_IDS.opportunities },
  { key: 'services', id: SECTION_IDS.categories },
  // The footer's hairline top border sits right at #contact's own top edge,
  // which otherwise scrolls to right under the fixed LandingNav header (its
  // ~65px scrolled height) and lands past it, directly on the "Get in touch"
  // heading/form — a negative offset stops short so that hairline clears the
  // header and is visible before the form.
  { key: 'contact', id: SECTION_IDS.contact, offset: -50 },
];
