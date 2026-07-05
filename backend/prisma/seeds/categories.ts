import { PrismaClient, CategoryScope } from '@prisma/client';

const BG_COLORS = ['#f3e8ff', '#dbeafe', '#dcfce7', '#fce7f3', '#fef9c3', '#e0f2fe', '#fef3c7', '#ede9fe', '#fee2e2', '#d1fae5'];

const CATEGORIES: { icon: string; name: string; key: string; scope: CategoryScope }[] = [
  { icon: '🍔', name: 'Food & Beverage',   key: 'food-beverage',  scope: 'BOTH' },
  { icon: '✈️', name: 'Travel',             key: 'travel',         scope: 'BOTH' },
  { icon: '👗', name: 'Fashion',            key: 'fashion',        scope: 'BOTH' },
  { icon: '💄', name: 'Beauty',             key: 'beauty',         scope: 'BOTH' },
  { icon: '💪', name: 'Fitness & Health',   key: 'fitness-health', scope: 'BOTH' },
  { icon: '🎮', name: 'Gaming',             key: 'gaming',         scope: 'BOTH' },
  { icon: '📱', name: 'Technology',         key: 'technology',     scope: 'BOTH' },
  { icon: '📚', name: 'Education',          key: 'education',      scope: 'BOTH' },
  { icon: '🌟', name: 'Lifestyle',          key: 'lifestyle',      scope: 'BOTH' },
  { icon: '🏠', name: 'Home & Living',      key: 'home-living',    scope: 'BOTH' },
  { icon: '🎵', name: 'Music',              key: 'music',          scope: 'BOTH' },
  { icon: '🎨', name: 'Art & Design',       key: 'art-design',     scope: 'BOTH' },
  { icon: '🐾', name: 'Pets',               key: 'pets',           scope: 'CREATOR' },
  { icon: '💰', name: 'Finance',            key: 'finance',        scope: 'BOTH' },
  { icon: '📷', name: 'Photography',        key: 'photography',    scope: 'CREATOR' },
  { icon: '🏋️', name: 'Sports',             key: 'sports',         scope: 'BOTH' },
  { icon: '🎪', name: 'Entertainment',      key: 'entertainment',  scope: 'BOTH' },
  { icon: '🛍️', name: 'Retail & E-commerce', key: 'retail-ecommerce', scope: 'BUSINESS' },
  { icon: '🏨', name: 'Events & Hospitality', key: 'events-hospitality', scope: 'BUSINESS' },
];

export async function seedCategories(prisma: PrismaClient) {
  await Promise.all(
    CATEGORIES.map((c, i) =>
      prisma.category.upsert({
        where: { key: c.key },
        update: {},
        create: { ...c, iconBg: BG_COLORS[i % BG_COLORS.length]! },
      })
    )
  );
  console.log(`  ✅ Categories: ${CATEGORIES.length} seeded`);
}
