// One-shot: rewrite the R2 public hostname in every URL already persisted in the
// database. The `kolab` bucket is now exposed through a custom domain
// (cdn.ourkolab.com) instead of the rate-limited *.r2.dev development URL — but
// URLs are stored absolute, at write time, so rows minted before the switch
// still point at the old host and will 404 the moment the r2.dev public access
// is disabled (and stall/throttle until then — the bug that started all this).
//
// The bucket itself never moved: both hostnames serve the exact same objects, so
// this is a pure string swap of the host prefix. No re-upload, no key change.
//
// Columns covered (everything r2Media.ts / the invitation renderer can write):
//   Message.attachmentUrl            — chat voice + video
//   Message.attachmentThumbnailUrl   — chat video poster frame (R2 when finalized from a thumbnailKey)
//   Application.invitationImageUrl   — open-event invitation PNG
//   Application.deliverableVideos[]  — JSON array; .url + .thumbnailUrl per entry
//
// Idempotent: only rows whose stored value still contains OLD_HOST are touched,
// so re-running does nothing. Dry-run by default — pass --apply to write.
//
// Usage:
//   npx tsx prisma/backfill-r2-public-host.ts                 # dry run, hosts from env/defaults
//   npx tsx prisma/backfill-r2-public-host.ts --apply         # execute
//   npx tsx prisma/backfill-r2-public-host.ts --apply \
//     --old https://pub-XXXX.r2.dev --new https://cdn.ourkolab.com

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const APPLY = process.argv.includes('--apply');
const OLD_HOST = (arg('--old') ?? 'https://pub-50fd504347774f6dad515fc0465eca8e.r2.dev').replace(/\/$/, '');
const NEW_HOST = (arg('--new') ?? process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');

function swap(value: string): string {
  // Only rewrite when OLD_HOST is the origin of the URL, not an incidental substring.
  return value.startsWith(`${OLD_HOST}/`) || value === OLD_HOST
    ? NEW_HOST + value.slice(OLD_HOST.length)
    : value;
}

async function backfillMessages(): Promise<void> {
  for (const column of ['attachmentUrl', 'attachmentThumbnailUrl'] as const) {
    const rows = await prisma.message.findMany({
      where: { [column]: { startsWith: `${OLD_HOST}/` } },
      select: { id: true, [column]: true },
    });
    console.log(`\nMessage.${column}: ${rows.length} row(s) to rewrite`);
    for (const row of rows) {
      const before = row[column] as string;
      const after = swap(before);
      console.log(`  ${row.id}\n    - ${before}\n    + ${after}`);
      if (APPLY) {
        await prisma.message.update({ where: { id: row.id }, data: { [column]: after } });
      }
    }
  }
}

async function backfillInvitationUrls(): Promise<void> {
  const rows = await prisma.application.findMany({
    where: { invitationImageUrl: { startsWith: `${OLD_HOST}/` } },
    select: { id: true, invitationImageUrl: true },
  });
  console.log(`\nApplication.invitationImageUrl: ${rows.length} row(s) to rewrite`);
  for (const row of rows) {
    const before = row.invitationImageUrl as string;
    const after = swap(before);
    console.log(`  ${row.id}\n    - ${before}\n    + ${after}`);
    if (APPLY) {
      await prisma.application.update({ where: { id: row.id }, data: { invitationImageUrl: after } });
    }
  }
}

async function backfillDeliverableVideos(): Promise<void> {
  // JSON array of { publicId, url, thumbnailUrl, durationSec, format, sizeBytes, label, uploadedAt }.
  // Prisma can't `startsWith`-filter inside a Json column, so pull the candidates
  // with a raw LIKE and rewrite the array in app code.
  const rows = await prisma.$queryRaw<{ id: string; deliverableVideos: unknown }[]>(Prisma.sql`
    SELECT id, "deliverableVideos"
    FROM applications
    WHERE "deliverableVideos"::text LIKE ${'%' + OLD_HOST + '/%'}
  `);
  console.log(`\nApplication.deliverableVideos: ${rows.length} row(s) to inspect`);
  for (const row of rows) {
    const entries = Array.isArray(row.deliverableVideos) ? (row.deliverableVideos as Record<string, unknown>[]) : [];
    let changed = false;
    const next = entries.map((e) => {
      const copy = { ...e };
      for (const field of ['url', 'thumbnailUrl'] as const) {
        if (typeof copy[field] === 'string') {
          const after = swap(copy[field] as string);
          if (after !== copy[field]) { copy[field] = after; changed = true; }
        }
      }
      return copy;
    });
    if (!changed) continue;
    console.log(`  ${row.id}\n    ${JSON.stringify(entries)}\n    -> ${JSON.stringify(next)}`);
    if (APPLY) {
      await prisma.application.update({
        where: { id: row.id },
        data: { deliverableVideos: next as Prisma.InputJsonValue },
      });
    }
  }
}

async function main(): Promise<void> {
  if (!NEW_HOST) {
    console.error('❌ No target host. Set R2_PUBLIC_URL or pass --new https://cdn.ourkolab.com');
    process.exit(1);
  }
  if (NEW_HOST === OLD_HOST) {
    console.error('❌ --old and --new are identical — nothing to do.');
    process.exit(1);
  }
  console.log(`R2 public host backfill`);
  console.log(`  old: ${OLD_HOST}`);
  console.log(`  new: ${NEW_HOST}`);
  console.log(`  mode: ${APPLY ? 'APPLY (writing)' : 'DRY RUN (pass --apply to write)'}`);

  await backfillMessages();
  await backfillInvitationUrls();
  await backfillDeliverableVideos();

  console.log(`\n${APPLY ? '✅ Backfill complete.' : 'ℹ️  Dry run complete — re-run with --apply to write.'}\n`);
}

main()
  .catch((e) => {
    console.error('❌ R2 host backfill failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
