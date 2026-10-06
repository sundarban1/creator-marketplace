import prisma from '../../prisma';
import type { Prisma } from '@prisma/client';

const ordered = { orderBy: { order: 'asc' as const } };

export const fullInclude = {
  images: ordered,
  speakers: ordered,
  highlights: ordered,
  agenda: ordered,
  partners: ordered,
} satisfies Prisma.CommunityEventInclude;

export type CommunityEventFull = Prisma.CommunityEventGetPayload<{ include: typeof fullInclude }>;

export type ChildRows = {
  images: Omit<Prisma.CommunityEventImageCreateManyEventInput, 'order'>[];
  speakers: Omit<Prisma.CommunityEventSpeakerCreateManyEventInput, 'order'>[];
  highlights: Omit<Prisma.CommunityEventHighlightCreateManyEventInput, 'order'>[];
  agenda: Omit<Prisma.CommunityEventAgendaItemCreateManyEventInput, 'order'>[];
  partners: Omit<Prisma.CommunityEventPartnerCreateManyEventInput, 'order'>[];
};

// Array position is the display order — the admin form reorders by moving rows.
const withOrder = <T>(rows: T[]) => rows.map((r, order) => ({ ...r, order }));

function nestedCreate(children: ChildRows) {
  return {
    images: { createMany: { data: withOrder(children.images) } },
    speakers: { createMany: { data: withOrder(children.speakers) } },
    highlights: { createMany: { data: withOrder(children.highlights) } },
    agenda: { createMany: { data: withOrder(children.agenda) } },
    partners: { createMany: { data: withOrder(children.partners) } },
  };
}

export class CommunityEventRepository {
  async create(data: Omit<Prisma.CommunityEventCreateInput, keyof ChildRows>, children: ChildRows) {
    return prisma.communityEvent.create({ data: { ...data, ...nestedCreate(children) }, include: fullInclude });
  }

  /** Full replace: scalar fields updated, every child list swapped for the submitted one. */
  async update(id: string, data: Omit<Prisma.CommunityEventUpdateInput, keyof ChildRows>, children: ChildRows) {
    return prisma.$transaction(async (tx) => {
      await Promise.all([
        tx.communityEventImage.deleteMany({ where: { eventId: id } }),
        tx.communityEventSpeaker.deleteMany({ where: { eventId: id } }),
        tx.communityEventHighlight.deleteMany({ where: { eventId: id } }),
        tx.communityEventAgendaItem.deleteMany({ where: { eventId: id } }),
        tx.communityEventPartner.deleteMany({ where: { eventId: id } }),
      ]);
      return tx.communityEvent.update({ where: { id }, data: { ...data, ...nestedCreate(children) }, include: fullInclude });
    });
  }

  async setPublished(id: string, published: boolean, publishedAt: Date | null | undefined) {
    return prisma.communityEvent.update({
      where: { id },
      data: { published, ...(publishedAt !== undefined && { publishedAt }) },
      include: fullInclude,
    });
  }

  async findById(id: string) {
    return prisma.communityEvent.findUnique({ where: { id }, include: fullInclude });
  }

  async findPublishedBySlug(slug: string) {
    return prisma.communityEvent.findFirst({ where: { slug, published: true }, include: fullInclude });
  }

  async findSlugOwner(slug: string) {
    return prisma.communityEvent.findUnique({ where: { slug }, select: { id: true } });
  }

  async listAll() {
    return prisma.communityEvent.findMany({
      orderBy: { startDateTime: 'desc' },
      include: { _count: { select: { images: true, speakers: true } } },
    });
  }

  /** Card-sized rows for the public listing — gallery etc. stay on the detail page. */
  async listPublished() {
    return prisma.communityEvent.findMany({
      where: { published: true },
      orderBy: { startDateTime: 'asc' },
      select: {
        id: true, slug: true, title: true, shortDescription: true, eventType: true,
        coverImageUrl: true, startDateTime: true, endDateTime: true, timezone: true,
        statusOverride: true, venueName: true, city: true, country: true,
        registrationEnabled: true, registrationUrl: true, registrationDeadline: true, featured: true,
      },
    });
  }

  async delete(id: string) {
    await prisma.communityEvent.delete({ where: { id } });
  }
}
