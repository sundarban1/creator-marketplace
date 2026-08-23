import { Prisma, ServiceStatus } from '@prisma/client';
import prisma from '../../prisma';
import { expandSearchQuery, matchesAny } from '../../utils/searchTerms';
import type { CreateServiceInput, UpdateServiceInput } from './service.schema';

export class ServiceRepository {
  async findByCreatorProfileId(creatorProfileId: string) {
    return prisma.service.findMany({
      where: { creatorProfileId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ACTIVE only — for a provider's public profile (a business browsing them),
  // as opposed to findByCreatorProfileId above (the owner managing their own
  // listings, where every status needs to be visible).
  async findActiveByCreatorProfileId(creatorProfileId: string) {
    return prisma.service.findMany({
      where: { creatorProfileId, status: ServiceStatus.ACTIVE },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.service.findUnique({
      where: { id },
      include: { category: true, creatorProfile: true },
    });
  }

  async create(creatorProfileId: string, data: CreateServiceInput) {
    return prisma.service.create({
      data: {
        creatorProfileId,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        startingPrice: data.startingPrice,
        pricingModel: data.pricingModel,
        deliveryTime: data.deliveryTime,
        whatsIncluded: data.whatsIncluded ?? [],
      },
      include: { category: true },
    });
  }

  async update(id: string, data: UpdateServiceInput) {
    return prisma.service.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async delete(id: string) {
    return prisma.service.delete({ where: { id } });
  }

  // Public discovery — only ACTIVE services from verified-or-not creators alike
  // (verification is surfaced to the browsing business via the creator's own
  // isVerified flag, not gated here).
  //
  // Search spans the service itself (name, description, what's included) as
  // well as the provider behind it (category name and group, creator full
  // name/bio/location/categories/industries) — matching on name alone missed a
  // search like "wedding photographer" when "photographer" only appeared in
  // the creator's category or bio, not the service listing text. The
  // category's group is matched too, since that's where the umbrella term
  // lives: "music" has to find a DJ, whose category name never says music.
  //
  // Relevance ranking over expanded terms needs raw SQL (Prisma can't express
  // similarity() or a ranked ORDER BY), so a search takes the dedicated path
  // below — same split as CampaignRepository/BusinessRepository.
  async findManyPublic(params: { categoryId?: string; search?: string; page: number; limit: number }) {
    const search = params.search?.trim();
    if (search) {
      return this.findManyPublicSearch({ ...params, search });
    }
    const where: Prisma.ServiceWhereInput = {
      status: ServiceStatus.ACTIVE,
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: { category: true, creatorProfile: true },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.service.count({ where }),
    ]);
    return { items, total };
  }

  /**
   * Ranked search over public services and the people offering them.
   *
   * Every text field is matched against the expanded term set (see
   * expandSearchQuery), so searching "coffee" surfaces a barista's latte-art
   * package or a food photographer, not just listings with the literal word.
   * The person's own name and location stay on the literal query — expanding
   * those has no meaning. similarity() keeps typos working on the service name
   * and the provider's name.
   */
  private async findManyPublicSearch(params: { categoryId?: string; search: string; page: number; limit: number }) {
    const { search } = params;
    const q = expandSearchQuery(search);
    const like = `%${search}%`;

    const conditions: Prisma.Sql[] = [Prisma.sql`s.status = 'ACTIVE'::"ServiceStatus"`];
    if (params.categoryId) {
      conditions.push(Prisma.sql`s."categoryId" = ${params.categoryId}`);
    }
    conditions.push(Prisma.sql`(
      ${matchesAny(Prisma.sql`s.name`, q.all)}
      OR ${matchesAny(Prisma.sql`s.description`, q.all)}
      OR ${matchesAny(Prisma.sql`cat.name`, q.all)}
      OR ${matchesAny(Prisma.sql`COALESCE(cat."group", '')`, q.all)}
      OR ${matchesAny(Prisma.sql`cp.bio`, q.all)}
      OR cp."fullName" ILIKE ${like}
      OR cp.location ILIKE ${like}
      OR cp.city ILIKE ${like}
      OR cp.district ILIKE ${like}
      OR similarity(s.name, ${search}) > 0.2
      OR similarity(COALESCE(cp."fullName", ''), ${search}) > 0.2
      OR EXISTS (SELECT 1 FROM unnest(cp.categories) AS c WHERE ${matchesAny(Prisma.sql`c`, q.all)})
      OR EXISTS (SELECT 1 FROM unnest(cp.industries) AS i WHERE ${matchesAny(Prisma.sql`i`, q.all)})
      OR EXISTS (SELECT 1 FROM unnest(s."whatsIncluded") AS w WHERE ${matchesAny(Prisma.sql`w`, q.all)})
    )`);

    // Literal hits outrank related ones, and a hit on what the service is
    // outranks one on who is offering it.
    const rankExpr = Prisma.sql`
      CASE WHEN s.name ILIKE ${like} THEN 3 ELSE 0 END
      + CASE WHEN ${matchesAny(Prisma.sql`s.name`, q.all)} THEN 1.5 ELSE 0 END
      + CASE WHEN cat.name ILIKE ${like} THEN 1.5 ELSE 0 END
      + CASE WHEN ${matchesAny(Prisma.sql`cat.name`, q.all)} THEN 1 ELSE 0 END
      + CASE WHEN ${matchesAny(Prisma.sql`COALESCE(cat."group", '')`, q.all)} THEN 0.5 ELSE 0 END
      + CASE WHEN cp."fullName" ILIKE ${like} THEN 2 ELSE 0 END
      + CASE WHEN s.description ILIKE ${like} THEN 1 ELSE 0 END
      + CASE WHEN ${matchesAny(Prisma.sql`s.description`, q.all)} THEN 0.5 ELSE 0 END
      + GREATEST(similarity(s.name, ${search}), similarity(COALESCE(cp."fullName", ''), ${search}))
    `;

    const whereSql = Prisma.join(conditions, ' AND ');
    const skip = (params.page - 1) * params.limit;

    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT s.id
        FROM services s
        JOIN creator_profiles cp ON cp.id = s."creatorProfileId"
        JOIN categories cat ON cat.id = s."categoryId"
        WHERE ${whereSql}
        ORDER BY (${rankExpr}) DESC, s."createdAt" DESC
        LIMIT ${params.limit} OFFSET ${skip}
      `),
      prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM services s
        JOIN creator_profiles cp ON cp.id = s."creatorProfileId"
        JOIN categories cat ON cat.id = s."categoryId"
        WHERE ${whereSql}
      `),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    if (rows.length === 0) return { items: [], total };

    const ids = rows.map((r) => r.id);
    const hydrated = await prisma.service.findMany({
      where: { id: { in: ids } },
      include: { category: true, creatorProfile: true },
    });

    // findMany doesn't preserve `in` order, so re-sort to match the ranked SQL result
    const byId = new Map(hydrated.map((item) => [item.id, item]));
    const items = ids.map((id) => byId.get(id)).filter((item): item is NonNullable<typeof item> => item != null);

    return { items, total };
  }

  async findAllForAdmin(params: { status?: ServiceStatus; page: number; limit: number }) {
    const where = params.status ? { status: params.status } : {};
    const [items, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: { category: true, creatorProfile: true },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.service.count({ where }),
    ]);
    return { items, total };
  }

  async updateStatus(id: string, status: ServiceStatus) {
    return prisma.service.update({ where: { id }, data: { status } });
  }
}
