// One-shot: generate a public-URL slug for every BusinessProfile / Campaign
// row that predates the `slug` column (added in migration
// 20260918151037_add_business_campaign_slug) and doesn't have one yet.
//
// New rows get a slug automatically going forward (BusinessService.updateProfile
// on first businessName set; CampaignService.create at creation time) — this
// script only backfills the ones that already existed before that code shipped.
// Both write paths reuse the exact same generateUniqueSlug() from
// src/utils/slug.ts, so a slug minted here looks identical to one minted live.
//
// Idempotent: only rows with `slug IS NULL` are selected, so re-running finds
// nothing left to touch. Dry-run by default — pass --apply to write.
//
// Dry-run caveat: uniqueness is checked live against the DB, so two rows with
// the exact same name/title previewed in the same dry run will both print the
// same un-suffixed slug (neither write has actually landed yet to make the
// second one collide). This resolves correctly under --apply, since each
// row's update() commits before the next row's uniqueness check runs.
// Businesses with no businessName yet (still mid-onboarding) are left alone;
// they'll get a slug the first time they actually set one, same as any
// non-backfilled row would.
//
// Usage:
//   npx tsx prisma/backfill-business-campaign-slugs.ts             # dry run
//   npx tsx prisma/backfill-business-campaign-slugs.ts --apply     # execute

import { PrismaClient } from '@prisma/client';
import { generateUniqueSlug } from '../src/utils/slug';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function backfillBusinessSlugs(): Promise<void> {
  const rows = await prisma.businessProfile.findMany({
    where: { slug: null, businessName: { not: null } },
    select: { id: true, businessName: true },
  });
  console.log(`\nBusinessProfile.slug: ${rows.length} row(s) to backfill`);
  for (const row of rows) {
    const slug = await generateUniqueSlug(row.businessName as string, async (candidate) => {
      const existing = await prisma.businessProfile.findUnique({ where: { slug: candidate }, select: { id: true } });
      return existing !== null;
    });
    console.log(`  ${row.id} (${row.businessName}) -> ${slug}`);
    if (APPLY) {
      await prisma.businessProfile.update({ where: { id: row.id }, data: { slug } });
    }
  }
}

async function backfillCampaignSlugs(): Promise<void> {
  const rows = await prisma.campaign.findMany({
    where: { slug: null },
    select: { id: true, title: true },
  });
  console.log(`\nCampaign.slug: ${rows.length} row(s) to backfill`);
  for (const row of rows) {
    const slug = await generateUniqueSlug(row.title, async (candidate) => {
      const existing = await prisma.campaign.findUnique({ where: { slug: candidate }, select: { id: true } });
      return existing !== null;
    });
    console.log(`  ${row.id} (${row.title}) -> ${slug}`);
    if (APPLY) {
      await prisma.campaign.update({ where: { id: row.id }, data: { slug } });
    }
  }
}

async function main(): Promise<void> {
  console.log(`Business/Campaign slug backfill`);
  console.log(`  mode: ${APPLY ? 'APPLY (writing)' : 'DRY RUN (pass --apply to write)'}`);

  // Sequential, not Promise.all — both loops mint slugs one at a time via
  // generateUniqueSlug's own DB round-trip per candidate, so interleaving
  // the two models buys nothing and just makes the console output harder
  // to read.
  await backfillBusinessSlugs();
  await backfillCampaignSlugs();

  console.log(`\n${APPLY ? '✅ Backfill complete.' : 'ℹ️  Dry run complete — re-run with --apply to write.'}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Business/Campaign slug backfill failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
