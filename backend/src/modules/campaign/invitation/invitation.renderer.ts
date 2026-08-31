import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { invitationFonts } from './invitation.fonts';
import { elegantTemplate } from './templates/elegant';
import type { InvitationData } from './invitation.types';
import { INVITATION_WIDTH, INVITATION_HEIGHT } from './invitation.types';

const TEMPLATES: Record<string, (d: InvitationData) => unknown> = {
  elegant: elegantTemplate,
};

// InvitationData -> 1080x1350 PNG buffer. Pure: no DB, no network beyond
// satori fetching the (already-public) business logo URL when present.
export async function renderInvitationPng(data: InvitationData): Promise<Buffer> {
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
