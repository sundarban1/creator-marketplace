import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  hasDb, resetDb, seedCreatorBusiness, seedCreator, seedPromotion,
  seedAcceptedUnpaidApplication, pointsBalance, creditsBalance,
} from './helpers';
import prisma from '../src/prisma';
import { RedemptionService } from '../src/modules/redemption/redemption.service';
import { PromotionService } from '../src/modules/promotion/promotion.service';
import { CampaignService } from '../src/modules/campaign/campaign.service';
import { recordWalletTransaction, recordWalletTransactionIdempotent } from '../src/modules/wallet/wallet.ledger';
import { recordCreditsTransaction } from '../src/modules/credits/credits.ledger';

const d = hasDb ? describe : describe.skip;

/** Drives one promotion through ISSUED -> SCANNED -> BILL_ENTERED, ready for confirm(). */
async function issueScanBill(
  redemption: RedemptionService,
  args: { bizUserId: string; creatorUserId: string; promotionId: string; billAmount: number },
) {
  const { session } = await redemption.issue(args.creatorUserId, args.promotionId);
  // The token is never in the DTO (it only ever leaves the server inside the
  // QR image) — a white-box test reads it straight from the row instead.
  const row = await prisma.redemptionSession.findUniqueOrThrow({ where: { id: session.id } });
  await redemption.scan(args.bizUserId, row.token);
  const billed = await redemption.enterBill(args.bizUserId, session.id, args.billAmount);
  return billed;
}

d('Kolab Rewards — points-via-wallet ledger idempotency', () => {
  beforeEach(resetDb);

  it('a PROMO_REDEMPTION_DEBIT duplicate (referenceId, type) is skipped, not double-debited', async () => {
    const { creatorId } = await seedCreatorBusiness();
    const input = {
      creatorId, type: 'PROMO_REDEMPTION_DEBIT' as const, direction: 'DEBIT' as const,
      amount: 50, description: 'test', referenceType: 'redemption_session', referenceId: 'sess-1',
    };
    const first  = await recordWalletTransactionIdempotent(input);
    const second = await recordWalletTransactionIdempotent(input);

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(await prisma.walletTransaction.count({ where: { creatorId, type: 'PROMO_REDEMPTION_DEBIT' } })).toBe(1);
  });

  it('points balance nets a credit then a debit correctly (Points ARE the wallet ledger)', async () => {
    const { creatorId } = await seedCreatorBusiness();
    await recordWalletTransaction(prisma, {
      creatorId, type: 'ADJUSTMENT', direction: 'CREDIT', amount: 300, description: 'earned',
    });
    await recordWalletTransaction(prisma, {
      creatorId, type: 'PROMO_REDEMPTION_DEBIT', direction: 'DEBIT', amount: 120, description: 'spent',
    });
    expect(await pointsBalance(creatorId)).toBe(180);
  });
});

d('Kolab Rewards — Promotion lazy-expiry', () => {
  beforeEach(resetDb);

  it('an ACTIVE promotion whose window has passed flips to EXPIRED on the next discover read', async () => {
    const { businessId } = await seedCreatorBusiness();
    const promo = await seedPromotion(businessId, { validUntil: new Date(Date.now() - 1000) });

    const promotionService = new PromotionService();
    const list = await promotionService.listDiscoverable();

    expect(list.find((p) => p.id === promo.id)).toBeUndefined();
    const row = await prisma.promotion.findUniqueOrThrow({ where: { id: promo.id } });
    expect(row.status).toBe('EXPIRED');
  });
});

d('Kolab Rewards — Promotion delete', () => {
  beforeEach(resetDb);

  it('a DRAFT promotion can be deleted by its owning business', async () => {
    const { bizUserId, businessId } = await seedCreatorBusiness();
    const promo = await seedPromotion(businessId, { status: 'DRAFT' });

    const promotionService = new PromotionService();
    await promotionService.delete(bizUserId, promo.id);

    expect(await prisma.promotion.findUnique({ where: { id: promo.id } })).toBeNull();
  });

  it('an ACTIVE promotion cannot be deleted', async () => {
    const { bizUserId, businessId } = await seedCreatorBusiness();
    const promo = await seedPromotion(businessId, { status: 'ACTIVE' });

    const promotionService = new PromotionService();
    await expect(promotionService.delete(bizUserId, promo.id)).rejects.toThrow();
    expect(await prisma.promotion.findUnique({ where: { id: promo.id } })).not.toBeNull();
  });

  it('a promotion that has already been redeemed cannot be deleted even while PAUSED', async () => {
    const { bizUserId, creatorUserId, businessId, creatorId } = await seedCreatorBusiness();
    const promo = await seedPromotion(businessId, { discountType: 'PERCENTAGE', discountValue: 10, minSpend: 500, maxDiscountCap: 500, status: 'ACTIVE' });
    // pointsCost pays the full discounted bill (900 for a Rs. 1000 bill at 10% off), not just the discount slice.
    await recordWalletTransaction(prisma, { creatorId, type: 'ADJUSTMENT', direction: 'CREDIT', amount: 1000, description: 'seed' });

    const redemption = new RedemptionService();
    const billed = await issueScanBill(redemption, { bizUserId, creatorUserId, promotionId: promo.id, billAmount: 1000 });
    await redemption.confirm(creatorUserId, billed.id);
    await prisma.promotion.update({ where: { id: promo.id }, data: { status: 'PAUSED' } });

    const promotionService = new PromotionService();
    await expect(promotionService.delete(bizUserId, promo.id)).rejects.toThrow();
    expect(await prisma.promotion.findUnique({ where: { id: promo.id } })).not.toBeNull();
  });

  it('another business cannot delete a promotion it does not own', async () => {
    const { businessId } = await seedCreatorBusiness();
    const other = await seedCreatorBusiness();
    const promo = await seedPromotion(businessId, { status: 'DRAFT' });

    const promotionService = new PromotionService();
    await expect(promotionService.delete(other.bizUserId, promo.id)).rejects.toThrow();
    expect(await prisma.promotion.findUnique({ where: { id: promo.id } })).not.toBeNull();
  });
});

d('Kolab Rewards — redemption state machine', () => {
  beforeEach(resetDb);

  it('full flow: issue -> scan -> bill -> confirm settles both ledgers exactly once', async () => {
    const { bizUserId, creatorUserId, businessId, creatorId } = await seedCreatorBusiness();
    const promo = await seedPromotion(businessId, { discountType: 'PERCENTAGE', discountValue: 10, minSpend: 500, maxDiscountCap: 500 });
    await recordWalletTransaction(prisma, { creatorId, type: 'ADJUSTMENT', direction: 'CREDIT', amount: 1000, description: 'seed' });

    const redemption = new RedemptionService();
    const billed = await issueScanBill(redemption, { bizUserId, creatorUserId, promotionId: promo.id, billAmount: 1000 });
    expect(billed.discountAmount).toBe(100);
    // pointsCost/creditsEarned pay the full discounted bill (900), not just the discount slice (100).
    expect(billed.pointsCost).toBe(900);
    expect(billed.creditsEarned).toBe(900);
    expect(billed.status).toBe('BILL_ENTERED');

    const confirmed = await redemption.confirm(creatorUserId, billed.id);
    expect(confirmed.status).toBe('CONFIRMED');

    expect(await pointsBalance(creatorId)).toBe(100); // 1000 seeded − 900 spent
    expect(await creditsBalance(businessId)).toBe(900);
    expect(await prisma.walletTransaction.count({ where: { referenceId: billed.id, type: 'PROMO_REDEMPTION_DEBIT' } })).toBe(1);
    expect(await prisma.businessCreditsLedger.count({ where: { referenceId: billed.id, type: 'PROMO_REDEMPTION_CREDIT' } })).toBe(1);
  });

  it('one redemption per creator per promotion — a second issue after CONFIRMED is rejected', async () => {
    const { bizUserId, creatorUserId, businessId, creatorId } = await seedCreatorBusiness();
    const promo = await seedPromotion(businessId, { discountValue: 10, minSpend: 0 });
    await recordWalletTransaction(prisma, { creatorId, type: 'ADJUSTMENT', direction: 'CREDIT', amount: 1000, description: 'seed' });

    const redemption = new RedemptionService();
    const billed = await issueScanBill(redemption, { bizUserId, creatorUserId, promotionId: promo.id, billAmount: 1000 });
    await redemption.confirm(creatorUserId, billed.id);

    await expect(redemption.issue(creatorUserId, promo.id)).rejects.toThrow(/already redeemed/i);
  });

  it('confirm rejects when the creator does not have enough points', async () => {
    const { bizUserId, creatorUserId, businessId } = await seedCreatorBusiness();
    const promo = await seedPromotion(businessId, { discountType: 'PERCENTAGE', discountValue: 50, minSpend: 0 });
    // No points seeded — the creator has a balance of 0.

    const redemption = new RedemptionService();
    const billed = await issueScanBill(redemption, { bizUserId, creatorUserId, promotionId: promo.id, billAmount: 1000 });
    expect(billed.pointsCost).toBe(500);

    await expect(redemption.confirm(creatorUserId, billed.id)).rejects.toThrow(/enough kolab points/i);
    expect(await prisma.walletTransaction.count({ where: { type: 'PROMO_REDEMPTION_DEBIT' } })).toBe(0);
    expect(await prisma.businessCreditsLedger.count()).toBe(0);
  });

  it('totalRedemptionLimit blocks a new issue once the cap of CONFIRMED redemptions is reached', async () => {
    const { bizUserId, creatorUserId, businessId, creatorId } = await seedCreatorBusiness();
    const promo = await seedPromotion(businessId, { discountValue: 10, minSpend: 0, totalRedemptionLimit: 1 });
    await recordWalletTransaction(prisma, { creatorId, type: 'ADJUSTMENT', direction: 'CREDIT', amount: 1000, description: 'seed' });

    const redemption = new RedemptionService();
    const billed = await issueScanBill(redemption, { bizUserId, creatorUserId, promotionId: promo.id, billAmount: 1000 });
    await redemption.confirm(creatorUserId, billed.id);

    // A different creator hits the promotion's total cap, not the
    // one-per-creator rule (which only blocks the first creator).
    const second = await seedCreator();
    await recordWalletTransaction(prisma, { creatorId: second.creatorId, type: 'ADJUSTMENT', direction: 'CREDIT', amount: 1000, description: 'seed' });
    await expect(redemption.issue(second.creatorUserId, promo.id)).rejects.toThrow(/limit/i);
  });

  it('a session past its expiry is rejected instead of scanned', async () => {
    const { bizUserId, creatorUserId, businessId } = await seedCreatorBusiness();
    const promo = await seedPromotion(businessId, { discountValue: 10, minSpend: 0 });

    const redemption = new RedemptionService();
    const { session } = await redemption.issue(creatorUserId, promo.id);
    await prisma.redemptionSession.update({ where: { id: session.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

    const row = await prisma.redemptionSession.findUniqueOrThrow({ where: { id: session.id } });
    await expect(redemption.scan(bizUserId, row.token)).rejects.toThrow(/expired/i);
    expect((await prisma.redemptionSession.findUniqueOrThrow({ where: { id: session.id } })).status).toBe('EXPIRED');
  });

  it('two simultaneous confirms on the same session settle exactly once', async () => {
    const { bizUserId, creatorUserId, businessId, creatorId } = await seedCreatorBusiness();
    const promo = await seedPromotion(businessId, { discountValue: 10, minSpend: 0 });
    await recordWalletTransaction(prisma, { creatorId, type: 'ADJUSTMENT', direction: 'CREDIT', amount: 1000, description: 'seed' });

    const redemption = new RedemptionService();
    const billed = await issueScanBill(redemption, { bizUserId, creatorUserId, promotionId: promo.id, billAmount: 1000 });

    const results = await Promise.allSettled([
      redemption.confirm(creatorUserId, billed.id),
      redemption.confirm(creatorUserId, billed.id),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled').length).toBe(1);
    expect(results.filter((r) => r.status === 'rejected').length).toBe(1);
    // The row-lock + unique-constraint backstop must agree: exactly one
    // settlement made it into either ledger, never zero and never two.
    expect(await prisma.walletTransaction.count({ where: { referenceId: billed.id, type: 'PROMO_REDEMPTION_DEBIT' } })).toBe(1);
    expect(await prisma.businessCreditsLedger.count({ where: { referenceId: billed.id, type: 'PROMO_REDEMPTION_CREDIT' } })).toBe(1);
    expect(await pointsBalance(creatorId)).toBe(100); // 1000 seeded − 900 spent, exactly once
    expect(await creditsBalance(businessId)).toBe(900);
  });
});

d('Kolab Rewards — campaign-credit earmark', () => {
  beforeEach(resetDb);

  it('rejects applying more credits than the business has', async () => {
    const { bizUserId } = await seedCreatorBusiness();
    const campaignService = new CampaignService();

    await expect(campaignService.create(bizUserId, buildCampaignInput({ creditsToApply: 500 })))
      .rejects.toThrow(/enough kolab credits/i);
    expect(await prisma.campaign.count()).toBe(0);
  });

  it('applying credits within balance debits the ledger and stamps the campaign atomically', async () => {
    const { bizUserId, businessId } = await seedCreatorBusiness();
    await recordCreditsSeed(businessId, 300);

    const campaignService = new CampaignService();
    const campaign = await campaignService.create(bizUserId, buildCampaignInput({ creditsToApply: 120 }));

    expect(campaign.creditsApplied).toBe(120);
    expect(await creditsBalance(businessId)).toBe(180);
    const ledgerRow = await prisma.businessCreditsLedger.findFirstOrThrow({ where: { referenceId: campaign.id, type: 'CAMPAIGN_BUDGET_SPEND' } });
    expect(ledgerRow.amount).toBe(120);
    expect(ledgerRow.direction).toBe('DEBIT');
  });

  it('creating a campaign with no creditsToApply is completely unaffected', async () => {
    const { bizUserId, businessId } = await seedCreatorBusiness();
    await recordCreditsSeed(businessId, 300);

    const campaignService = new CampaignService();
    const campaign = await campaignService.create(bizUserId, buildCampaignInput({}));

    expect(campaign.creditsApplied).toBe(0);
    expect(await creditsBalance(businessId)).toBe(300);
    expect(await prisma.businessCreditsLedger.count({ where: { type: 'CAMPAIGN_BUDGET_SPEND' } })).toBe(0);
  });
});

d('Kolab Rewards — pay an accepted application with Business Credits', () => {
  beforeEach(resetDb);
  // finalizeApplicationPayment (exercised by every test below) fires several
  // notification/messaging writes fire-and-forget (`.catch(() => {})`, never
  // awaited). Without a beat between tests, the next test's resetDb() can
  // TRUNCATE those same tables while one is still in flight on a pooled
  // connection — observed as a Postgres deadlock (40P01) inside resetDb
  // itself. This isn't a Kolab Rewards correctness issue, just this
  // pre-existing fire-and-forget pattern racing test teardown.
  afterEach(() => new Promise((resolve) => setTimeout(resolve, 300)));

  it('rejects paying with credits when the balance is too low', async () => {
    const s = await seedAcceptedUnpaidApplication({ proposedRate: 2000 });
    const campaignService = new CampaignService();

    await expect(campaignService.payForApplication(s.applicationId, s.bizUserId, 'credits'))
      .rejects.toThrow(/enough kolab credits/i);

    const app = await prisma.application.findUniqueOrThrow({ where: { id: s.applicationId } });
    expect(app.paymentStatus).toBe('UNPAID');
    expect(app.escrowStatus).toBe('NOT_FUNDED');
  });

  it('paying with credits funds escrow and debits the ledger exactly once, no gateway involved', async () => {
    const s = await seedAcceptedUnpaidApplication({ proposedRate: 2000 });
    await recordCreditsSeed(s.businessId, 5000);

    const campaignService = new CampaignService();
    await campaignService.payForApplication(s.applicationId, s.bizUserId, 'credits');

    const app = await prisma.application.findUniqueOrThrow({ where: { id: s.applicationId } });
    expect(app.paymentStatus).toBe('PAID');
    expect(app.escrowStatus).toBe('HELD');
    expect(app.paymentMethod).toBe('credits');

    expect(await creditsBalance(s.businessId)).toBe(3000);
    expect(await prisma.businessCreditsLedger.count({ where: { referenceId: s.applicationId, type: 'CAMPAIGN_BUDGET_SPEND' } })).toBe(1);
    // Exclusive of a gateway — no PaymentTransaction row claims eSewa/Khalti.
    const escrowTx = await prisma.paymentTransaction.findFirstOrThrow({ where: { applicationId: s.applicationId, type: 'ESCROW_IN' } });
    expect(escrowTx.method).toBe('credits');
  });

  it('two simultaneous credit payments for the same application settle exactly once', async () => {
    const s = await seedAcceptedUnpaidApplication({ proposedRate: 1000 });
    await recordCreditsSeed(s.businessId, 5000);
    const campaignService = new CampaignService();

    const results = await Promise.allSettled([
      campaignService.payForApplication(s.applicationId, s.bizUserId, 'credits'),
      campaignService.payForApplication(s.applicationId, s.bizUserId, 'credits'),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled').length).toBe(1);
    expect(results.filter((r) => r.status === 'rejected').length).toBe(1);
    expect(await creditsBalance(s.businessId)).toBe(4000);
    expect(await prisma.businessCreditsLedger.count({ where: { referenceId: s.applicationId, type: 'CAMPAIGN_BUDGET_SPEND' } })).toBe(1);
  });
});

// Minimal valid PAID_CAMPAIGN create input — REMOTE so no location fields are required.
function buildCampaignInput(overrides: { creditsToApply?: number }) {
  return {
    title: 'Test Credits Campaign',
    description: 'd',
    category: 'Photography',
    goals: [],
    platforms: [],
    minFollowers: 0,
    contentType: '',
    deliverables: '',
    deadline: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    locationType: 'REMOTE' as const,
    budgetMin: 1000,
    budgetMax: 1000,
    paymentType: 'Fixed Fee',
    creatorsNeeded: 1,
    isFeatured: false,
    status: 'DRAFT' as const,
    campaignType: 'PAID_CAMPAIGN' as const,
    hashtags: [],
    benefits: [],
    targetAudience: [],
    aiGenerated: false,
    aiSuggestedCategories: [],
    aiNeedsInputFields: [],
    ...overrides,
  };
}

async function recordCreditsSeed(businessId: string, amount: number) {
  await recordCreditsTransaction(prisma, {
    businessId, type: 'ADJUSTMENT', direction: 'CREDIT', amount, description: 'seed',
  });
}
