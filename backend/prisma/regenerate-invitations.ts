// One-shot: re-render every already-generated open-event invitation PNG so a
// template change (colours, layout, copy) reaches invitations that were minted
// before the change. The read path (invitationService.getForCreator) returns the
// stored PNG as-is and only regenerates when none exists, so without this the old
// image lives on R2 forever unless the event or the organizer is edited.
//
// Idempotent: bumps invitationVersion each run and deletes the superseded object.
// Safe to run on every environment after deploying a new template.
//
// Usage: npx tsx prisma/regenerate-invitations.ts   (or: npm run invitations:regenerate)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The production Docker image (and the Render server shell) only ships dist/ +
// prisma/, not src/, so this tsx script can't statically import from ../src. Load
// the compiled service from dist/ when it's there, and fall back to src/ for local
// runs straight from a checkout (run `npm run build` first in that case).
async function loadInvitationService() {
  try {
    return (await import('../dist/modules/campaign/invitation/invitation.service.js')).invitationService;
  } catch {
    return (await import('../src/modules/campaign/invitation/invitation.service')).invitationService;
  }
}

async function main() {
  const invitationService = await loadInvitationService();

  const apps = await prisma.application.findMany({
    where: { status: 'ACCEPTED', invitationVersion: { gt: 0 }, campaign: { campaignType: 'OPEN_EVENT' } },
    select: { id: true, campaignId: true },
  });
  console.log(`\n🎨 Regenerating ${apps.length} open-event invitation PNG(s)…\n`);

  let ok = 0;
  let failed = 0;
  for (const app of apps) {
    try {
      const res = await invitationService.generateAndStore(app.id);
      if (res) {
        ok += 1;
        console.log(`  ✓ ${app.id} → v${res.version}`);
      } else {
        failed += 1;
        console.log(`  ⚠ ${app.id} — R2 not configured, skipped`);
      }
    } catch (e) {
      failed += 1;
      console.log(`  ✗ ${app.id} — ${(e as Error).message}`);
    }
  }

  console.log(`\n✅ Done: ${ok} regenerated, ${failed} skipped/failed.\n`);
}

main()
  .catch((e) => {
    console.error('❌ Invitation regeneration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
