import cron from 'node-cron';
import prisma from '../prisma';
import { logger } from '../config/logger';
import { notificationService } from '../modules/notifications/notification.service';

// Campaigns have no dedicated EXPIRED status — an expired campaign is closed
// out the same way a business would manually close it, just triggered by its
// deadline passing instead of a manual action.
async function expirePastDeadlineCampaigns() {
  const expired = await prisma.campaign.findMany({
    where: { status: 'ACTIVE', deadline: { lt: new Date() } },
    select: { id: true, title: true, business: { select: { businessName: true } } },
  });
  if (expired.length === 0) return;

  await prisma.campaign.updateMany({
    where: { id: { in: expired.map((c) => c.id) } },
    data: { status: 'CLOSED' },
  });

  for (const campaign of expired) {
    notificationService.createForAdmins({
      type:    'campaign_expired',
      title:   '⏰ Event Expired',
      body:    `"${campaign.title}" by ${campaign.business.businessName} passed its deadline and was closed.`,
      refId:   campaign.id,
      refType: 'campaign',
    }).catch(() => {});
  }

  logger.info({ count: expired.length }, 'Closed expired campaigns');
}

export function startCampaignExpiryJob() {
  // Every 15 minutes — frequent enough that "expired" notifications feel
  // timely without hammering the DB with a tight polling loop.
  cron.schedule('*/15 * * * *', () => {
    expirePastDeadlineCampaigns().catch((err) => logger.error({ err }, 'Campaign expiry job failed'));
  });
}
