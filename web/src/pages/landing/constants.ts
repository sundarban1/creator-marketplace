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
  story: 'story',
  creators: 'creators',
  brands: 'brands',
  workflow: 'workflow',
  ai: 'ai',
  trust: 'trust',
  stories: 'stories',
  app: 'app',
  contact: 'contact',
} as const;

export const NAV_LINKS: { label: string; id: string }[] = [
  { label: 'Features', id: SECTION_IDS.story },
  { label: 'Creators', id: SECTION_IDS.creators },
  { label: 'Brands', id: SECTION_IDS.brands },
  { label: 'AI', id: SECTION_IDS.ai },
  { label: 'About', id: SECTION_IDS.trust },
  { label: 'Contact', id: SECTION_IDS.contact },
];

// Phone frame outer dimensions, shared by every PhoneFrame instance so the
// bezel/notch math and the screen-stack sizing never drift apart.
export const PHONE = {
  width: 280,
  height: 572,
  borderRadius: 50,
};
