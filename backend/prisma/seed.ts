import { PrismaClient } from '@prisma/client';
import { seedUsers } from './seeds/users';
import { seedContent } from './seeds/content';
import { seedCategories } from './seeds/categories';
import { seedPlatforms } from './seeds/platforms';

const prisma = new PrismaClient();

// Safe to re-run any time (e.g. after editing help/FAQ/legal copy) — every
// seed function upserts rather than blindly inserting.
async function main() {
  console.log('\n🌱 Seeding database…\n');

  console.log('── Categories ───────────────────────────────────────────');
  await seedCategories(prisma);

  console.log('\n── Platforms ────────────────────────────────────────────');
  await seedPlatforms(prisma);

  console.log('\n── Admin ────────────────────────────────────────────────');
  await seedUsers(prisma);

  console.log('\n── Content ──────────────────────────────────────────────');
  await seedContent(prisma);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Admin:    admin@kolab.com.np  /  Admin@123456');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
