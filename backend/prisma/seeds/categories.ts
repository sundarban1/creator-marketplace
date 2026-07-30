import { PrismaClient, CategoryScope } from '@prisma/client';

const BG_COLORS = ['#f3e8ff', '#dbeafe', '#dcfce7', '#fce7f3', '#fef9c3', '#e0f2fe', '#fef3c7', '#ede9fe', '#fee2e2', '#d1fae5'];

// FontAwesome5 icon name + accent color, matching the palette already used
// throughout the mobile app (mobile/src/features/creator/data/filterOptions.ts's ICON_COLORS).
// Unified taxonomy — one shared list for both creators and businesses.
const CATEGORIES: { icon: string; color: string; name: string; key: string; scope: CategoryScope }[] = [
  { icon: 'utensils',          color: '#F97316', name: 'Restaurants',              key: 'restaurants',            scope: 'BOTH' },
  { icon: 'coffee',            color: '#A16207', name: 'Cafés',                    key: 'cafes',                  scope: 'BOTH' },
  { icon: 'hotel',             color: '#0EA5E9', name: 'Hotels',                   key: 'hotels',                 scope: 'BOTH' },
  { icon: 'umbrella-beach',    color: '#06B6D4', name: 'Resorts',                  key: 'resorts',                scope: 'BOTH' },
  { icon: 'plane',             color: '#0284C7', name: 'Travel & Tourism',         key: 'travel-tourism',         scope: 'BOTH' },
  { icon: 'hiking',            color: '#65A30D', name: 'Trekking & Adventure',     key: 'trekking-adventure',     scope: 'BOTH' },
  { icon: 'tshirt',            color: '#EC4899', name: 'Fashion & Clothing',       key: 'fashion-clothing',       scope: 'BOTH' },
  { icon: 'shoe-prints',       color: '#DB2777', name: 'Footwear',                 key: 'footwear',               scope: 'BOTH' },
  { icon: 'spa',               color: '#D946EF', name: 'Beauty & Cosmetics',       key: 'beauty-cosmetics',       scope: 'BOTH' },
  { icon: 'tint',              color: '#F472B6', name: 'Skincare & Personal Care', key: 'skincare-personal-care', scope: 'BOTH' },
  { icon: 'gem',               color: '#7C3AED', name: 'Jewellery & Accessories',  key: 'jewellery-accessories',  scope: 'BOTH' },
  { icon: 'shopping-bag',      color: '#D97706', name: 'Retail & Shopping',        key: 'retail-shopping',        scope: 'BOTH' },
  { icon: 'shopping-cart',     color: '#EA580C', name: 'E-commerce',               key: 'ecommerce',              scope: 'BOTH' },
  { icon: 'hamburger',         color: '#B45309', name: 'Food & Beverage Brands',   key: 'food-beverage-brands',   scope: 'BOTH' },
  { icon: 'glass-cheers',      color: '#C026D3', name: 'Events & Entertainment',   key: 'events-entertainment',   scope: 'BOTH' },
  { icon: 'dumbbell',          color: '#16A34A', name: 'Fitness & Wellness',       key: 'fitness-wellness',       scope: 'BOTH' },
  { icon: 'graduation-cap',    color: '#F59E0B', name: 'Education & Training',     key: 'education-training',     scope: 'BOTH' },
  { icon: 'mobile-alt',        color: '#3B82F6', name: 'Electronics & Mobile',     key: 'electronics-mobile',     scope: 'BOTH' },
  { icon: 'laptop-code',       color: '#2563EB', name: 'Technology & Software',    key: 'technology-software',    scope: 'BOTH' },
  { icon: 'car',               color: '#475569', name: 'Automotive',               key: 'automotive',             scope: 'BOTH' },
  { icon: 'building',          color: '#0D9488', name: 'Real Estate & Property',   key: 'real-estate-property',   scope: 'BOTH' },
  { icon: 'university',        color: '#059669', name: 'Banking & FinTech',        key: 'banking-fintech',        scope: 'BOTH' },
  { icon: 'wifi',              color: '#0891B2', name: 'Internet & Telecom',       key: 'internet-telecom',       scope: 'BOTH' },
  { icon: 'briefcase-medical', color: '#DC2626', name: 'Healthcare & Medical',     key: 'healthcare-medical',     scope: 'BOTH' },
  { icon: 'couch',             color: '#9333EA', name: 'Home & Furniture',         key: 'home-furniture',         scope: 'BOTH' },
];

export async function seedCategories(prisma: PrismaClient) {
  await Promise.all(
    CATEGORIES.map((c, i) =>
      prisma.category.upsert({
        where: { key: c.key },
        // Re-running the seeder keeps icon/color in sync with the palette above —
        // Category is meant to be admin-owned going forward, but this lets a
        // fresh seed/reseed always reflect the current defaults.
        update: { name: c.name, icon: c.icon, color: c.color, iconBg: BG_COLORS[i % BG_COLORS.length]! },
        create: { ...c, iconBg: BG_COLORS[i % BG_COLORS.length]! },
      })
    )
  );
  // Full replace, not additive — Category has no FK relations (creator/business
  // profiles and campaigns store category names as plain strings), so this is
  // safe to prune outright rather than leaving old rows orphaned.
  const { count } = await prisma.category.deleteMany({ where: { key: { notIn: CATEGORIES.map((c) => c.key) } } });
  if (count > 0) console.log(`  🗑️  Categories: removed ${count} no-longer-used`);
  console.log(`  ✅ Categories: ${CATEGORIES.length} seeded`);
}
