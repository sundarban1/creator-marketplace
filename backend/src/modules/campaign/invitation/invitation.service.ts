import { prisma } from '../../../prisma';
import { AppError } from '../../../middleware/error';
import { getDict } from '../../../i18n';
import { logger } from '../../../config/logger';
import * as r2 from '../../../services/r2.service';
import { renderInvitationPng } from './invitation.renderer';
import type { InvitationData, InvitationResult } from './invitation.types';
import { INVITATION_WIDTH, INVITATION_HEIGHT } from './invitation.types';

import { HttpStatus } from '../../../constants/httpStatus';

const TZ = 'Asia/Kathmandu';
const DEFAULT_TEMPLATE = 'elegant';

// ── formatting helpers ───────────────────────────────────────────────────────

function formatDateLabel(d: Date | null): string {
  if (!d) return 'Date to be announced';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(d);
}

// The open-event start time is stored separately as "HH:mm" (Campaign.eventTime,
// Asia/Kathmandu) — eventDate itself stays pinned to start-of-day. Empty/absent
// or malformed -> the row is omitted (§22).
function formatTimeLabel(hhmm: string | null): string {
  if (!hhmm) return '';
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!m) return '';
  let h = Number(m[1]);
  const min = m[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${min} ${ampm}`;
}

// satori fetches <img src> itself and throws the whole render if that fetch
// fails — so remote images (host logo, creator avatar) are pre-resolved to a
// data URI here with a short timeout, and simply dropped if they can't be had.
async function resolveImageDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? 'image/png';
    if (!type.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 2_000_000) return null;
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

// A stored invitationImageUrl can go stale: R2's public URL was misconfigured
// when it was written, public access to the bucket was toggled off/on, or the
// object was pruned out-of-band. The read path checks the URL is actually
// fetchable by an unauthenticated client (which is all the mobile app is) and
// regenerates if not. Fail OPEN on a network error/timeout — a transient blip
// on this server shouldn't trigger a needless re-render; only a definitive
// "not there / not allowed" response counts as unreachable.
async function isPubliclyReachable(url: string): Promise<boolean> {
  const check = async (method: 'HEAD' | 'GET') => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      return await fetch(url, {
        method,
        signal: ctrl.signal,
        headers: method === 'GET' ? { Range: 'bytes=0-0' } : undefined,
      });
    } finally {
      clearTimeout(timer);
    }
  };
  try {
    let res = await check('HEAD');
    // Some edges don't answer HEAD on public objects — confirm with a 1-byte GET.
    if (res.status === 405 || res.status === 501) res = await check('GET');
    if (res.ok || res.status === 206 || res.status === 304) return true;
    if ([401, 403, 404, 410].includes(res.status)) return false;
    return true; // any other status (5xx, 429, …) — don't treat as a hard miss
  } catch {
    return true; // network error / timeout — fail open
  }
}

// ── data assembly ────────────────────────────────────────────────────────────

type ApplicationWithContext = NonNullable<Awaited<ReturnType<typeof loadApplication>>>;

function loadApplication(applicationId: string) {
  return prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true, status: true, campaignId: true,
      invitationImageKey: true, invitationVersion: true, invitationTemplateId: true,
      creator: { select: { fullName: true, avatarUrl: true } },
      campaign: {
        select: {
          id: true, title: true, description: true, eventDate: true, eventTime: true,
          venue: true, location: true, locationType: true, campaignType: true, template: true,
          business: { select: { businessName: true, logoUrl: true } },
        },
      },
    },
  });
}

async function buildInvitationData(app: ApplicationWithContext, nextVersion: number): Promise<InvitationData> {
  const c = app.campaign;
  return {
    eventTitle: c.title,
    description: (c.description ?? '').trim(),
    dateLabel: formatDateLabel(c.eventDate),
    timeLabel: formatTimeLabel(c.eventTime),
    locationLabel: (c.venue || c.location || '').trim(),
    isOnline: c.locationType === 'REMOTE',
    businessName: c.business?.businessName?.trim() || 'The Organizer',
    businessLogoUrl: await resolveImageDataUri(c.business?.logoUrl ?? null),
    creatorName: (app.creator?.fullName ?? '').trim(),
    creatorAvatarUrl: await resolveImageDataUri(app.creator?.avatarUrl ?? null),
    templateId: app.invitationTemplateId || c.template || DEFAULT_TEMPLATE,
    version: nextVersion,
  };
}

function r2Key(campaignId: string, applicationId: string, version: number): string {
  return `events/${campaignId}/participants/${applicationId}/invitation-v${version}.png`;
}

// ── generation ───────────────────────────────────────────────────────────────

// Renders the PNG, uploads it to R2, deletes the previous version's object and
// persists the new url/key/version on the Application. No-ops (returns null)
// when R2 is not configured — the GET endpoint then renders on demand so a
// dev box without R2 still works.
export async function generateAndStore(applicationId: string): Promise<InvitationResult | null> {
  const app = await loadApplication(applicationId);
  if (!app) throw new AppError(getDict().campaign.applicationNotFound, HttpStatus.NOT_FOUND);
  if (app.status !== 'ACCEPTED') throw new AppError(getDict().campaign.creatorNotConfirmedForEvent, HttpStatus.BAD_REQUEST);
  if (app.campaign.campaignType !== 'OPEN_EVENT') {
    throw new AppError(getDict().campaign.invitationsOnlyForOpenEvents, HttpStatus.BAD_REQUEST);
  }
  if (!r2.isConfigured()) {
    logger.warn({ applicationId }, 'invitation: R2 not configured, skipping generate-and-store');
    return null;
  }

  const nextVersion = (app.invitationVersion ?? 0) + 1;
  const data = await buildInvitationData(app, nextVersion);
  const png = await renderInvitationPng(data);

  const key = r2Key(app.campaignId, app.id, nextVersion);
  await r2.putObject(key, png, 'image/png');
  const url = r2.publicUrlFor(key);
  if (!url) throw new AppError('R2 public URL is not configured', HttpStatus.INTERNAL_SERVER_ERROR);

  const previousKey = app.invitationImageKey;

  await prisma.application.update({
    where: { id: app.id },
    data: {
      invitationImageUrl: url,
      invitationImageKey: key,
      invitationTemplateId: data.templateId,
      invitationVersion: nextVersion,
      invitationGeneratedAt: new Date(),
    },
  });

  if (previousKey && previousKey !== key) {
    r2.deleteObject(previousKey).catch((err: unknown) =>
      logger.warn({ err, previousKey }, 'invitation: failed to delete superseded PNG'),
    );
  }

  return { imageUrl: url, format: 'png', width: INVITATION_WIDTH, height: INVITATION_HEIGHT, version: nextVersion };
}

// ── read path (creator) ──────────────────────────────────────────────────────

export async function getForCreator(campaignId: string, userId: string): Promise<InvitationResult> {
  const creator = await prisma.creatorProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!creator) throw new AppError(getDict().campaign.creatorProfileNotFound, HttpStatus.NOT_FOUND);

  const app = await prisma.application.findFirst({
    where: { campaignId, creatorId: creator.id, status: 'ACCEPTED' },
    select: {
      id: true,
      invitationImageUrl: true, invitationVersion: true,
      campaign: { select: { campaignType: true } },
    },
  });
  if (!app) throw new AppError(getDict().campaign.noConfirmedInvitationForEvent, HttpStatus.NOT_FOUND);
  if (app.campaign.campaignType !== 'OPEN_EVENT') {
    throw new AppError(getDict().campaign.invitationsOnlyForOpenEvents, HttpStatus.NOT_FOUND);
  }

  if (app.invitationImageUrl) {
    // Serve the stored PNG, but only if a plain client can actually fetch it —
    // otherwise regenerate (rebuilds the URL from the current R2_PUBLIC_URL and
    // re-uploads the object).
    if (await isPubliclyReachable(app.invitationImageUrl)) {
      return {
        imageUrl: app.invitationImageUrl,
        format: 'png',
        width: INVITATION_WIDTH,
        height: INVITATION_HEIGHT,
        version: app.invitationVersion ?? 1,
      };
    }
    logger.warn(
      { applicationId: app.id, url: app.invitationImageUrl },
      'invitation: stored image URL is not publicly reachable — regenerating',
    );
    const healed = await generateAndStore(app.id).catch((err) => {
      logger.error({ err, applicationId: app.id }, 'invitation: regeneration of unreachable image failed');
      return null;
    });
    // If the regenerate also failed (e.g. R2 still misconfigured), fall back to
    // the stale URL — the client's own network may have been the problem.
    return healed ?? {
      imageUrl: app.invitationImageUrl,
      format: 'png',
      width: INVITATION_WIDTH,
      height: INVITATION_HEIGHT,
      version: app.invitationVersion ?? 1,
    };
  }

  // Never generated (or generated while R2 was down) — self-heal.
  const generated = await generateAndStore(app.id).catch((err) => {
    logger.error({ err, applicationId: app.id }, 'invitation: on-demand generation failed');
    return null;
  });
  if (!generated) throw new AppError(getDict().campaign.couldNotPrepareInvitation, HttpStatus.SERVICE_UNAVAILABLE);
  return generated;
}

// ── regeneration (event / business edits) ────────────────────────────────────

// Fire-and-forget: refresh every confirmed creator's invitation after an
// invitation-visible field changed. Errors are logged, never thrown — the
// edit that triggered this has already been committed.
export async function regenerateForEvent(campaignId: string): Promise<void> {
  const apps = await prisma.application.findMany({
    where: { campaignId, status: 'ACCEPTED', invitationVersion: { gt: 0 } },
    select: { id: true },
  });
  if (apps.length === 0) return;

  const results = await Promise.allSettled(apps.map((a) => generateAndStore(a.id)));
  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed > 0) {
    logger.warn({ campaignId, failed, total: apps.length }, 'invitation: some regenerations failed');
  }
}

// Fire-and-forget: the organizer changed their name or logo — refresh every
// confirmed creator's invitation across all of this business's open events.
export async function regenerateForBusiness(businessId: string): Promise<void> {
  const campaigns = await prisma.campaign.findMany({
    where: { businessId, campaignType: 'OPEN_EVENT', deletedAt: null },
    select: { id: true },
  });
  await Promise.allSettled(campaigns.map((c) => regenerateForEvent(c.id)));
}

export const invitationService = {
  generateAndStore,
  getForCreator,
  regenerateForEvent,
  regenerateForBusiness,
};
