import { Prisma } from '@prisma/client';
import prisma from '../../prisma';

// ───────────────────────────────────────────────────────────────────────────────
// Admin Proposals view — one paginated list over two kinds of record:
//
//   PROPOSAL   — an Application the creator actually submitted (status PENDING /
//                SHORTLISTED / ACCEPTED / REJECTED / WITHDRAWN / EXPIRED).
//   INVITATION — an invited creator who never submitted (DEADLINE_MISSED, or
//                EXPIRED when the business closed the opportunity first).
//
// An on-time PENDING proposal is never shown as deadline-missed, whatever the
// application deadline says — that label only exists on invitations.
// ───────────────────────────────────────────────────────────────────────────────

export const PROPOSAL_FILTERS = ['all', 'pending', 'accepted', 'rejected', 'deadline_missed', 'expired', 'withdrawn'] as const;
export type ProposalFilter = (typeof PROPOSAL_FILTERS)[number];

export interface ProposalListQuery {
  filter: ProposalFilter;
  search?: string;
  sort?: 'submittedAt' | 'deadline' | 'createdAt';
  order?: 'asc' | 'desc';
  page: number;
  limit: number;
}

type Row = {
  kind: 'PROPOSAL' | 'INVITATION';
  id: string;
  creatorId: string;
  creatorName: string | null;
  businessId: string;
  businessName: string | null;
  campaignId: string;
  campaignTitle: string;
  campaignStatus: string;
  campaignType: string;
  applicationDeadline: Date | null;
  status: string;
  submittedAt: Date | null;
  decidedAt: Date | null;
  closedAt: Date | null;
  closedReason: string | null;
  workStatus: string | null;
  refundRequestId: string | null;
  refundStatus: string | null;
  createdAt: Date;
};

function proposalStatuses(filter: ProposalFilter): string[] | null {
  switch (filter) {
    case 'all':             return ['PENDING', 'SHORTLISTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED'];
    case 'pending':         return ['PENDING', 'SHORTLISTED'];
    case 'accepted':        return ['ACCEPTED'];
    case 'rejected':        return ['REJECTED'];
    case 'withdrawn':       return ['WITHDRAWN'];
    case 'expired':         return ['EXPIRED'];
    case 'deadline_missed': return null;
  }
}

function invitationStatuses(filter: ProposalFilter): string[] | null {
  switch (filter) {
    case 'all':             return ['DEADLINE_MISSED', 'EXPIRED'];
    case 'deadline_missed': return ['DEADLINE_MISSED'];
    case 'expired':         return ['EXPIRED'];
    default:                return null;
  }
}

function unionSql(filter: ProposalFilter, search?: string): Prisma.Sql {
  const like = search?.trim() ? `%${search.trim()}%` : null;
  const parts: Prisma.Sql[] = [];

  const ps = proposalStatuses(filter);
  if (ps) {
    parts.push(Prisma.sql`
      SELECT 'PROPOSAL' AS kind, a.id, a."creatorId", cp."fullName" AS "creatorName",
             b.id AS "businessId", b."businessName", c.id AS "campaignId", c.title AS "campaignTitle",
             c.status::text AS "campaignStatus", c."campaignType"::text AS "campaignType", c."applicationDeadline",
             a.status::text AS status, a."createdAt" AS "submittedAt", dec."createdAt" AS "decidedAt",
             NULL::timestamp AS "closedAt", NULL::text AS "closedReason", a."workStatus"::text AS "workStatus",
             rr.id AS "refundRequestId", rr.status::text AS "refundStatus", a."createdAt"
      FROM applications a
      JOIN campaigns c ON c.id = a."campaignId"
      JOIN business_profiles b ON b.id = c."businessId"
      JOIN creator_profiles cp ON cp.id = a."creatorId"
      LEFT JOIN LATERAL (
        SELECT e."createdAt" FROM campaign_events e
        WHERE e."applicationId" = a.id AND e.axis = 'application' AND e."toStatus" IN ('ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED')
        ORDER BY e."createdAt" DESC LIMIT 1
      ) dec ON true
      LEFT JOIN LATERAL (
        SELECT r.id, r.status FROM refund_requests r WHERE r."applicationId" = a.id AND r.status <> 'CANCELLED'
        ORDER BY r."createdAt" DESC LIMIT 1
      ) rr ON true
      WHERE a.status::text IN (${Prisma.join(ps)})
        ${like ? Prisma.sql`AND (cp."fullName" ILIKE ${like} OR b."businessName" ILIKE ${like} OR c.title ILIKE ${like} OR a.id = ${search!.trim()} OR a."creatorId" = ${search!.trim()})` : Prisma.empty}
    `);
  }

  const is = invitationStatuses(filter);
  if (is) {
    parts.push(Prisma.sql`
      SELECT 'INVITATION' AS kind, i.id, i."creatorId", cp."fullName" AS "creatorName",
             b.id AS "businessId", b."businessName", c.id AS "campaignId", c.title AS "campaignTitle",
             c.status::text AS "campaignStatus", c."campaignType"::text AS "campaignType", c."applicationDeadline",
             i.status::text AS status, NULL::timestamp AS "submittedAt", NULL::timestamp AS "decidedAt",
             i."closedAt", i."closedReason", NULL::text AS "workStatus",
             NULL::text AS "refundRequestId", NULL::text AS "refundStatus", i."createdAt"
      FROM campaign_invitations i
      JOIN campaigns c ON c.id = i."campaignId"
      JOIN business_profiles b ON b.id = c."businessId"
      JOIN creator_profiles cp ON cp.id = i."creatorId"
      WHERE i.status::text IN (${Prisma.join(is)})
        ${like ? Prisma.sql`AND (cp."fullName" ILIKE ${like} OR b."businessName" ILIKE ${like} OR c.title ILIKE ${like} OR i.id = ${search!.trim()} OR i."creatorId" = ${search!.trim()})` : Prisma.empty}
    `);
  }
  return Prisma.join(parts, ' UNION ALL ');
}

export async function listAdminProposals(q: ProposalListQuery) {
  const union = unionSql(q.filter, q.search);
  const dir = q.order === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const sortCol =
    q.sort === 'deadline'    ? Prisma.sql`u."applicationDeadline"`
    : q.sort === 'createdAt' ? Prisma.sql`u."createdAt"`
    : Prisma.sql`COALESCE(u."submittedAt", u."closedAt", u."createdAt")`;
  const offset = (q.page - 1) * q.limit;

  const [rows, totalRows, propCounts, invCounts] = await Promise.all([
    prisma.$queryRaw<Row[]>`SELECT * FROM (${union}) u ORDER BY ${sortCol} ${dir} NULLS LAST, u.id ASC LIMIT ${q.limit} OFFSET ${offset}`,
    prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*)::bigint AS n FROM (${union}) u`,
    prisma.application.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.campaignInvitation.groupBy({ by: ['status'], where: { status: { in: ['DEADLINE_MISSED', 'EXPIRED'] } }, _count: { _all: true } }),
  ]);

  const p = (s: string) => propCounts.find((c) => c.status === s)?._count._all ?? 0;
  const i = (s: string) => invCounts.find((c) => c.status === s)?._count._all ?? 0;
  const counts: Record<ProposalFilter, number> = {
    pending: p('PENDING') + p('SHORTLISTED'),
    accepted: p('ACCEPTED'),
    rejected: p('REJECTED'),
    withdrawn: p('WITHDRAWN'),
    deadline_missed: i('DEADLINE_MISSED'),
    expired: p('EXPIRED') + i('EXPIRED'),
    all: 0,
  };
  counts.all = counts.pending + counts.accepted + counts.rejected + counts.withdrawn + counts.deadline_missed + counts.expired;

  return {
    items: rows.map((r) => {
      const submittedOnTime = r.submittedAt == null ? null : !r.applicationDeadline || r.submittedAt <= r.applicationDeadline;
      return {
        kind: r.kind,
        id: r.id,
        creator: { id: r.creatorId, name: r.creatorName },
        business: { id: r.businessId, name: r.businessName },
        campaign: { id: r.campaignId, title: r.campaignTitle, status: r.campaignStatus, type: r.campaignType },
        // INVITATION rows have no proposal — `status` is the invitation's.
        status: r.status,
        applicationDeadline: r.applicationDeadline?.toISOString() ?? null,
        submittedAt: r.submittedAt?.toISOString() ?? null,
        submittedOnTime,
        decidedAt: r.decidedAt?.toISOString() ?? null,
        closedAt: r.closedAt?.toISOString() ?? null,
        reason: r.closedReason,
        deliverable: r.kind === 'PROPOSAL' && r.status === 'ACCEPTED' ? { applicationId: r.id, workStatus: r.workStatus } : null,
        refundRequest: r.refundRequestId ? { id: r.refundRequestId, status: r.refundStatus } : null,
      };
    }),
    total: Number(totalRows[0]?.n ?? 0),
    page: q.page,
    limit: q.limit,
    counts,
  };
}
