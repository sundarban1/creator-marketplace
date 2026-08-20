// Production-safe essentials seeder — seeds exactly the real-content tables an
// environment needs to function: categories, legal pages (Privacy Policy,
// Terms & Conditions, Community Guidelines), FAQs, and the default contract
// template. No demo/fake data (users, campaigns, success stories) — that's
// prisma/seed.ts. Every seed function upserts, so this is safe to re-run any
// time this content changes, against local or production alike.
//
// Usage: npx tsx prisma/seed-essentials.ts
import { PrismaClient } from '@prisma/client';
import { seedCategories } from './seeds/categories';
import { seedContracts } from './seeds/contracts';
import { seedLegalContent } from './seeds/content';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🌱 Seeding essential content…\n');

  console.log('── Categories ───────────────────────────────────────────');
  await seedCategories(prisma);

  console.log('\n── Legal & FAQs ─────────────────────────────────────────');
  await seedLegalContent(prisma);

  console.log('\n── Contracts ────────────────────────────────────────────');
  await seedContracts(prisma);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Essentials seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
