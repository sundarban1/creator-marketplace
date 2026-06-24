import { PrismaClient } from '@prisma/client';
import { seedUsers } from './seeds/users';
import { seedCampaigns } from './seeds/campaigns';
import { seedContent } from './seeds/content';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🌱 Seeding database…\n');

  console.log('── Users ────────────────────────────────────────────────');
  const { businesses } = await seedUsers(prisma);

  console.log('\n── Campaigns ────────────────────────────────────────────');
  await seedCampaigns(prisma, businesses);

  console.log('\n── Content ──────────────────────────────────────────────');
  await seedContent(prisma);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Admin:    admin@creatormarket.com.np  /  Admin@123456');
  console.log('  Creator:  aarav@example.com           /  Creator@123');
  console.log('  Creator:  srijana@example.com         /  Creator@123');
  console.log('  Creator:  bikash@example.com          /  Creator@123');
  console.log('  Creator:  nisha@example.com           /  Creator@123');
  console.log('  Creator:  rohan@example.com           /  Creator@123');
  console.log('  Business: hello@momohouse.com.np      /  Business@123');
  console.log('  Business: info@himalayabrew.com.np    /  Business@123');
  console.log('  Business: brand@dhakathreads.com.np   /  Business@123');
  console.log('  Business: hello@newari.kitchen        /  Business@123');
  console.log('  Business: stay@pokharaparadise.com.np /  Business@123');
  console.log('  Business: hello@himalayanglow.com.np  /  Business@123');
  console.log('  Business: events@ktmmusicfest.com.np  /  Business@123');
  console.log('  Business: hello@technova.com.np       /  Business@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
