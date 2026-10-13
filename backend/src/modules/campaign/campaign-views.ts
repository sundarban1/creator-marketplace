import { createHash } from 'crypto';
import type { Request } from 'express';
import prisma from '../../prisma';
import { getRedis } from '../../config/redis';
import { logger } from '../../config/logger';

// Link unfurlers / crawlers hit public event pages constantly — never count them.
const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|python|headless|lighthouse/i;
const WINDOW_SECONDS = 24 * 60 * 60;

/**
 * Counts one detail-page view per visitor per event per 24h. A visitor is the
 * signed-in user (app) or, on the anonymous web route, a hash of IP + user agent.
 * Without Redis we can't dedupe, so we skip counting rather than inflate.
 * Returns true when this request was counted.
 */
export async function recordCampaignView(campaignId: string, req: Request, userId?: string): Promise<boolean> {
  const ua = req.get('user-agent') ?? '';
  if (!userId && (!ua || BOT_UA.test(ua))) return false;
  try {
    const redis = await getRedis();
    if (!redis) return false;
    const visitor = userId ? `u:${userId}` : createHash('sha1').update(`${req.ip}|${ua}`).digest('hex').slice(0, 20);
    const fresh = await redis.set(`campaign:view:${campaignId}:${visitor}`, '1', { NX: true, EX: WINDOW_SECONDS });
    if (fresh !== 'OK') return false;
    await prisma.campaign.update({ where: { id: campaignId }, data: { viewCount: { increment: 1 } } });
    return true;
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err, campaignId }, 'campaign view record failed');
    return false;
  }
}
