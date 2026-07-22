import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

// Local/dev seeder — creates only the admin account needed to log into the
// web admin panel. Demo creator/business accounts used to live here too;
// removed so a fresh local or staging database never ships with fake user
// data. Use prisma/seeds/campaigns.ts-style fixtures manually if you need
// demo creators/businesses for a specific test.
export async function seedUsers(prisma: PrismaClient) {
  const adminPw = await bcrypt.hash('Admin@123456', 12);

  const admin = await prisma.user.upsert({
    where:  { email: 'admin@kolab.com.np' },
    update: {},
    create: {
      email: 'admin@kolab.com.np',
      phone: '+9779800000001',
      password: adminPw,
      role: Role.ADMIN,
      isEmailVerified: true,
      isOnboarded: true,
    },
  });
  console.log(`  ✅ Admin: ${admin.email}  /  Admin@123456`);

  return { admin };
}
