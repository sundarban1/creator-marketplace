// One-off backfill for CreatorAnalytics/BrandAnalytics — computes initial
// aggregate rows from existing Application/Campaign data so already-seeded
// accounts don't show an empty analytics dashboard. Safe to re-run (upserts).
// Run manually: npx tsx prisma/backfillAnalytics.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillCreators() {
  const creators = await prisma.creatorProfile.findMany({ select: { id: true, userId: true } });
  console.log(`Backfilling ${creators.length} creator(s)...`);

  for (const creator of creators) {
    const [
      released, paid, invitationsReceived, applicationsSubmitted,
      applicationsAccepted, applicationsRejected, activeCampaigns, completedCampaigns,
    ] = await Promise.all([
      prisma.application.aggregate({ where: { creatorId: creator.id, paymentStatus: 'RELEASED' }, _sum: { proposedRate: true } }),
      prisma.application.aggregate({ where: { creatorId: creator.id, paymentStatus: 'PAID' }, _sum: { proposedRate: true } }),
      prisma.campaignInvitation.count({ where: { creatorId: creator.id } }),
      prisma.application.count({ where: { creatorId: creator.id } }),
      prisma.application.count({ where: { creatorId: creator.id, status: 'ACCEPTED' } }),
      prisma.application.count({ where: { creatorId: creator.id, status: 'REJECTED' } }),
      prisma.application.count({ where: { creatorId: creator.id, workStatus: { in: ['IN_PROGRESS', 'SUBMITTED'] } } }),
      prisma.application.count({ where: { creatorId: creator.id, workStatus: 'COMPLETED' } }),
    ]);

    await prisma.creatorAnalytics.upsert({
      where: { userId: creator.userId },
      update: {
        totalEarnings: released._sum.proposedRate ?? 0,
        pendingEarnings: paid._sum.proposedRate ?? 0,
        invitationsReceived,
        applicationsSubmitted,
        applicationsAccepted,
        applicationsRejected,
        activeCampaigns,
        completedCampaigns,
      },
      create: {
        userId: creator.userId,
        totalEarnings: released._sum.proposedRate ?? 0,
        pendingEarnings: paid._sum.proposedRate ?? 0,
        invitationsReceived,
        applicationsSubmitted,
        applicationsAccepted,
        applicationsRejected,
        activeCampaigns,
        completedCampaigns,
      },
    });
  }
}

async function backfillBrands() {
  const businesses = await prisma.businessProfile.findMany({ select: { id: true, userId: true } });
  console.log(`Backfilling ${businesses.length} business(es)...`);

  for (const business of businesses) {
    const [campaignsCreated, activeCampaigns, completedApplications, spend, applicationsReceived, acceptedApps] = await Promise.all([
      prisma.campaign.count({ where: { businessId: business.id } }),
      prisma.campaign.count({ where: { businessId: business.id, status: 'ACTIVE' } }),
      prisma.application.count({ where: { campaign: { businessId: business.id }, workStatus: 'COMPLETED' } }),
      prisma.application.aggregate({ where: { campaign: { businessId: business.id }, paymentStatus: 'RELEASED' }, _sum: { proposedRate: true } }),
      prisma.application.count({ where: { campaign: { businessId: business.id } } }),
      prisma.application.findMany({ where: { campaign: { businessId: business.id }, status: 'ACCEPTED' }, select: { creatorId: true }, distinct: ['creatorId'] }),
    ]);

    await prisma.brandAnalytics.upsert({
      where: { userId: business.userId },
      update: {
        campaignsCreated,
        activeCampaigns,
        completedCampaigns: completedApplications,
        totalSpend: spend._sum.proposedRate ?? 0,
        applicationsReceived,
        creatorsHired: acceptedApps.length,
      },
      create: {
        userId: business.userId,
        campaignsCreated,
        activeCampaigns,
        completedCampaigns: completedApplications,
        totalSpend: spend._sum.proposedRate ?? 0,
        applicationsReceived,
        creatorsHired: acceptedApps.length,
      },
    });
  }
}

async function main() {
  await backfillCreators();
  await backfillBrands();
  console.log('Backfill complete.');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
