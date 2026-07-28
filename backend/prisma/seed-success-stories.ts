// Production-safe success-story seeder — upserts 10 sample testimonials for the
// landing page without touching any other data. Safe to re-run any time.
//
// Usage: npx tsx prisma/seed-success-stories.ts
import { PrismaClient } from '@prisma/client';
import { seedSuccessStories } from './seeds/success-stories';

const prisma = new PrismaClient();

seedSuccessStories(prisma)
  .catch((e) => {
    console.error('❌ Success story seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
