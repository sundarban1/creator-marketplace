/**
 * Deletes every event (Campaign) and everything tied to one, while keeping all
 * creator/business accounts and profiles. Community Events and Creator
 * Meetups are NOT touched.
 *
 * Removed:
 *  - campaigns → (cascade) applications, requirements, invitations,
 *    shortlists, submissions, revision notes, reviews/ratings, contracts,
 *    disputes, payment transactions, connectIPS attempts, campaign events,
 *    admin review history, event Q&A, opportunity shares
 *  - ALL chats (every conversation + its messages — event chats, message
 *    requests and creator↔creator chats)
 *  - event + chat notifications, notification deliveries
 *  - reports filed against events or reviews
 *  - event-scoped audit / activity log rows
 *
 * Rewards / money — every balance ends at 0:
 *  - creator wallet: ALL wallet transactions + ALL withdrawals (the wallet /
 *    Kolab Points balance is derived from that ledger, so it becomes 0)
 *  - business credits: ALL ledger rows, every account balance/lifetime → 0
 *  - promotion redemption sessions (promotions themselves are kept)
 *  - all creator + business referral links (each profile's own referralCode
 *    is kept, so people can still refer)
 *
 * Reset: CreatorReliability, and the event-derived CreatorAnalytics /
 * BrandAnalytics counters (profile views are kept).
 * Detached: CampaignTemplate.sourceCampaignId (templates are kept).
 *
 * Uploaded files (event images, attachments, invitation PNGs) stay in
 * R2/Cloudinary; only the DB rows are removed.
 *
 * Usage:
 *   npx tsx prisma/wipe-events.ts                 # dry run — counts only
 *   npx tsx prisma/wipe-events.ts --confirm       # actually delete (one transaction)
 */
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const args = new Set(process.argv.slice(2));
const CONFIRM = args.has('--confirm');

// Notification refTypes that point at a campaign/application/dispute/chat —
// every one of them dies with the events and conversations.
const EVENT_NOTIFICATION_REF_TYPES = ['campaign', 'event', 'campaign_full', 'application', 'dispute', 'conversation'];

const notificationWhere: Prisma.NotificationWhereInput = {
  OR: [
    { refType: { in: EVENT_NOTIFICATION_REF_TYPES } },
    { applicationId: { not: null } },
  ],
};

const notificationDeliveryWhere: Prisma.NotificationDeliveryWhereInput = {
  OR: [{ campaignId: { not: null } }, { applicationId: { not: null } }],
};

const reportWhere: Prisma.ReportWhereInput = { targetType: { in: ['OPPORTUNITY', 'REVIEW'] } };
const auditWhere: Prisma.AuditLogWhereInput = { campaignId: { not: null } };
const activityWhere: Prisma.ActivityLogWhereInput = { entityType: { in: ['Application', 'Campaign'] } };

async function preview() {
  const [
    campaigns, applications, reviews, disputes, payments, conversations, messages,
    notifications, deliveries, reports, audits, activities, walletTx, withdrawals,
    creditsLedger, creditsAccounts, redemptions, referrals, bizReferrals, templates, reliability,
  ] = await Promise.all([
    prisma.campaign.count(),
    prisma.application.count(),
    prisma.review.count(),
    prisma.dispute.count(),
    prisma.paymentTransaction.count(),
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.notification.count({ where: notificationWhere }),
    prisma.notificationDelivery.count({ where: notificationDeliveryWhere }),
    prisma.report.count({ where: reportWhere }),
    prisma.auditLog.count({ where: auditWhere }),
    prisma.activityLog.count({ where: activityWhere }),
    prisma.walletTransaction.count(),
    prisma.withdrawal.count(),
    prisma.businessCreditsLedger.count(),
    prisma.businessCreditsAccount.count({ where: { OR: [{ balance: { not: 0 } }, { lifetimeEarned: { not: 0 } }, { lifetimeSpent: { not: 0 } }] } }),
    prisma.redemptionSession.count(),
    prisma.referral.count(),
    prisma.businessReferral.count(),
    prisma.campaignTemplate.count({ where: { sourceCampaignId: { not: null } } }),
    prisma.creatorReliability.count(),
  ]);

  console.table({
    'events (campaigns)':              campaigns,
    'applications':                    applications,
    'reviews / ratings':               reviews,
    'disputes':                        disputes,
    'payment transactions':            payments,
    'conversations (all)':             conversations,
    'messages (all)':                  messages,
    'notifications':                   notifications,
    'notification deliveries':         deliveries,
    'reports (event/review)':          reports,
    'audit log rows':                  audits,
    'activity log rows':               activities,
    'wallet transactions (all)':       walletTx,
    'withdrawals (all)':               withdrawals,
    'business credits ledger (all)':   creditsLedger,
    'credits accounts to zero':        creditsAccounts,
    'redemption sessions':             redemptions,
    'creator referrals':               referrals,
    'business referrals':              bizReferrals,
    'templates to detach':             templates,
    'reliability rows to reset':       reliability,
  });
}

async function wipe() {
  await prisma.$transaction(async (tx) => {
    const log = (label: string, r: { count: number }) => console.log(`  ${label}: ${r.count}`);

    log('wallet transactions',      await tx.walletTransaction.deleteMany());
    log('withdrawals',              await tx.withdrawal.deleteMany());
    log('business credits ledger',  await tx.businessCreditsLedger.deleteMany());
    log('credits accounts zeroed',  await tx.businessCreditsAccount.updateMany({
      data: { balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 },
    }));
    log('redemption sessions',      await tx.redemptionSession.deleteMany());
    log('creator referrals',        await tx.referral.deleteMany());
    log('business referrals',       await tx.businessReferral.deleteMany());
    log('notifications',            await tx.notification.deleteMany({ where: notificationWhere }));
    log('notification deliveries',  await tx.notificationDelivery.deleteMany({ where: notificationDeliveryWhere }));
    log('reports',                  await tx.report.deleteMany({ where: reportWhere }));
    log('audit log rows',           await tx.auditLog.deleteMany({ where: auditWhere }));
    log('activity log rows',        await tx.activityLog.deleteMany({ where: activityWhere }));
    // Messages cascade from conversations. Must run before campaigns: the
    // Conversation→Campaign FK would otherwise just null campaignId out.
    log('conversations',            await tx.conversation.deleteMany());
    log('templates detached',       await tx.campaignTemplate.updateMany({
      where: { sourceCampaignId: { not: null } },
      data:  { sourceCampaignId: null },
    }));
    log('events (cascade)',         await tx.campaign.deleteMany());

    log('reliability reset',        await tx.creatorReliability.updateMany({
      data: {
        completedCampaigns: 0, lateCampaigns: 0, failedCampaigns: 0,
        missedConfirmations: 0, cancelledAfterConfirmation: 0, reliabilityScore: 100,
      },
    }));
    log('creator analytics reset',  await tx.creatorAnalytics.updateMany({
      data: {
        totalEarnings: 0, pendingEarnings: 0, invitationsReceived: 0,
        applicationsSubmitted: 0, applicationsAccepted: 0, applicationsRejected: 0,
        activeCampaigns: 0, completedCampaigns: 0, averageRating: 0, reviewCount: 0,
        responseTimeAvgMins: 0, responseTimeSamples: 0,
      },
    }));
    log('brand analytics reset',    await tx.brandAnalytics.updateMany({
      data: {
        campaignsCreated: 0, activeCampaigns: 0, completedCampaigns: 0, totalSpend: 0,
        applicationsReceived: 0, creatorsHired: 0, averageRatingGiven: 0, ratingsGivenCount: 0,
        responseTimeAvgMins: 0, responseTimeSamples: 0,
      },
    }));
  }, { timeout: 120_000 });
}

async function main() {
  const host = (process.env.DATABASE_URL ?? '').replace(/\/\/[^@]*@/, '//***@');
  console.log(`Database: ${host || '(DATABASE_URL not set)'}`);
  await preview();

  if (!CONFIRM) {
    console.log('\nDry run — nothing deleted. Re-run with --confirm to wipe.');
    return;
  }
  console.log('\nWiping...');
  await wipe();
  console.log('Done. All wallet and credit balances are 0. Creator/business accounts, promotions, community events and meetups are untouched.');
  console.log('If Redis caching is on, flush it (or restart the API) so stale event lists are not served.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
