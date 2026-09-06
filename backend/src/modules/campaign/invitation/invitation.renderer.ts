import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { invitationFonts } from './invitation.fonts';
import { elegantTemplate } from './templates/elegant';
import type { InvitationData } from './invitation.types';
import { INVITATION_WIDTH, INVITATION_HEIGHT } from './invitation.types';

const TEMPLATES: Record<string, (d: InvitationData) => unknown> = {
  elegant: elegantTemplate,
};

// satori + Resvg each allocate a full-page SVG string and an RGBA bitmap
// (1080x1350 ≈ 5.8 MB raw, before PNG encode). regenerateForEvent /
// regenerateForBusiness fan out with Promise.all over *every* confirmed
// creator, so an event with dozens of participants would otherwise start that
// many renders at once and can OOM a small Render instance. This gate caps how
// many run concurrently across the whole process; the rest queue.
const MAX_CONCURRENT_RENDERS = 2;
let activeRenders = 0;
const renderQueue: (() => void)[] = [];

function acquireRenderSlot(): Promise<void> {
  if (activeRenders < MAX_CONCURRENT_RENDERS) {
    activeRenders++;
    return Promise.resolve();
  }
  // Queued — the slot count isn't bumped here; releaseRenderSlot hands the
  // slot straight to this waiter without ever dropping below the cap.
  return new Promise<void>((resolve) => renderQueue.push(resolve));
}

function releaseRenderSlot(): void {
  const next = renderQueue.shift();
  if (next) next();          // hand the slot to the next waiter
  else activeRenders--;      // nobody waiting — free it
}

// InvitationData -> 1080x1350 PNG buffer. Pure: no DB, no network beyond
// satori fetching the (already-public) business logo URL when present.
export async function renderInvitationPng(data: InvitationData): Promise<Buffer> {
  await acquireRenderSlot();
  try {
    return await renderInvitationPngInner(data);
  } finally {
    releaseRenderSlot();
  }
}

async function renderInvitationPngInner(data: InvitationData): Promise<Buffer> {
  const build = TEMPLATES[data.templateId] ?? elegantTemplate;

  const svg = await satori(build(data) as Parameters<typeof satori>[0], {
    width: INVITATION_WIDTH,
    height: INVITATION_HEIGHT,
    fonts: invitationFonts(),
  });

  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: INVITATION_WIDTH },
    font: { loadSystemFonts: false },
  }).render().asPng();

  return Buffer.from(png);
}
