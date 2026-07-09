import { PrismaClient, CategoryScope } from '@prisma/client';

const BG_COLORS = ['#f3e8ff', '#dbeafe', '#dcfce7', '#fce7f3', '#fef9c3', '#e0f2fe', '#fef3c7', '#ede9fe', '#fee2e2', '#d1fae5'];

// FontAwesome5 icon name + accent color, matching the palette already used
// throughout the mobile app (mobile/src/features/creator/data/filterOptions.ts's ICON_COLORS).
const CATEGORIES: { icon: string; color: string; name: string; key: string; scope: CategoryScope }[] = [
  { icon: 'utensils',       color: '#F97316', name: 'Food & Beverage',    key: 'food-beverage',      scope: 'BOTH' },
  { icon: 'plane',          color: '#0EA5E9', name: 'Travel',             key: 'travel',             scope: 'BOTH' },
  { icon: 'tshirt',         color: '#EC4899', name: 'Fashion',            key: 'fashion',            scope: 'BOTH' },
  { icon: 'spa',            color: '#D946EF', name: 'Beauty',             key: 'beauty',             scope: 'BOTH' },
  { icon: 'dumbbell',       color: '#16A34A', name: 'Fitness & Health',   key: 'fitness-health',     scope: 'BOTH' },
  { icon: 'gamepad',        color: '#8B5CF6', name: 'Gaming',             key: 'gaming',             scope: 'BOTH' },
  { icon: 'microchip',      color: '#3B82F6', name: 'Technology',         key: 'technology',         scope: 'BOTH' },
  { icon: 'graduation-cap', color: '#F59E0B', name: 'Education',          key: 'education',          scope: 'BOTH' },
  { icon: 'leaf',           color: '#22C55E', name: 'Lifestyle',          key: 'lifestyle',          scope: 'BOTH' },
  { icon: 'home',           color: '#0D9488', name: 'Home & Living',      key: 'home-living',        scope: 'BOTH' },
  { icon: 'music',          color: '#A78BFA', name: 'Music',              key: 'music',              scope: 'BOTH' },
  { icon: 'palette',        color: '#F472B6', name: 'Art & Design',       key: 'art-design',         scope: 'BOTH' },
  { icon: 'paw',            color: '#CA8A04', name: 'Pets',               key: 'pets',               scope: 'CREATOR' },
  { icon: 'wallet',         color: '#059669', name: 'Finance',            key: 'finance',            scope: 'BOTH' },
  { icon: 'camera',         color: '#334155', name: 'Photography',        key: 'photography',        scope: 'CREATOR' },
  { icon: 'futbol',         color: '#0D9488', name: 'Sports',             key: 'sports',             scope: 'BOTH' },
  { icon: 'theater-masks',  color: '#C026D3', name: 'Entertainment',      key: 'entertainment',      scope: 'BOTH' },
  { icon: 'shopping-cart',  color: '#D97706', name: 'Retail & E-commerce', key: 'retail-ecommerce',  scope: 'BUSINESS' },
  { icon: 'concierge-bell', color: '#4F46E5', name: 'Events & Hospitality', key: 'events-hospitality', scope: 'BUSINESS' },
];

export async function seedCategories(prisma: PrismaClient) {
  await Promise.all(
    CATEGORIES.map((c, i) =>
      prisma.category.upsert({
        where: { key: c.key },
        // Re-running the seeder keeps icon/color in sync with the palette above —
        // Category is meant to be admin-owned going forward, but this lets a
        // fresh seed/reseed always reflect the current defaults.
        update: { icon: c.icon, color: c.color, iconBg: BG_COLORS[i % BG_COLORS.length]! },
        create: { ...c, iconBg: BG_COLORS[i % BG_COLORS.length]! },
      })
    )
  );
  console.log(`  ✅ Categories: ${CATEGORIES.length} seeded`);
}
