import cron from 'node-cron';
import { logger } from '../config/logger';
import { CampaignService } from '../modules/campaign/campaign.service';

const campaignService = new CampaignService();

export function startConnectIpsReconcileJob() {
  // Every 5 minutes — settles connectIPS attempts the business never came back
  // from (closed the tab after OTP, timeout during validation) by asking NCHL
  // directly, and expires ones still unpaid after a day. Idempotent: every
  // transition goes through the same atomic claim as the live callbacks.
  cron.schedule('*/5 * * * *', () => {
    campaignService.reconcileConnectIpsPayments()
      .then(({ checked, funded, expired }) => {
        if (checked > 0) logger.info({ checked, funded, expired }, 'connectIPS reconciliation run');
      })
      .catch((err) => logger.error({ err }, 'connectIPS reconciliation job failed'));
  });
}
