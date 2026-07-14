import cron from 'node-cron';
import { logger } from '../config/logger';
import { CreatorService } from '../modules/creator/creator.service';

const creatorService = new CreatorService();

export function startSocialFollowerRefreshJob() {
  // Every 6 hours — frequent enough that follower/subscriber counts never look
  // stale for long, without hammering YouTube/Facebook/Instagram/TikTok's APIs
  // (or their rate limits) for numbers that rarely move within a few hours. This,
  // plus the per-creator top-up in creator.service.ts's getSocialAccounts, is the
  // entire auto-refresh mechanism — there's no manual "sync" button anywhere.
  cron.schedule('0 */6 * * *', () => {
    creatorService.refreshAllSocialAccountFollowers()
      .then(({ refreshed, failed }) => logger.info({ refreshed, failed }, 'Social account follower refresh job finished'))
      .catch((err) => logger.error({ err }, 'Social account follower refresh job failed'));
  });
}
