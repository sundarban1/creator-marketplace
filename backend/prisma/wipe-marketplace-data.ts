/**
 * Deletes all creator/business accounts (and everything that cascades from
 * them — profiles, campaigns/events, applications, contracts, conversations,
 * etc.) so the marketplace data can be reseeded from scratch. ADMIN users are
 * left untouched.
 *
 * Usage: npx tsx prisma/wipe-marketplace-data.ts
 */
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const { count } = await prisma.user.deleteMany({
    where: { role: { in: [Role.CREATOR, Role.BUSINESS] } },
  });
  console.log(`Deleted ${count} creator/business users (cascaded to their profiles, campaigns, and related data).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
