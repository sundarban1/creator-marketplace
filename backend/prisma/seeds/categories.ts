import { PrismaClient, CategoryScope } from '@prisma/client';

const BG_COLORS = ['#f3e8ff', '#dbeafe', '#dcfce7', '#fce7f3', '#fef9c3', '#e0f2fe', '#fef3c7', '#ede9fe', '#fee2e2', '#d1fae5'];

// Cycled per-row so we don't have to hand-pick a color for every individual
// role below — visually distinct enough across a ~10-item group without the
// upkeep of a bespoke hex per row.
const ICON_COLORS = [
  '#DB2777', '#2563EB', '#7C3AED', '#0D9488', '#F59E0B', '#EC4899', '#D946EF', '#0EA5E9',
  '#F97316', '#3B82F6', '#059669', '#16A34A', '#C026D3', '#DC2626', '#65A30D', '#B45309',
];

// FontAwesome5 icon name + accent color, matching the palette already used
// throughout the mobile app (mobile/src/features/creator/data/filterOptions.ts's ICON_COLORS).
// BOTH-scope rows below are content/industry niches (Nepal-storefront-type,
// curated for the Itahari launch) — shared by creator campaign-prefs, business
// "What industry are you in?" (asked only when their onboarding purpose is
// Brand/Marketing or Content Creation — see BusinessPurpose in schema.prisma),
// and by name in mobile/src/app/create-campaign.tsx's PROMPT_EXAMPLES_BY_CATEGORY
// and mobile/src/features/creator/data/templateImages.ts — renaming/removing a
// row here silently drops that row's curated prompt examples/template image,
// so treat these names as stable; add new ones instead of renaming existing.
// CREATOR-scope rows are provider *roles* (photographer, dancer, event planner, ...) —
// a distinct taxonomy answering "what do they do", shared by both provider
// onboarding ("What do you offer?") and business onboarding ("What are you
// looking for?"), since the matching works both ways. Grouped into `group`
// sections (10 broad categories, e.g. "Photography", "Events") for the picker
// UI — admins can add more roles under any existing group, or new groups
// entirely, from the web admin's Categories page. Only CREATOR-scope, strict
// (not CREATOR-or-BOTH) categories are usable for Service.categoryId — see
// service.service.ts's assertCategoryUsable and category.repository.ts's
// `strict` param.
const INDUSTRY_CATEGORIES: { icon: string; color: string; name: string; key: string; scope: CategoryScope }[] = [
  { icon: 'utensils',          color: '#F97316', name: 'Restaurants',              key: 'restaurants',            scope: 'BOTH' },
  { icon: 'coffee',            color: '#A16207', name: 'Cafés',                    key: 'cafes',                  scope: 'BOTH' },
  { icon: 'hotel',             color: '#0EA5E9', name: 'Hotels',                   key: 'hotels',                 scope: 'BOTH' },
  { icon: 'umbrella-beach',    color: '#06B6D4', name: 'Resorts',                  key: 'resorts',                scope: 'BOTH' },
  { icon: 'plane',             color: '#0284C7', name: 'Travel & Tourism',         key: 'travel-tourism',         scope: 'BOTH' },
  { icon: 'hiking',            color: '#65A30D', name: 'Trekking & Adventure',     key: 'trekking-adventure',     scope: 'BOTH' },
  { icon: 'tshirt',            color: '#EC4899', name: 'Fashion & Clothing',       key: 'fashion-clothing',       scope: 'BOTH' },
  { icon: 'shoe-prints',       color: '#DB2777', name: 'Footwear',                 key: 'footwear',               scope: 'BOTH' },
  { icon: 'spa',               color: '#D946EF', name: 'Beauty & Cosmetics',       key: 'beauty-cosmetics',       scope: 'BOTH' },
  { icon: 'tint',               color: '#F472B6', name: 'Skincare & Personal Care', key: 'skincare-personal-care', scope: 'BOTH' },
  { icon: 'gem',                color: '#7C3AED', name: 'Jewellery & Accessories',  key: 'jewellery-accessories',  scope: 'BOTH' },
  { icon: 'shopping-bag',       color: '#D97706', name: 'Retail & Shopping',        key: 'retail-shopping',        scope: 'BOTH' },
  { icon: 'shopping-cart',      color: '#EA580C', name: 'E-commerce',               key: 'ecommerce',              scope: 'BOTH' },
  { icon: 'hamburger',          color: '#B45309', name: 'Food & Beverage Brands',   key: 'food-beverage-brands',   scope: 'BOTH' },
  { icon: 'glass-cheers',       color: '#C026D3', name: 'Events & Entertainment',   key: 'events-entertainment',   scope: 'BOTH' },
  { icon: 'dumbbell',           color: '#16A34A', name: 'Fitness & Wellness',       key: 'fitness-wellness',       scope: 'BOTH' },
  { icon: 'graduation-cap',     color: '#F59E0B', name: 'Education & Training',     key: 'education-training',     scope: 'BOTH' },
  { icon: 'mobile-alt',         color: '#3B82F6', name: 'Electronics & Mobile',     key: 'electronics-mobile',     scope: 'BOTH' },
  { icon: 'laptop-code',        color: '#2563EB', name: 'Technology & Software',    key: 'technology-software',    scope: 'BOTH' },
  { icon: 'car',                color: '#475569', name: 'Automotive',               key: 'automotive',             scope: 'BOTH' },
  { icon: 'building',           color: '#0D9488', name: 'Real Estate & Property',   key: 'real-estate-property',   scope: 'BOTH' },
  { icon: 'university',         color: '#059669', name: 'Banking & FinTech',        key: 'banking-fintech',        scope: 'BOTH' },
  { icon: 'wifi',               color: '#0891B2', name: 'Internet & Telecom',       key: 'internet-telecom',       scope: 'BOTH' },
  { icon: 'briefcase-medical',  color: '#DC2626', name: 'Healthcare & Medical',     key: 'healthcare-medical',     scope: 'BOTH' },
  { icon: 'couch',              color: '#9333EA', name: 'Home & Furniture',         key: 'home-furniture',         scope: 'BOTH' },
];

// Provider roles (CREATOR scope) — "What do you offer?" / "What are you
// looking for?" on onboarding, grouped into 10 broad categories. Colors are
// cycled from ICON_COLORS below rather than hand-picked per row.
const PROVIDER_CATEGORIES: { icon: string; name: string; key: string; scope: CategoryScope; group: string }[] = [
  { icon: 'hashtag',        name: 'Content Creator',       key: 'content-creator',       scope: 'CREATOR', group: 'Content & Creator' },
  { icon: 'mobile-alt',     name: 'UGC Creator',           key: 'ugc-creator',           scope: 'CREATOR', group: 'Content & Creator' },
  { icon: 'thumbs-up',      name: 'Influencer',            key: 'influencer',            scope: 'CREATOR', group: 'Content & Creator' },
  { icon: 'share-alt',      name: 'Social Media Creator',  key: 'social-media-creator',  scope: 'CREATOR', group: 'Content & Creator' },

  { icon: 'camera',         name: 'Photographer',          key: 'photographer',          scope: 'CREATOR', group: 'Photography' },
  { icon: 'camera-retro',   name: 'Product Photographer',  key: 'product-photographer',  scope: 'CREATOR', group: 'Photography' },
  { icon: 'images',         name: 'Event Photographer',    key: 'event-photographer',    scope: 'CREATOR', group: 'Photography' },
  { icon: 'ring',           name: 'Wedding Photographer',  key: 'wedding-photographer',  scope: 'CREATOR', group: 'Photography' },

  { icon: 'video',          name: 'Videographer',          key: 'videographer',          scope: 'CREATOR', group: 'Video & Production' },
  { icon: 'photo-video',    name: 'Video Producer',        key: 'video-producer',        scope: 'CREATOR', group: 'Video & Production' },
  { icon: 'film',           name: 'Video Editor',          key: 'video-editor',          scope: 'CREATOR', group: 'Video & Production' },
  { icon: 'video',          name: 'Cinematographer',       key: 'cinematographer',       scope: 'CREATOR', group: 'Video & Production' },
  { icon: 'satellite',      name: 'Drone Operator',        key: 'drone-operator',        scope: 'CREATOR', group: 'Video & Production' },

  { icon: 'theater-masks',  name: 'Actor / Actress',       key: 'actor-actress',         scope: 'CREATOR', group: 'Performance & Entertainment' },
  { icon: 'walking',        name: 'Dancer',                key: 'dancer',                scope: 'CREATOR', group: 'Performance & Entertainment' },
  { icon: 'shoe-prints',    name: 'Choreographer',         key: 'choreographer',         scope: 'CREATOR', group: 'Performance & Entertainment' },
  { icon: 'laugh',          name: 'Comedian',              key: 'comedian',              scope: 'CREATOR', group: 'Performance & Entertainment' },
  { icon: 'star',           name: 'Performer',             key: 'performer',             scope: 'CREATOR', group: 'Performance & Entertainment' },
  { icon: 'magic',          name: 'Magician',              key: 'magician',              scope: 'CREATOR', group: 'Performance & Entertainment' },

  { icon: 'microphone-alt', name: 'Singer',                key: 'singer',                scope: 'CREATOR', group: 'Music & Audio' },
  { icon: 'music',          name: 'Musician',              key: 'musician',              scope: 'CREATOR', group: 'Music & Audio' },
  { icon: 'headphones',     name: 'DJ',                    key: 'dj',                    scope: 'CREATOR', group: 'Music & Audio' },
  { icon: 'users',          name: 'Band',                  key: 'band',                  scope: 'CREATOR', group: 'Music & Audio' },
  { icon: 'microphone',     name: 'Voice Artist',          key: 'voice-artist',          scope: 'CREATOR', group: 'Music & Audio' },
  { icon: 'volume-up',      name: 'Sound / Audio',         key: 'sound-audio',           scope: 'CREATOR', group: 'Music & Audio' },

  { icon: 'star',           name: 'Model',                 key: 'model',                 scope: 'CREATOR', group: 'Fashion & Beauty' },
  { icon: 'magic',          name: 'Makeup Artist',         key: 'makeup-artist',         scope: 'CREATOR', group: 'Fashion & Beauty' },
  { icon: 'cut',            name: 'Hair Stylist',          key: 'hair-stylist',          scope: 'CREATOR', group: 'Fashion & Beauty' },
  { icon: 'tshirt',         name: 'Fashion Stylist',       key: 'fashion-stylist',       scope: 'CREATOR', group: 'Fashion & Beauty' },

  { icon: 'microphone',     name: 'Host / MC',             key: 'host-mc',               scope: 'CREATOR', group: 'Hosting & Presentation' },
  { icon: 'broadcast-tower', name: 'Presenter',            key: 'presenter',             scope: 'CREATOR', group: 'Hosting & Presentation' },
  { icon: 'bullhorn',       name: 'Speaker',               key: 'speaker',               scope: 'CREATOR', group: 'Hosting & Presentation' },
  { icon: 'comments',       name: 'Interviewer',           key: 'interviewer',           scope: 'CREATOR', group: 'Hosting & Presentation' },
  { icon: 'podcast',        name: 'Podcaster',             key: 'podcaster',             scope: 'CREATOR', group: 'Hosting & Presentation' },

  { icon: 'palette',        name: 'Graphic Designer',      key: 'graphic-designer',      scope: 'CREATOR', group: 'Creative & Design' },
  { icon: 'pen-nib',        name: 'Illustrator',           key: 'illustrator',           scope: 'CREATOR', group: 'Creative & Design' },
  { icon: 'shapes',         name: 'Animator',              key: 'animator',              scope: 'CREATOR', group: 'Creative & Design' },
  { icon: 'sync-alt',       name: 'Motion Designer',       key: 'motion-designer',       scope: 'CREATOR', group: 'Creative & Design' },
  { icon: 'paint-roller',   name: 'Decorator',             key: 'decorator',             scope: 'CREATOR', group: 'Creative & Design' },
  { icon: 'lightbulb',      name: 'Creative Director',     key: 'creative-director',     scope: 'CREATOR', group: 'Creative & Design' },

  { icon: 'clipboard-list', name: 'Event Planner',         key: 'event-planner',         scope: 'CREATOR', group: 'Events' },
  { icon: 'tasks',          name: 'Event Organizer',       key: 'event-organizer',       scope: 'CREATOR', group: 'Events' },
  { icon: 'calendar-check', name: 'Event Coordinator',     key: 'event-coordinator',     scope: 'CREATOR', group: 'Events' },
  { icon: 'ring',           name: 'Wedding Planner',       key: 'wedding-planner',       scope: 'CREATOR', group: 'Events' },
  { icon: 'paint-roller',   name: 'Event Decorator',       key: 'event-decorator',       scope: 'CREATOR', group: 'Events' },
  { icon: 'user-friends',   name: 'Event Staff',           key: 'event-staff',           scope: 'CREATOR', group: 'Events' },
  { icon: 'tools',          name: 'Event Technician',      key: 'event-technician',      scope: 'CREATOR', group: 'Events' },

  { icon: 'share-alt',      name: 'Social Media Manager',  key: 'social-media-manager',  scope: 'CREATOR', group: 'Marketing & Promotion' },
  { icon: 'bullhorn',       name: 'Digital Marketer',      key: 'digital-marketer',      scope: 'CREATOR', group: 'Marketing & Promotion' },
  { icon: 'award',          name: 'Brand Ambassador',      key: 'brand-ambassador',      scope: 'CREATOR', group: 'Marketing & Promotion' },
  { icon: 'ad',             name: 'Promoter',              key: 'promoter',              scope: 'CREATOR', group: 'Marketing & Promotion' },
  { icon: 'newspaper',      name: 'PR Specialist',         key: 'pr-specialist',         scope: 'CREATOR', group: 'Marketing & Promotion' },

  { icon: 'ellipsis-h',     name: 'Other',                 key: 'other-provider',        scope: 'CREATOR', group: 'Other' },
];

export async function seedCategories(prisma: PrismaClient) {
  // Full wipe + fresh insert rather than upsert-by-key. NOTE: this was
  // previously risk-free because Category had no incoming FK relations
  // (creator/business profiles and campaigns store category names as plain
  // strings) — that's no longer true now that Service.categoryId is a real
  // FK to Category.id (onDelete: RESTRICT). Still safe today because no
  // Service rows exist yet, but once the Services UI ships, this script will
  // start throwing a foreign-key error instead of running (RESTRICT, not
  // CASCADE, so it fails loudly rather than silently deleting real provider
  // services) if any Service references a category being wiped. At that
  // point this needs to become an upsert-by-key instead of wipe+reinsert.
  const { count } = await prisma.category.deleteMany({});
  if (count > 0) console.log(`  🗑️  Categories: removed ${count} existing`);
  const total = INDUSTRY_CATEGORIES.length + PROVIDER_CATEGORIES.length;
  await prisma.category.createMany({
    data: [
      ...INDUSTRY_CATEGORIES.map((c, i) => ({ ...c, iconBg: BG_COLORS[i % BG_COLORS.length]! })),
      ...PROVIDER_CATEGORIES.map((c, i) => ({
        ...c,
        color: ICON_COLORS[i % ICON_COLORS.length]!,
        iconBg: BG_COLORS[i % BG_COLORS.length]!,
      })),
    ],
  });
  console.log(`  ✅ Categories: ${total} seeded`);
}
