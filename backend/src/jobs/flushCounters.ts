import cron from 'node-cron';
import { logger } from '../config/logger';
import { flushCounters } from '../utils/counters';
import { AnalyticsRepository } from '../modules/analytics/analytics.repository';

const analyticsRepo = new AnalyticsRepository();

export function startCounterFlushJob() {
  // Every minute — write buffered profile-view counts (utils/counters.ts) back
  // to CreatorAnalytics.totalProfileViews as one upsert per creator instead of
  // one per view. No-op when REDIS_QUEUE_URL is unset (recordProfileView then
  // increments Postgres inline as before).
  cron.schedule('* * * * *', () => {
    flushCounters('profileViews', async (userId, count) => {
      await analyticsRepo.incrCreator(userId, { totalProfileViews: count });
    }).catch((err) => logger.error({ err }, 'Counter flush job failed'));
  });
}
