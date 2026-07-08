// Production-safe admin seeder — creates (or updates) a single ADMIN user from
// env vars. Unlike prisma/seed.ts (which also creates fake demo creators,
// businesses, and campaigns with a hardcoded password), this only touches the
// admin account and never hardcodes a credential.
//
// Usage:
//   SEED_ADMIN_EMAIL=you@company.com SEED_ADMIN_PASSWORD='a-strong-password' npx tsx prisma/seed-admin.ts
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email    = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD env vars before running this script.');
  }
  if (password.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters.');
  }

  const hashed = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where:  { email },
    update: { password: hashed, role: Role.ADMIN, isEmailVerified: true, isOnboarded: true },
    create: {
      email,
      password: hashed,
      role: Role.ADMIN,
      isEmailVerified: true,
      isOnboarded: true,
    },
  });

  console.log(`✅ Admin user ready: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Admin seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
