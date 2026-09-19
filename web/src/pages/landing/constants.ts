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
  creatorStory: 'creator-story',
  businessStory: 'business-story',
  aiDiscovery: 'ai-discovery',
  categories: 'categories',
  stories: 'stories',
  security: 'security',
  finalCta: 'get-started',
  contact: 'contact',
  oldWay: 'old-way',
  liveOnKolab: 'live-on-kolab',
} as const;

// `id` links scroll to a section on the landing page; `to` links navigate to a
// standalone route (react-router) instead.
export const NAV_LINKS: {
  key: 'discover' | 'forCreators' | 'forBusinesses' | 'howItWorks' | 'about' | 'trustSafety';
  id?: string;
  to?: string;
  offset?: number;
}[] = [
  { key: 'discover', id: SECTION_IDS.liveOnKolab },
  { key: 'forCreators', id: SECTION_IDS.creatorStory },
  { key: 'forBusinesses', id: SECTION_IDS.businessStory },
  { key: 'howItWorks', id: SECTION_IDS.security },
  { key: 'about', to: '/about' },
  { key: 'trustSafety', to: '/trust-and-safety' },
];
