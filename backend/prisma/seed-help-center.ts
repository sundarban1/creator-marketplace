// Production-safe Help Center seeder — upserts the creator-facing Help Center
// articles (Settings → Help Center in the mobile app) without touching any
// other data. Safe to re-run any time the copy changes.
//
// Usage: npx tsx prisma/seed-help-center.ts   (or: npm run db:seed:help-center)
import { PrismaClient } from '@prisma/client';
import { seedHelpCenter } from './seeds/help-center';

const prisma = new PrismaClient();

seedHelpCenter(prisma)
  .catch((e) => {
    console.error('❌ Help Center seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
