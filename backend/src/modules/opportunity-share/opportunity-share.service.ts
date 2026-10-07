import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { Prisma, CampaignStatus, type SharePlatform } from '@prisma/client';
import prisma from '../../prisma';
import { AppError } from '../../middleware/error';
import { getDict } from '../../i18n';
import { HttpStatus } from '../../constants/httpStatus';
import { env, frontendBaseUrl } from '../../config/env';
import { getRedis } from '../../config/redis';
import { logger } from '../../config/logger';
import { SHARE_TOKEN_PATTERN, type CreateShareInput } from './opportunity-share.schema';

// Share Opportunity — a creator passing an event/campaign to other creators.
//
// This is deliberately NOT a referral program. Nothing in this module creates
// a reward, points, balance or entitlement for the sharer; the rows it writes
// exist only so Kolab can measure shares → clicks → registrations →
// applications. Every attribution step is best-effort and must never block
// viewing, auth, onboarding or proposal submission.

// A click only counts toward a registration made within this long after it.
const SIGNUP_ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
// Repeat visits by the same viewer inside this window count as one click.
const CLICK_DEDUP_SECONDS = 30 * 60;

// Statuses a public /events/:id page renders (mirrors
// CampaignController.getPublicById) — anything else is "not found" to a visitor.
const PUBLIC_STATUSES: CampaignStatus[] = [
  CampaignStatus.ACTIVE,
  CampaignStatus.PAUSED,
  CampaignStatus.CLOSED,
  CampaignStatus.EXPIRED,
];

// Receipts are signed with a key derived from the access-token secret but
// namespaced, so a receipt can never be confused with (or forged from) a JWT.
const RECEIPT_KEY = createHash('sha256')
  .update(`opportunity-share-receipt:${env.JWT_ACCESS_SECRET}`)
  .digest();

function sign(payload: string): string {
  return createHmac('sha256', RECEIPT_KEY).update(payload).digest('base64url');
}

/**
 * A click receipt proves "this browser opened share link T at time X" without
 * the server persisting anything about the anonymous visitor. The client holds
 * it through signup and hands it back to claimSignup, which only credits the
 * share when the click happened *before* the account was created.
 */
export function issueReceipt(token: string, clickedAt: Date): string {
  const payload = `${token}.${clickedAt.getTime()}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyReceipt(receipt: string): { token: string; clickedAt: Date } | null {
  const parts = receipt.split('.');
  if (parts.length !== 3) return null;
  const [token, ms, sig] = parts;
  if (!SHARE_TOKEN_PATTERN.test(token) || !/^\d{1,15}$/.test(ms)) return null;
  const expected = Buffer.from(sign(`${token}.${ms}`));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return { token, clickedAt: new Date(Number(ms)) };
}

export function buildShareUrl(campaign: { id: string; slug: string | null }, token: string): string {
  // Same slug-preferred, id-fallback path the public event page canonicalises
  // to — one URL shape for paid campaigns and free events alike.
  return `${frontendBaseUrl}/events/${encodeURIComponent(campaign.slug ?? campaign.id)}?ref=${token}`;
}

export class OpportunityShareService {
  /** 96 bits from the CSPRNG, base64url — unguessable and URL-safe. */
  private newToken(): string {
    return randomBytes(12).toString('base64url');
  }

  async createShare(userId: string, input: CreateShareInput) {
    const creator = await prisma.creatorProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!creator) throw new AppError(getDict().campaign.creatorProfileNotFound, HttpStatus.NOT_FOUND);

    const campaign = await prisma.campaign.findFirst({
      where: { id: input.campaignId, deletedAt: null },
      select: { id: true, slug: true, status: true },
    });
    // Drafts / pending-approval / cancelled campaigns aren't publicly visible,
    // so they don't exist as far as a share link is concerned.
    if (!campaign || !PUBLIC_STATUSES.includes(campaign.status)) {
      throw new AppError(getDict().campaign.campaignNotFound, HttpStatus.NOT_FOUND);
    }
    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new AppError(getDict().campaign.campaignNotAcceptingApplications, HttpStatus.BAD_REQUEST);
    }

    const key = { campaignId: campaign.id, sharerId: creator.id, platform: input.platform as SharePlatform };
    let share = await prisma.opportunityShare.findUnique({ where: { campaignId_sharerId_platform: key } });
    if (!share) {
      try {
        share = await prisma.opportunityShare.create({ data: { ...key, token: this.newToken() } });
      } catch (err) {
        // Two taps racing on the same channel — the other request won; reuse its row.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          share = await prisma.opportunityShare.findUniqueOrThrow({ where: { campaignId_sharerId_platform: key } });
        } else {
          throw err;
        }
      }
    }

    return { shareToken: share.token, shareUrl: buildShareUrl(campaign, share.token) };
  }

  /**
   * Records a share-link open. Never throws for a bad token — an invalid or
   * stale `?ref=` just means "no attribution", and the page renders normally.
   * `viewerKey` identifies the viewer for de-duplication only; it lives in
   * Redis for CLICK_DEDUP_SECONDS and is never written to Postgres.
   */
  async recordVisit(token: string, viewer: { userId?: string; viewerKey: string }) {
    if (!SHARE_TOKEN_PATTERN.test(token)) return { valid: false as const };

    const share = await prisma.opportunityShare.findUnique({
      where: { token },
      select: {
        id: true, campaignId: true,
        sharer: { select: { userId: true } },
        campaign: { select: { deletedAt: true } },
      },
    });
    if (!share || share.campaign.deletedAt) return { valid: false as const };

    // The sharer previewing their own link isn't a click.
    if (viewer.userId && viewer.userId === share.sharer.userId) {
      return { valid: true as const, campaignId: share.campaignId, receipt: null };
    }

    const clickedAt = new Date();
    if (await this.isFirstVisitInWindow(share.id, viewer.userId ?? viewer.viewerKey)) {
      await prisma.opportunityShare.update({
        where: { id: share.id },
        data: { clickCount: { increment: 1 }, lastClickedAt: clickedAt },
      });
    }

    // Only an anonymous visitor can go on to register, so only they get a receipt.
    return {
      valid: true as const,
      campaignId: share.campaignId,
      receipt: viewer.userId ? null : issueReceipt(token, clickedAt),
    };
  }

  private async isFirstVisitInWindow(shareId: string, viewer: string): Promise<boolean> {
    const client = await getRedis();
    if (!client) return true; // no Redis → count it; the route's rate limiter still caps abuse
    try {
      const key = `oppshare:click:${shareId}:${createHash('sha256').update(viewer).digest('hex').slice(0, 32)}`;
      const set = await client.set(key, '1', { NX: true, EX: CLICK_DEDUP_SECONDS });
      return set === 'OK';
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : err }, 'opportunity-share click dedup failed — counting');
      return true;
    }
  }

  /**
   * Registration attribution. Credits the share behind `receipt` to `userId`'s
   * signup only when: the receipt is authentic, its click happened before the
   * account was created (and not more than SIGNUP_ATTRIBUTION_WINDOW_MS
   * before), the account isn't the sharer's own, and the account has no
   * attribution yet (first committed attribution wins — never overwritten).
   * Returns `{ attributed }`; never throws on an invalid claim.
   */
  async claimSignup(userId: string, receipt: string) {
    const parsed = verifyReceipt(receipt);
    if (!parsed) return { attributed: false };

    const [user, share] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true, signupShareId: true } }),
      prisma.opportunityShare.findUnique({
        where: { token: parsed.token },
        select: { id: true, sharer: { select: { userId: true } } },
      }),
    ]);
    if (!user || !share || user.signupShareId) return { attributed: false };
    if (share.sharer.userId === userId) return { attributed: false };

    const sinceClick = user.createdAt.getTime() - parsed.clickedAt.getTime();
    if (sinceClick < 0 || sinceClick > SIGNUP_ATTRIBUTION_WINDOW_MS) return { attributed: false };

    // Conditional write — a concurrent claim can't overwrite the first one.
    const { count } = await prisma.user.updateMany({
      where: { id: userId, signupShareId: null },
      data: { signupShareId: share.id },
    });
    return { attributed: count === 1 };
  }

  /**
   * Application attribution, called right after a proposal is created. Only
   * links a share for the *same* campaign that someone other than the applicant
   * created. Best-effort: returns false (never throws) on anything invalid.
   */
  async attributeApplication(args: {
    applicationId: string;
    campaignId: string;
    applicantCreatorId: string;
    shareToken: string;
  }): Promise<boolean> {
    if (!SHARE_TOKEN_PATTERN.test(args.shareToken)) return false;
    const share = await prisma.opportunityShare.findUnique({
      where: { token: args.shareToken },
      select: { id: true, campaignId: true, sharerId: true },
    });
    if (!share || share.campaignId !== args.campaignId || share.sharerId === args.applicantCreatorId) return false;

    const { count } = await prisma.application.updateMany({
      where: { id: args.applicationId, opportunityShareId: null },
      data: { opportunityShareId: share.id },
    });
    return count === 1;
  }

  /** Internal product analytics — per-opportunity funnel plus per-platform totals. Admin only. */
  async summary(limit: number) {
    const opportunities = await prisma.$queryRaw<Array<{
      campaignId: string; title: string; campaignType: string;
      shares: number; clicks: number; registrations: number; applications: number;
    }>>`
      SELECT c.id AS "campaignId", c.title, c."campaignType"::text AS "campaignType",
             COUNT(s.id)::int AS shares,
             COALESCE(SUM(s."clickCount"), 0)::int AS clicks,
             (SELECT COUNT(*) FROM users u JOIN opportunity_shares s2 ON u."signupShareId" = s2.id
               WHERE s2."campaignId" = c.id)::int AS registrations,
             (SELECT COUNT(*) FROM applications a JOIN opportunity_shares s3 ON a."opportunityShareId" = s3.id
               WHERE s3."campaignId" = c.id)::int AS applications
        FROM opportunity_shares s
        JOIN campaigns c ON c.id = s."campaignId"
       GROUP BY c.id
       ORDER BY shares DESC, clicks DESC
       LIMIT ${limit}
    `;

    const byPlatform = await prisma.$queryRaw<Array<{
      platform: string; shares: number; clicks: number; registrations: number; applications: number;
    }>>`
      SELECT s.platform::text AS platform,
             COUNT(s.id)::int AS shares,
             COALESCE(SUM(s."clickCount"), 0)::int AS clicks,
             COALESCE(SUM((SELECT COUNT(*) FROM users u WHERE u."signupShareId" = s.id)), 0)::int AS registrations,
             COALESCE(SUM((SELECT COUNT(*) FROM applications a WHERE a."opportunityShareId" = s.id)), 0)::int AS applications
        FROM opportunity_shares s
       GROUP BY s.platform
       ORDER BY shares DESC
    `;

    return { opportunities, byPlatform };
  }
}

export const opportunityShareService = new OpportunityShareService();
