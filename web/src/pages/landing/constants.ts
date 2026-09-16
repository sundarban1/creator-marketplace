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
  categories: 'categories',
  stories: 'stories',
  security: 'security',
  finalCta: 'get-started',
  contact: 'contact',
  oldWay: 'old-way',
  problems: 'problems',
  kolabWay: 'kolab-way',
  keyMessage: 'key-message',
  creatorStages: 'creator-stages',
  liveOnKolab: 'live-on-kolab',
} as const;

// `id` links scroll to a section on the landing page; `to` links navigate to a
// standalone route (react-router) instead.
export const NAV_LINKS: {
  key: 'discover' | 'services' | 'marketplace' | 'contact';
  id?: string;
  to?: string;
  offset?: number;
}[] = [
  { key: 'discover', id: SECTION_IDS.kolabWay },
  { key: 'services', id: SECTION_IDS.categories },
  // Opportunities/Creators/Businesses all live in one tabbed section now —
  // one nav entry for it rather than three links landing on the same spot.
  { key: 'marketplace', id: SECTION_IDS.liveOnKolab },
  // The footer's hairline top border sits right at #contact's own top edge,
  // which otherwise scrolls to right under the fixed LandingNav header (its
  // ~65px scrolled height) and lands past it, directly on the "Get in touch"
  // heading/form — a negative offset stops short so that hairline clears the
  // header and is visible before the form.
  { key: 'contact', id: SECTION_IDS.contact, offset: -80 },
];
