// Account-level blocking (UGC safety). A block is:
//   - immediate and self-service: no admin approval, enforced server-side
//     from the moment the row exists (messaging, discovery, profiles,
//     invitations/applications — see `hiddenFor` callers);
//   - symmetric in effect: neither side sees the other's content or can start
//     new interactions, whichever of them created the block;
//   - private: the blocked person is never told;
//   - a safety signal for Kolab: every block writes a USER_BLOCKED
//     ModerationEvent and alerts admins — but is never itself proof of
//     wrongdoing, so nothing is enforced against the blocked account.
// Existing contracts, payments and history are deliberately left untouched.
import { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import { AppError } from '../../middleware/error';
import { HttpStatus } from '../../constants/httpStatus';
import { logger } from '../../config/logger';
import { notificationService } from '../notifications/notification.service';
import { emitToUser } from '../../socket';
import { cached, invalidate } from '../../utils/cache';

// Feed/discovery queries call hiddenFor() on every request, so the expanded
// set is cached per user (Redis, best-effort) and invalidated for BOTH sides
// on block/unblock. Users with no blocks cost one indexed query on a miss.
const HIDDEN_TTL_SECONDS = 300;
const hiddenKey = (userId: string) => `blocks:hidden:${userId}`;
async function invalidateHidden(a: string, b: string) {
  await invalidate(hiddenKey(a), hiddenKey(b)).catch(() => {});
}

export interface HiddenSet {
  userIds: string[];
  creatorProfileIds: string[];
  businessProfileIds: string[];
}

const EMPTY: HiddenSet = { userIds: [], creatorProfileIds: [], businessProfileIds: [] };

export const ADMIN_NOTIFICATION_TYPE = {
  REPORT: 'moderation_report',
  REPORT_URGENT: 'moderation_report_urgent',
  BLOCK: 'moderation_block',
  ASSIGNED: 'moderation_assigned',
  HELD: 'moderation_content_held',
} as const;

/** Every userId hidden from `userId` — people they blocked AND people who blocked them. */
export async function hiddenUserIds(userId: string | undefined | null): Promise<string[]> {
  if (!userId) return [];
  const rows = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set<string>();
  for (const r of rows) ids.add(r.blockerId === userId ? r.blockedId : r.blockerId);
  return [...ids];
}

/** hiddenUserIds expanded to profile ids, for queries keyed on creator/business profiles. */
export async function hiddenFor(userId: string | undefined | null): Promise<HiddenSet> {
  if (!userId) return EMPTY;
  return cached(hiddenKey(userId), HIDDEN_TTL_SECONDS, () => loadHidden(userId));
}

async function loadHidden(userId: string): Promise<HiddenSet> {
  const userIds = await hiddenUserIds(userId);
  if (!userIds.length) return EMPTY;
  const [creators, businesses] = await Promise.all([
    prisma.creatorProfile.findMany({ where: { userId: { in: userIds } }, select: { id: true } }),
    prisma.businessProfile.findMany({ where: { userId: { in: userIds } }, select: { id: true } }),
  ]);
  return { userIds, creatorProfileIds: creators.map((c) => c.id), businessProfileIds: businesses.map((b) => b.id) };
}

export async function isBlockedEitherWay(a: string, b: string): Promise<boolean> {
  if (!a || !b || a === b) return false;
  const row = await prisma.block.findFirst({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
    select: { id: true },
  });
  return !!row;
}

/** Throws 403 when either user has blocked the other — for any new interaction. */
export async function assertCanInteract(a: string, b: string, message = 'You can’t interact with this account.'): Promise<void> {
  if (await isBlockedEitherWay(a, b)) throw new AppError(message, HttpStatus.FORBIDDEN, true, { code: 'USER_BLOCKED' });
}

function displayName(u: { creatorProfile: { fullName: string | null; username: string | null; avatarUrl: string | null } | null; businessProfile: { businessName: string | null; logoUrl: string | null } | null }) {
  if (u.creatorProfile) return { name: u.creatorProfile.fullName ?? u.creatorProfile.username ?? 'Creator', avatarUrl: u.creatorProfile.avatarUrl };
  if (u.businessProfile) return { name: u.businessProfile.businessName ?? 'Business', avatarUrl: u.businessProfile.logoUrl };
  return { name: 'Kolab user', avatarUrl: null };
}

const PROFILE_SELECT = {
  id: true,
  role: true,
  creatorProfile: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
  businessProfile: { select: { id: true, businessName: true, logoUrl: true } },
} satisfies Prisma.UserSelect;

/** Accepts a userId, creatorProfile id or businessProfile id. */
export async function resolveUserId(idOrProfileId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: idOrProfileId }, select: { id: true } });
  if (user) return user.id;
  const c = await prisma.creatorProfile.findUnique({ where: { id: idOrProfileId }, select: { userId: true } });
  if (c) return c.userId;
  const b = await prisma.businessProfile.findUnique({ where: { id: idOrProfileId }, select: { userId: true } });
  return b?.userId ?? null;
}

export const blockService = {
  async block(blockerId: string, targetIdOrProfileId: string, context: { source?: string; conversationId?: string } = {}) {
    const blockedId = await resolveUserId(targetIdOrProfileId);
    if (!blockedId) throw new AppError('User not found', HttpStatus.NOT_FOUND);
    if (blockedId === blockerId) throw new AppError('You can’t block yourself', HttpStatus.BAD_REQUEST);
    const target = await prisma.user.findUnique({ where: { id: blockedId }, select: PROFILE_SELECT });
    if (!target) throw new AppError('User not found', HttpStatus.NOT_FOUND);
    if (target.role === 'ADMIN') throw new AppError('This account can’t be blocked', HttpStatus.BAD_REQUEST);

    const existing = await prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId, blockedId } } });
    if (existing) return { blocked: true, userId: blockedId, blockedAt: existing.createdAt };

    // Block + safety event commit together — the admin signal can never be
    // missing for a block that exists.
    const { block, event } = await prisma.$transaction(async (tx) => {
      const block = await tx.block.create({ data: { blockerId, blockedId } });
      const event = await tx.moderationEvent.create({
        data: {
          type: 'USER_BLOCKED',
          actorUserId: blockerId,
          targetUserId: blockedId,
          metadata: { source: context.source ?? null, conversationId: context.conversationId ?? null, targetRole: target.role },
        },
      });
      return { block, event };
    }).catch((err) => {
      // Two taps racing: the unique constraint already holds the block.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return { block: null, event: null };
      throw err;
    });
    await invalidateHidden(blockerId, blockedId);
    if (!block) return { blocked: true, userId: blockedId, blockedAt: new Date() };

    // Alerts are best-effort on top of the persisted event (the dashboard
    // reads moderation_events, not notifications).
    const name = displayName(target).name;
    void notificationService
      .createForAdmins({
        type: ADMIN_NOTIFICATION_TYPE.BLOCK,
        title: 'User blocked',
        body: `A user blocked ${name}. Review the safety signal in Moderation.`,
        refId: event!.id,
        refType: 'moderation_event',
      })
      .catch((err) => logger.error({ err, eventId: event!.id }, 'Failed to alert admins of block'));

    // The blocker's other signed-in devices drop the content too.
    emitToUser(blockerId, 'block:changed', { userId: blockedId, blocked: true });
    return { blocked: true, userId: blockedId, blockedAt: block.createdAt };
  },

  async unblock(blockerId: string, targetIdOrProfileId: string) {
    const blockedId = await resolveUserId(targetIdOrProfileId);
    if (!blockedId) throw new AppError('User not found', HttpStatus.NOT_FOUND);
    const { count } = await prisma.block.deleteMany({ where: { blockerId, blockedId } });
    await invalidateHidden(blockerId, blockedId);
    if (count) {
      await prisma.moderationEvent.create({ data: { type: 'USER_UNBLOCKED', actorUserId: blockerId, targetUserId: blockedId } }).catch(() => {});
      emitToUser(blockerId, 'block:changed', { userId: blockedId, blocked: false });
    }
    return { blocked: false, userId: blockedId };
  },

  async list(blockerId: string) {
    const rows = await prisma.block.findMany({
      where: { blockerId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, blocked: { select: PROFILE_SELECT } },
    });
    return rows.map((r) => {
      const d = displayName(r.blocked);
      return {
        userId: r.blocked.id,
        role: r.blocked.role,
        profileId: r.blocked.creatorProfile?.id ?? r.blocked.businessProfile?.id ?? null,
        name: d.name,
        avatarUrl: d.avatarUrl,
        blockedAt: r.createdAt,
      };
    });
  },

  /** For profile screens: has the viewer blocked this user / been blocked by them? */
  async status(viewerId: string, targetIdOrProfileId: string) {
    const otherId = await resolveUserId(targetIdOrProfileId);
    if (!otherId || otherId === viewerId) return { userId: otherId, blockedByMe: false, blockedByThem: false };
    const rows = await prisma.block.findMany({
      where: { OR: [{ blockerId: viewerId, blockedId: otherId }, { blockerId: otherId, blockedId: viewerId }] },
      select: { blockerId: true },
    });
    return {
      userId: otherId,
      blockedByMe: rows.some((r) => r.blockerId === viewerId),
      blockedByThem: rows.some((r) => r.blockerId === otherId),
    };
  },

  /** All userIds the viewer has blocked (mobile caches this to filter lists instantly). */
  async blockedIds(blockerId: string) {
    const rows = await prisma.block.findMany({ where: { blockerId }, select: { blockedId: true } });
    return rows.map((r) => r.blockedId);
  },
};
