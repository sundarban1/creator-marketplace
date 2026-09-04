import { randomUUID } from 'crypto';
import prisma from '../src/prisma';

export const hasDb = !!process.env.TEST_DATABASE_URL;

// Tables the escrow flows touch, child-first for FK-safe truncation.
const TABLES = [
  'campaign_events', 'campaign_submission_versions', 'disputes', 'revision_notes',
  'wallet_transactions', 'payment_transactions', 'creator_reliability',
  'applications', 'campaigns', 'creator_profiles', 'business_profiles',
  'platform_settings', 'activity_logs', 'audit_logs', 'notifications', 'users',
];

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
}

export async function disconnect() {
  await prisma.$disconnect();
}

/**
 * A funded paid engagement: business + creator + campaign + an ACCEPTED,
 * escrow-HELD application with the matching ESCROW_IN ledger row. Returns the
 * ids the tests need.
 */
export async function seedFundedEngagement(opts: { proposedRate?: number; workStatus?: string } = {}) {
  const rate = opts.proposedRate ?? 2000;

  const bizUser = await prisma.user.create({
    data: { email: `biz-${randomUUID()}@test.dev`, password: 'x', role: 'BUSINESS' },
  });
  const creatorUser = await prisma.user.create({
    data: { email: `cre-${randomUUID()}@test.dev`, password: 'x', role: 'CREATOR' },
  });
  const admin = await prisma.user.create({
    data: { email: `adm-${randomUUID()}@test.dev`, password: 'x', role: 'ADMIN' },
  });
  const business = await prisma.businessProfile.create({
    data: { userId: bizUser.id, businessName: 'Test Co', categories: [] },
  });
  const creator = await prisma.creatorProfile.create({
    data: { userId: creatorUser.id, fullName: 'Test Creator', categories: [] },
  });
  const campaign = await prisma.campaign.create({
    data: {
      businessId: business.id,
      title: 'Test Campaign',
      description: 'd',
      category: 'content-creator',
      contentType: 'video',
      deliverables: '1 reel',
      deadline: new Date(Date.now() + 7 * 86_400_000),
      budgetMin: rate,
      budgetMax: rate,
      paymentType: 'fixed',
      status: 'CLOSED',
      campaignType: 'PAID_CAMPAIGN',
    },
  });
  const application = await prisma.application.create({
    data: {
      campaignId: campaign.id,
      creatorId: creator.id,
      coverLetter: 'c',
      proposedRate: rate,
      timeline: '1w',
      status: 'ACCEPTED',
      workStatus: (opts.workStatus ?? 'SUBMITTED') as never,
      paymentStatus: 'PAID',
      escrowStatus: 'HELD',
      paidAt: new Date(),
    },
  });
  await prisma.paymentTransaction.create({
    data: {
      type: 'ESCROW_IN', amount: rate, applicationId: application.id,
      campaignId: campaign.id, businessId: business.id, creatorId: creator.id,
      reference: `escrow:${application.id}`,
    },
  });

  return {
    rate,
    bizUserId: bizUser.id, creatorUserId: creatorUser.id, adminId: admin.id,
    businessId: business.id, creatorId: creator.id,
    campaignId: campaign.id, applicationId: application.id,
  };
}

export async function walletBalance(creatorId: string): Promise<number> {
  const rows = await prisma.walletTransaction.findMany({ where: { creatorId, status: 'COMPLETED' } });
  return rows.reduce((s, r) => s + (r.direction === 'CREDIT' ? r.amount : -r.amount), 0);
}
