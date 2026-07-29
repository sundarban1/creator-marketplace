// Production-safe contract-template seeder — upserts the default paid-campaign
// contract template without touching any other data, and without overwriting
// an admin's edits if the template has already been customized via the web
// dashboard (/contracts). Safe to re-run any time.
//
// Usage: npx tsx prisma/seed-contracts.ts
import { PrismaClient } from '@prisma/client';
import { seedContracts } from './seeds/contracts';

const prisma = new PrismaClient();

seedContracts(prisma)
  .catch((e) => {
    console.error('❌ Contract template seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
