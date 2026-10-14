// Changes the login email of an existing ADMIN user in place (keeps id, password,
// sessions, and all related rows). Use this instead of re-running seed-admin.ts
// with a new SEED_ADMIN_EMAIL, which would create a second admin account.
//
// Usage:
//   OLD_ADMIN_EMAIL=admin@creatormarket.com.np NEW_ADMIN_EMAIL=info@kolab.com.np npx tsx prisma/rename-admin-email.ts
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const oldEmail = process.env.OLD_ADMIN_EMAIL?.trim().toLowerCase();
  const newEmail = process.env.NEW_ADMIN_EMAIL?.trim().toLowerCase();

  if (!oldEmail || !newEmail) {
    throw new Error('Set OLD_ADMIN_EMAIL and NEW_ADMIN_EMAIL env vars before running this script.');
  }

  const admin = await prisma.user.findUnique({ where: { email: oldEmail } });
  if (!admin) throw new Error(`No user found with email ${oldEmail}`);
  if (admin.role !== Role.ADMIN) throw new Error(`${oldEmail} is not an ADMIN (role: ${admin.role})`);

  const taken = await prisma.user.findUnique({ where: { email: newEmail } });
  if (taken) throw new Error(`${newEmail} is already used by user ${taken.id} (role: ${taken.role})`);

  const updated = await prisma.user.update({
    where: { id: admin.id },
    data:  { email: newEmail, isEmailVerified: true, emailIsPlaceholder: false },
  });

  console.log(`✅ Admin email changed: ${oldEmail} → ${updated.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Admin email rename failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
