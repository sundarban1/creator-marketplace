import { describe, it, expect, beforeEach } from 'vitest';
import { hasDb, resetDb, seedFundedEngagement, seedAcceptedUnpaidApplication, walletBalance, creditsBalance } from './helpers';
import prisma from '../src/prisma';
import { escrowService } from '../src/modules/campaign/escrow.service';
import { CampaignService } from '../src/modules/campaign/campaign.service';
import { WithdrawalRepository } from '../src/modules/withdrawal/withdrawal.repository';
import { recordCreditsTransaction } from '../src/modules/credits/credits.ledger';

const d = hasDb ? describe : describe.skip;

// finalizeApplicationPayment is private — the gateway callbacks reach it only
// after an external verification call, so drive it directly here.
function finalize(s: Awaited<ReturnType<typeof seedAcceptedUnpaidApplication>>, method: string) {
  const svc = new CampaignService() as any;
  return svc.finalizeApplicationPayment({
    appId: s.applicationId, campaignId: s.campaignId, campaignTitle: 'Test Campaign',
    businessId: s.businessId, businessUserId: s.bizUserId, businessName: 'Test Co',
    creatorId: s.creatorId, creatorUserId: s.creatorUserId, proposedRate: s.rate, method,
  }) as Promise<'funded' | 'already' | 'late'>;
}

d('Escrow race guards', () => {
  beforeEach(resetDb);

  it('a gateway payment that lands after the slot expired is recorded and refunded, never left HELD', async () => {
    const s = await seedAcceptedUnpaidApplication({ proposedRate: 2000 });
    await prisma.application.update({ where: { id: s.applicationId }, data: { status: 'EXPIRED' } });

    expect(await finalize(s, 'esewa')).toBe('late');

    const app = await prisma.application.findUniqueOrThrow({ where: { id: s.applicationId } });
    expect(app.escrowStatus).toBe('REFUNDED');
    expect(app.paymentStatus).toBe('REFUNDED');
    expect(await prisma.paymentTransaction.count({ where: { applicationId: s.applicationId, type: 'ESCROW_IN' } })).toBe(1);
    expect(await prisma.paymentTransaction.count({ where: { applicationId: s.applicationId, type: 'REFUND' } })).toBe(1);
  });

  it('credits are never debited for an expired slot', async () => {
    const s = await seedAcceptedUnpaidApplication({ proposedRate: 2000 });
    await recordCreditsTransaction(prisma, { businessId: s.businessId, type: 'ADJUSTMENT', direction: 'CREDIT', amount: 5000, description: 'seed' });
    await prisma.application.update({ where: { id: s.applicationId }, data: { status: 'EXPIRED' } });

    await expect(finalize(s, 'credits')).rejects.toThrow();
    expect(await creditsBalance(s.businessId)).toBe(5000);
    const app = await prisma.application.findUniqueOrThrow({ where: { id: s.applicationId } });
    expect(app.escrowStatus).toBe('NOT_FUNDED');
  });

  it('the payment-timeout void skips an application that got funded meanwhile', async () => {
    const s = await seedFundedEngagement({ workStatus: 'NONE' });
    const { voided } = await escrowService.voidAssignment({
      applicationId: s.applicationId, reason: 'test', requireEscrowStatus: ['NOT_FUNDED'],
    });
    expect(voided).toBe(false);
    const app = await prisma.application.findUniqueOrThrow({ where: { id: s.applicationId } });
    expect(app.status).toBe('ACCEPTED');
  });

  it('the creator-failure refund skips an engagement the creator just submitted', async () => {
    const s = await seedFundedEngagement({ workStatus: 'SUBMITTED' });
    const r = await escrowService.refund({
      applicationId: s.applicationId, reason: 'test', actorType: 'SYSTEM',
      workStatusAfter: 'CREATOR_FAILED', requireWorkStatus: ['CONTENT_OVERDUE'],
    });
    expect(r.refunded).toBe(false);
    const app = await prisma.application.findUniqueOrThrow({ where: { id: s.applicationId } });
    expect(app.escrowStatus).toBe('HELD');
    expect(app.workStatus).toBe('SUBMITTED');
  });

  it('confirmation-timeout refund expires the slot in the same transaction', async () => {
    const s = await seedFundedEngagement({ workStatus: 'NONE' });
    const r = await escrowService.refund({
      applicationId: s.applicationId, reason: 'test', actorType: 'SYSTEM', silent: true,
      requireWorkStatus: ['NONE'], expireApplication: true,
    });
    expect(r.refunded).toBe(true);
    const app = await prisma.application.findUniqueOrThrow({ where: { id: s.applicationId } });
    expect(app.escrowStatus).toBe('REFUNDED');
    expect(app.status).toBe('EXPIRED');
  });

  it('a settlement release racing a dispute never both pays out and freezes', async () => {
    const s = await seedFundedEngagement({ workStatus: 'APPROVED' });
    await prisma.application.update({ where: { id: s.applicationId }, data: { escrowStatus: 'RELEASE_PENDING' } });

    await Promise.allSettled([
      escrowService.release({ applicationId: s.applicationId, actor: { type: 'SYSTEM' }, requireEscrowStatus: ['RELEASE_PENDING'] }),
      escrowService.raiseDispute({ applicationId: s.applicationId, raisedByUserId: s.bizUserId, raisedByRole: 'BUSINESS', reason: 'race' }),
    ]);

    const app = await prisma.application.findUniqueOrThrow({ where: { id: s.applicationId } });
    const paid = await walletBalance(s.creatorId);
    if (app.escrowStatus === 'FROZEN') expect(paid).toBe(0);
    else {
      expect(app.escrowStatus).toBe('RELEASED');
      expect(paid).toBe(s.rate);
    }
  });

  it('a withdrawal transition never overwrites a status that moved on', async () => {
    const s = await seedFundedEngagement();
    const w = await prisma.withdrawal.create({
      data: { creatorId: s.creatorId, amount: 500, method: 'ESEWA', referenceCode: 'WD-RACETEST', status: 'PAID' },
    });
    const repo = new WithdrawalRepository();
    expect(await repo.transition(w.id, ['PENDING', 'PROCESSING'], { status: 'REJECTED' })).toBeNull();
    expect((await prisma.withdrawal.findUniqueOrThrow({ where: { id: w.id } })).status).toBe('PAID');
  });
});
