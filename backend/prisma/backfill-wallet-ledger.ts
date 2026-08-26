// One-shot backfill for the creator wallet ledger (WalletTransaction), introduced
// with the manual-withdrawal feature. Reconstructs the ledger from history so
// that realized balance (Σ COMPLETED credits − Σ COMPLETED debits) matches what
// WalletService.computeBalances used to derive on the fly:
//
//   old availableBalance = Σ RELEASED proposedRate
//                        + Σ COMPLETED referrer rewards
//                        + (referred first-event bonus, if any)
//                        − Σ all withdrawals
//
// Idempotent — every insert uses skipDuplicates against the
// (referenceId, type) unique index, and withdrawals are only migrated once.
//
// Usage: npx tsx prisma/backfill-wallet-ledger.ts   (or: npm run db:backfill:wallet)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REFERRED_FIRST_EVENT_BONUS = 200; // keep in sync with referral.service.ts

const METHOD_MAP: Record<string, string> = {
  esewa: 'ESEWA',
  khalti: 'KHALTI',
  bank: 'BANK',
  bank_transfer: 'BANK',
  'bank transfer': 'BANK',
};

function normalizeMethod(method: string): string {
  return METHOD_MAP[method.trim().toLowerCase()] ?? method.trim().toUpperCase();
}

async function backfillCampaignPayouts() {
  const apps = await prisma.application.findMany({
    where:   { paymentStatus: 'RELEASED' },
    select:  { id: true, creatorId: true, proposedRate: true, campaign: { select: { title: true } } },
  });
  const { count } = await prisma.walletTransaction.createMany({
    data: apps.map((a) => ({
      creatorId:     a.creatorId,
      type:          'CAMPAIGN_PAYOUT' as const,
      direction:     'CREDIT' as const,
      amount:        a.proposedRate,
      description:   `Payment for "${a.campaign?.title ?? 'a campaign'}"`,
      referenceType: 'application',
      referenceId:   a.id,
    })),
    skipDuplicates: true,
  });
  console.log(`  campaign payouts: ${count} inserted (${apps.length} released applications)`);
}

async function backfillReferralRewards() {
  const referrals = await prisma.referral.findMany({
    where:  { status: 'COMPLETED' },
    select: { id: true, referrerId: true, referredId: true, rewardAmount: true },
  });

  const rewards = await prisma.walletTransaction.createMany({
    data: referrals.map((r) => ({
      creatorId:     r.referrerId,
      type:          'REFERRAL_REWARD' as const,
      direction:     'CREDIT' as const,
      amount:        Number(r.rewardAmount),
      description:   'Referral reward',
      referenceType: 'referral',
      referenceId:   r.id,
    })),
    skipDuplicates: true,
  });
  const bonuses = await prisma.walletTransaction.createMany({
    data: referrals.map((r) => ({
      creatorId:     r.referredId,
      type:          'REFERRAL_BONUS' as const,
      direction:     'CREDIT' as const,
      amount:        REFERRED_FIRST_EVENT_BONUS,
      description:   'First event bonus',
      referenceType: 'referral',
      referenceId:   r.id,
    })),
    skipDuplicates: true,
  });
  console.log(`  referral rewards: ${rewards.count} + bonuses: ${bonuses.count} (${referrals.length} completed referrals)`);
}

async function backfillWithdrawals() {
  // Every withdrawal that predates this feature was an instant payout — treat it
  // as already PAID and debit the ledger for it.
  const withdrawals = await prisma.withdrawal.findMany({
    select: { id: true, creatorId: true, amount: true, method: true, status: true, createdAt: true },
  });

  let debits = 0;
  let migrated = 0;
  for (const w of withdrawals) {
    const res = await prisma.walletTransaction.createMany({
      data: [{
        creatorId:     w.creatorId,
        type:          'WITHDRAWAL' as const,
        direction:     'DEBIT' as const,
        amount:        w.amount,
        description:   `Withdrawal via ${normalizeMethod(w.method)}`,
        referenceType: 'withdrawal',
        referenceId:   w.id,
      }],
      skipDuplicates: true,
    });
    debits += res.count;

    // The migration defaulted existing rows to PENDING; move them to their real
    // (legacy-instant) terminal state.
    if (w.status === 'PENDING') {
      await prisma.withdrawal.update({
        where: { id: w.id },
        data:  { status: 'PAID', method: normalizeMethod(w.method), processedAt: w.createdAt },
      });
      migrated += 1;
    }
  }
  console.log(`  withdrawals: ${debits} debits inserted, ${migrated} rows moved PENDING→PAID (${withdrawals.length} total)`);
}

async function reconcile() {
  const grouped = await prisma.walletTransaction.groupBy({
    by:    ['creatorId', 'direction'],
    where: { status: 'COMPLETED' },
    _sum:  { amount: true },
  });
  const byCreator = new Map<string, { credits: number; debits: number }>();
  for (const row of grouped) {
    const entry = byCreator.get(row.creatorId) ?? { credits: 0, debits: 0 };
    if (row.direction === 'CREDIT') entry.credits = row._sum.amount ?? 0;
    else entry.debits = row._sum.amount ?? 0;
    byCreator.set(row.creatorId, entry);
  }

  console.log('\n  Reconciliation (creatorId → credits − debits = availableBalance):');
  for (const [creatorId, { credits, debits }] of byCreator) {
    console.log(`    ${creatorId}: ${credits.toLocaleString()} − ${debits.toLocaleString()} = ${(credits - debits).toLocaleString()}`);
  }
  console.log(`  ${byCreator.size} creators have wallet ledger activity.`);
}

async function main() {
  console.log('\n💰 Backfilling creator wallet ledger…\n');
  await backfillCampaignPayouts();
  await backfillReferralRewards();
  await backfillWithdrawals();
  await reconcile();
  console.log('\n✅ Wallet ledger backfill complete.\n');
}

main()
  .catch((e) => {
    console.error('❌ Wallet ledger backfill failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
