// One-shot cleanup for the CAMPAIGN_REWARD Kolab Points that escrow.service.ts
// used to award (10% of a released payout) alongside the wallet credit. That
// 10% is the platform's commission, already collected separately from the
// business via platform.commission — it should never have also been minted
// as creator points. The code path is removed; this reverses whatever it
// already wrote: deletes every CAMPAIGN_REWARD ledger row and rolls its
// amount back out of that creator's cached CreatorPointsAccount balance.
//
// Usage: npx tsx prisma/remove-campaign-reward-points.ts   (or: npm run db:cleanup:campaign-reward-points)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🧹 Removing CAMPAIGN_REWARD Kolab Points entries…\n');

  const rows = await prisma.creatorPointsLedger.findMany({
    where: { type: 'CAMPAIGN_REWARD' },
    select: { id: true, creatorId: true, amount: true, direction: true, status: true },
  });

  if (rows.length === 0) {
    console.log('  Nothing to clean up — no CAMPAIGN_REWARD rows exist.\n');
    return;
  }

  const byCreator = new Map<string, number>();
  for (const row of rows) {
    if (row.status !== 'COMPLETED') continue; // only completed rows ever touched the cached balance
    const delta = row.direction === 'CREDIT' ? row.amount : -row.amount;
    byCreator.set(row.creatorId, (byCreator.get(row.creatorId) ?? 0) + delta);
  }

  for (const [creatorId, delta] of byCreator) {
    if (delta === 0) continue;
    await prisma.creatorPointsAccount.updateMany({
      where: { creatorId },
      data: {
        balance:        { decrement: delta },
        lifetimeEarned: { decrement: delta },
      },
    });
  }

  const { count } = await prisma.creatorPointsLedger.deleteMany({ where: { type: 'CAMPAIGN_REWARD' } });

  console.log(`  Deleted ${count} CAMPAIGN_REWARD ledger row(s) across ${byCreator.size} creator(s).`);
  console.log('  Corrected balances:');
  for (const [creatorId, delta] of byCreator) {
    console.log(`    ${creatorId}: −${delta.toLocaleString()}`);
  }
  console.log('\n✅ Cleanup complete.\n');
}

main()
  .catch((e) => {
    console.error('❌ CAMPAIGN_REWARD cleanup failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
