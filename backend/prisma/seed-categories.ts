// Production-safe category seeder — wipes and reinserts the category catalog
// without touching any other data. Safe to re-run any time the taxonomy in
// seeds/categories.ts changes.
//
// Usage: npx tsx prisma/seed-categories.ts
import { PrismaClient } from '@prisma/client';
import { seedCategories } from './seeds/categories';

const prisma = new PrismaClient();

seedCategories(prisma)
  .catch((e) => {
    console.error('❌ Category seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
