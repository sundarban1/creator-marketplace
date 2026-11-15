// Resolves a reported target (type + id) to the content that actually exists,
// its owner, and an evidence snapshot. Used at submission (validate the
// reference, block self-reports, freeze evidence) and by the admin detail view
// (show the live content next to the snapshot).
//
// USER / BUSINESS accept either the account's userId or the profile id —
// clients have historically sent both (`vm.userId ?? vm.id`).
import type { ReportTargetType } from '@prisma/client';
import prisma from '../../prisma';

export interface ResolvedTarget {
  ownerUserId: string | null;
  // Human label for admin lists ("Event: Summer Reels", "Message", ...).
  title: string;
  conversationId?: string;
  messageId?: string;
  // Frozen copy of what was reported — text + media URLs only.
  snapshot: Record<string, unknown>;
  // Current moderation state of the content itself, for the admin view.
  hidden: boolean;
}

const MESSAGE_CONTEXT = 5;

async function userIdFromCreator(idOrUserId: string): Promise<{ userId: string; profile: { id: string; fullName: string | null; username: string | null; bio: string | null; avatarUrl: string | null; coverImageUrl: string | null } } | null> {
  const profile = await prisma.creatorProfile.findFirst({
    where: { OR: [{ id: idOrUserId }, { userId: idOrUserId }] },
    select: { id: true, userId: true, fullName: true, username: true, bio: true, avatarUrl: true, coverImageUrl: true },
  });
  return profile ? { userId: profile.userId, profile } : null;
}

export async function resolveReportTarget(
  targetType: ReportTargetType,
  targetId: string,
  // The reporter — MESSAGE reports are only accepted from a participant.
  viewerUserId?: string,
): Promise<ResolvedTarget | null> {
  switch (targetType) {
    case 'USER': {
      const c = await userIdFromCreator(targetId);
      if (c) {
        const u = await prisma.user.findUnique({ where: { id: c.userId }, select: { suspendedAt: true } });
        return {
          ownerUserId: c.userId,
          title: `Creator: ${c.profile.fullName ?? c.profile.username ?? c.userId}`,
          snapshot: { kind: 'creator_profile', profileId: c.profile.id, name: c.profile.fullName, username: c.profile.username, bio: c.profile.bio, avatarUrl: c.profile.avatarUrl, coverImageUrl: c.profile.coverImageUrl },
          hidden: !!u?.suspendedAt,
        };
      }
      // A USER report may also point at a business account.
      return resolveReportTarget('BUSINESS', targetId, viewerUserId);
    }
    case 'BUSINESS': {
      const b = await prisma.businessProfile.findFirst({
        where: { OR: [{ id: targetId }, { userId: targetId }] },
        select: { id: true, userId: true, businessName: true, description: true, logoUrl: true, coverImageUrl: true, isActive: true },
      });
      if (!b) return null;
      return {
        ownerUserId: b.userId,
        title: `Business: ${b.businessName ?? b.id}`,
        snapshot: { kind: 'business_profile', profileId: b.id, name: b.businessName, description: b.description, logoUrl: b.logoUrl, coverImageUrl: b.coverImageUrl },
        hidden: !b.isActive,
      };
    }
    case 'OPPORTUNITY': {
      const c = await prisma.campaign.findFirst({
        where: { id: targetId, deletedAt: null },
        select: { id: true, title: true, description: true, featureImageUrl: true, campaignType: true, status: true, moderationHiddenAt: true, business: { select: { userId: true, businessName: true } } },
      });
      if (!c) return null;
      return {
        ownerUserId: c.business.userId,
        title: `Event: ${c.title}`,
        snapshot: { kind: 'event', campaignId: c.id, campaignType: c.campaignType, title: c.title, description: c.description, imageUrl: c.featureImageUrl, status: c.status, businessName: c.business.businessName },
        hidden: !!c.moderationHiddenAt,
      };
    }
    case 'COMPETITION': {
      const c = await prisma.competition.findUnique({
        where: { id: targetId },
        select: { id: true, title: true, description: true, coverImageUrl: true, status: true, suspendedAt: true, business: { select: { userId: true, businessName: true } } },
      });
      if (!c) return null;
      return {
        ownerUserId: c.business.userId,
        title: `Competition: ${c.title}`,
        snapshot: { kind: 'competition', competitionId: c.id, title: c.title, description: c.description, imageUrl: c.coverImageUrl, status: c.status, businessName: c.business.businessName },
        hidden: !!c.suspendedAt,
      };
    }
    case 'COMPETITION_SUBMISSION': {
      const s = await prisma.competitionSubmission.findUnique({
        where: { id: targetId },
        select: {
          id: true, caption: true, videoUrl: true, thumbnailUrl: true, externalUrl: true, moderationHiddenAt: true,
          stage: { select: { name: true, competition: { select: { id: true, title: true } } } },
          participant: { select: { creator: { select: { userId: true, fullName: true } } } },
        },
      });
      if (!s) return null;
      return {
        ownerUserId: s.participant.creator.userId,
        title: `Competition entry: ${s.stage.competition.title}`,
        snapshot: { kind: 'competition_submission', submissionId: s.id, competitionId: s.stage.competition.id, stage: s.stage.name, caption: s.caption, videoUrl: s.videoUrl, thumbnailUrl: s.thumbnailUrl, externalUrl: s.externalUrl, creatorName: s.participant.creator.fullName },
        hidden: !!s.moderationHiddenAt,
      };
    }
    case 'PORTFOLIO_ITEM': {
      const p = await prisma.portfolioItem.findUnique({
        where: { id: targetId },
        select: { id: true, title: true, description: true, mediaUrl: true, mediaType: true, externalUrl: true, moderationHiddenAt: true, creatorProfile: { select: { userId: true, fullName: true } } },
      });
      if (!p) return null;
      return {
        ownerUserId: p.creatorProfile.userId,
        title: `Portfolio: ${p.title ?? 'item'}`,
        snapshot: { kind: 'portfolio_item', itemId: p.id, title: p.title, description: p.description, mediaUrl: p.mediaUrl, mediaType: p.mediaType, externalUrl: p.externalUrl, creatorName: p.creatorProfile.fullName },
        hidden: !!p.moderationHiddenAt,
      };
    }
    case 'SERVICE': {
      const s = await prisma.service.findUnique({
        where: { id: targetId },
        select: { id: true, name: true, description: true, status: true, creatorProfile: { select: { userId: true } } },
      });
      if (!s) return null;
      return {
        ownerUserId: s.creatorProfile.userId,
        title: `Service: ${s.name}`,
        snapshot: { kind: 'service', serviceId: s.id, name: s.name, description: s.description },
        hidden: s.status !== 'ACTIVE',
      };
    }
    case 'REVIEW': {
      const r = await prisma.review.findUnique({ where: { id: targetId }, select: { id: true, fromUserId: true, rating: true, comment: true } });
      if (!r) return null;
      return { ownerUserId: r.fromUserId, title: 'Review', snapshot: { kind: 'review', reviewId: r.id, rating: r.rating, comment: r.comment }, hidden: false };
    }
    case 'MESSAGE': {
      const m = await prisma.message.findUnique({
        where: { id: targetId },
        select: {
          id: true, senderId: true, content: true, type: true, attachmentUrl: true, createdAt: true, deletedAt: true, deletedBy: true, conversationId: true,
          conversation: {
            select: {
              creator: { select: { userId: true } },
              creator2: { select: { userId: true } },
              business: { select: { userId: true } },
            },
          },
        },
      });
      if (!m) return null;
      const participants = [m.conversation.creator?.userId, m.conversation.creator2?.userId, m.conversation.business?.userId].filter(Boolean) as string[];
      // Only someone in the conversation can see — and therefore report — a message.
      if (viewerUserId && !participants.includes(viewerUserId)) return null;

      // Surrounding context for the moderator: a few messages either side.
      const [before, after] = await Promise.all([
        prisma.message.findMany({ where: { conversationId: m.conversationId, createdAt: { lt: m.createdAt } }, orderBy: { createdAt: 'desc' }, take: MESSAGE_CONTEXT, select: { id: true, senderId: true, content: true, type: true, createdAt: true, deletedAt: true } }),
        prisma.message.findMany({ where: { conversationId: m.conversationId, createdAt: { gt: m.createdAt } }, orderBy: { createdAt: 'asc' }, take: MESSAGE_CONTEXT, select: { id: true, senderId: true, content: true, type: true, createdAt: true, deletedAt: true } }),
      ]);
      return {
        ownerUserId: m.senderId,
        title: 'Chat message',
        conversationId: m.conversationId,
        messageId: m.id,
        snapshot: {
          kind: 'message', messageId: m.id, conversationId: m.conversationId, senderId: m.senderId, type: m.type,
          content: m.content, attachmentUrl: m.attachmentUrl, sentAt: m.createdAt.toISOString(),
          context: [...before.reverse(), ...after].map((x) => ({ id: x.id, senderId: x.senderId, type: x.type, content: x.deletedAt ? '[deleted]' : x.content, sentAt: x.createdAt.toISOString() })),
        },
        hidden: !!m.deletedAt && m.deletedBy === MODERATION_ACTOR,
      };
    }
    case 'POST':
    default:
      // No standalone "post" content exists in Kolab today.
      return null;
  }
}

// Message.deletedBy marker for a moderator removal (vs the sender's own delete).
export const MODERATION_ACTOR = 'MODERATION';
