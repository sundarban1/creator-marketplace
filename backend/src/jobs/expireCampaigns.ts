import cron from 'node-cron';
import { logger } from '../config/logger';
import { CampaignService } from '../modules/campaign/campaign.service';

const campaignService = new CampaignService();

export function startCampaignExpiryJob() {
  // Every 15 minutes — frequent enough that "expired" notifications feel
  // timely without hammering the DB with a tight polling loop.
  cron.schedule('*/15 * * * *', () => {
    campaignService.expireCampaignsPastDeadline()
      .then(({ campaignCount, applicationCount }) => {
        if (campaignCount > 0) logger.info({ campaignCount, applicationCount }, 'Expired campaigns past deadline');
      })
      .catch((err) => logger.error({ err }, 'Campaign expiry job failed'));
  });
}
