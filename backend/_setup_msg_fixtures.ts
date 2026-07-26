import prisma from './src/prisma';
import bcrypt from 'bcrypt';

async function main() {
  const pw = await bcrypt.hash('TestPass123!', 10);
  const bizUser = await prisma.user.create({ data: { email: `__test_biz_msg@example.com`, password: pw, role: 'BUSINESS', isEmailVerified: true, isOnboarded: true } });
  const bizProfile = await prisma.businessProfile.create({ data: { userId: bizUser.id, businessName: 'Test Biz' } });
  const creatorUser = await prisma.user.create({ data: { email: `__test_creator_msg@example.com`, password: pw, role: 'CREATOR', isEmailVerified: true, isOnboarded: true } });
  const creatorProfile = await prisma.creatorProfile.create({ data: { userId: creatorUser.id, fullName: 'Test Creator' } });
  const conversation = await prisma.conversation.create({
    data: { creatorId: creatorProfile.id, businessId: bizProfile.id, status: 'ACCEPTED' },
  });
  console.log(JSON.stringify({ conversationId: conversation.id, bizUserId: bizUser.id, creatorUserId: creatorUser.id }));
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
