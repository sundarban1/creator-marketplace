// Production-safe platform seeder — upserts the default platform catalog without
// touching any other data. Safe to re-run any time (e.g. after a fresh deploy, or to
// backfill platforms into an existing database that predates the Platform model).
//
// Usage: npx tsx prisma/seed-platforms.ts
import { PrismaClient } from '@prisma/client';
import { seedPlatforms } from './seeds/platforms';

const prisma = new PrismaClient();

seedPlatforms(prisma)
  .catch((e) => {
    console.error('❌ Platform seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
