import { AppError } from '../../middleware/error';
import { HttpStatus } from '../../constants/httpStatus';
import { generateUniqueSlug } from '../../utils/slug';
import { CommunityEventRepository, type ChildRows, type CommunityEventFull } from './community-event.repository';
import { effectiveStatus, sectionFor } from './community-event.status';
import { zonedToUtc, utcToZoned, endOfLocalDay } from './community-event.time';
import type { CommunityEventInput } from './community-event.schema';

type StatusFields = Parameters<typeof effectiveStatus>[0] & {
  registrationEnabled: boolean;
  registrationUrl: string | null;
  registrationDeadline: Date | null;
};

/** Registration CTA shows only for an upcoming/ongoing event whose deadline hasn't passed. */
function registrationOpen(e: StatusFields, now = new Date()): boolean {
  if (!e.registrationEnabled || !e.registrationUrl) return false;
  if (sectionFor(effectiveStatus(e, now)) !== 'upcoming') return false;
  return !e.registrationDeadline || now <= e.registrationDeadline;
}

function toAdminDto(e: CommunityEventFull) {
  const start = utcToZoned(e.startDateTime, e.timezone);
  const end = e.endDateTime ? utcToZoned(e.endDateTime, e.timezone) : null;
  const status = effectiveStatus(e);
  return {
    ...e,
    // Wall-clock fields for the edit form, in the event's own timezone.
    startDate: start.date,
    startTime: start.time,
    endDate: end?.date ?? null,
    endTime: end?.time ?? null,
    registrationDeadline: e.registrationDeadline ? utcToZoned(e.registrationDeadline, e.timezone).date : null,
    status,
    section: sectionFor(status),
  };
}

function toPublicDetail(e: CommunityEventFull) {
  const { statusOverride: _o, published: _p, publishedAt: _pa, createdAt: _c, ...rest } = e;
  const status = effectiveStatus(e);
  return {
    ...rest,
    status,
    section: sectionFor(status),
    registrationOpen: registrationOpen(e),
  };
}

export class CommunityEventService {
  private repo = new CommunityEventRepository();

  private async resolveSlug(input: CommunityEventInput, currentId?: string): Promise<string> {
    if (input.slug) {
      const owner = await this.repo.findSlugOwner(input.slug);
      if (owner && owner.id !== currentId) {
        throw new AppError('That URL slug is already used by another event', HttpStatus.CONFLICT);
      }
      return input.slug;
    }
    return generateUniqueSlug(input.title, async (candidate) => {
      const owner = await this.repo.findSlugOwner(candidate);
      return !!owner && owner.id !== currentId;
    });
  }

  private toRows(input: CommunityEventInput) {
    const tz = input.timezone;
    const startDateTime = zonedToUtc(input.startDate, input.startTime, tz);
    // An end time without an end date means "same day as the start".
    const endDateTime = input.endTime ? zonedToUtc(input.endDate ?? input.startDate, input.endTime, tz) : null;
    if (endDateTime && endDateTime <= startDateTime) {
      throw new AppError('End must be after the start', HttpStatus.BAD_REQUEST);
    }
    const registrationDeadline = input.registrationDeadline
      ? endOfLocalDay(zonedToUtc(input.registrationDeadline, '12:00', tz), tz)
      : null;

    const scalars = {
      title: input.title,
      shortDescription: input.shortDescription,
      description: input.description ?? null,
      eventType: input.eventType,
      statusOverride: input.statusOverride ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
      startDateTime,
      endDateTime,
      timezone: tz,
      venueName: input.venueName ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      country: input.country ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      mapsUrl: input.mapsUrl ?? null,
      videoUrl: input.videoUrl ?? null,
      registrationEnabled: input.registrationEnabled,
      registrationUrl: input.registrationUrl ?? null,
      registrationDeadline,
      maxAttendees: input.maxAttendees ?? null,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      ogImageUrl: input.ogImageUrl ?? null,
      featured: input.featured,
      published: input.published,
    };
    const children: ChildRows = {
      images: input.images.map((i) => ({ url: i.url, caption: i.caption ?? null })),
      speakers: input.speakers.map((s) => ({
        name: s.name, imageUrl: s.imageUrl ?? null, role: s.role ?? null,
        organization: s.organization ?? null, bio: s.bio ?? null, profileUrl: s.profileUrl ?? null,
      })),
      highlights: input.highlights.map((h) => ({ title: h.title, description: h.description ?? null, imageUrl: h.imageUrl ?? null })),
      agenda: input.agenda.map((a) => ({ time: a.time ?? null, title: a.title, description: a.description ?? null })),
      partners: input.partners.map((p) => ({ name: p.name, logoUrl: p.logoUrl ?? null, websiteUrl: p.websiteUrl ?? null })),
    };
    return { scalars, children };
  }

  private async getOrThrow(id: string) {
    const event = await this.repo.findById(id);
    if (!event) throw new AppError('Event not found', HttpStatus.NOT_FOUND);
    return event;
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  async listForAdmin() {
    const rows = await this.repo.listAll();
    return rows.map((e) => {
      const status = effectiveStatus(e);
      return { ...e, status, section: sectionFor(status) };
    });
  }

  async getForAdmin(id: string) {
    return toAdminDto(await this.getOrThrow(id));
  }

  async create(input: CommunityEventInput) {
    const slug = await this.resolveSlug(input);
    const { scalars, children } = this.toRows(input);
    const event = await this.repo.create(
      { ...scalars, slug, publishedAt: scalars.published ? new Date() : null },
      children,
    );
    return toAdminDto(event);
  }

  async update(id: string, input: CommunityEventInput) {
    const existing = await this.getOrThrow(id);
    const slug = await this.resolveSlug(input, id);
    const { scalars, children } = this.toRows(input);
    // publishedAt records the first publish; unpublishing keeps it.
    const publishedAt = scalars.published && !existing.publishedAt ? new Date() : existing.publishedAt;
    const event = await this.repo.update(id, { ...scalars, slug, publishedAt }, children);
    return toAdminDto(event);
  }

  async setPublished(id: string, published: boolean) {
    const existing = await this.getOrThrow(id);
    if (published && !existing.coverImageUrl) {
      throw new AppError('Add a cover image before publishing', HttpStatus.BAD_REQUEST);
    }
    const publishedAt = published && !existing.publishedAt ? new Date() : undefined;
    return toAdminDto(await this.repo.setPublished(id, published, publishedAt));
  }

  async remove(id: string) {
    await this.getOrThrow(id);
    await this.repo.delete(id);
  }

  // ── Public ───────────────────────────────────────────────────────────────

  /** Published events split into upcoming (soonest first) and past (most recent first). */
  async listPublic() {
    const now = new Date();
    const rows = await this.repo.listPublished();
    const upcoming: ReturnType<typeof toCard>[] = [];
    const past: ReturnType<typeof toCard>[] = [];
    for (const e of rows) {
      const card = toCard(e, now);
      if (card.section === 'upcoming') upcoming.push(card);
      else if (card.section === 'past') past.push(card);
    }
    past.reverse();
    return { upcoming, past };
  }

  async getPublicBySlug(slug: string) {
    const event = await this.repo.findPublishedBySlug(slug);
    if (!event) throw new AppError('Event not found', HttpStatus.NOT_FOUND);
    return toPublicDetail(event);
  }
}

function toCard(e: Awaited<ReturnType<CommunityEventRepository['listPublished']>>[number], now: Date) {
  const { statusOverride: _o, registrationUrl, registrationEnabled: _r, registrationDeadline: _d, ...rest } = e;
  const status = effectiveStatus(e, now);
  const open = registrationOpen(e, now);
  return { ...rest, status, section: sectionFor(status), registrationOpen: open, registrationUrl: open ? registrationUrl : null };
}
