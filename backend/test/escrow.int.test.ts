import { describe, it, expect, beforeEach } from 'vitest';
import { hasDb, resetDb, seedFundedEngagement, walletBalance } from './helpers';
import prisma from '../src/prisma';
import { escrowService } from '../src/modules/campaign/escrow.service';
import { runEscrowSweep } from '../src/jobs/escrowStateMachine';

const d = hasDb ? describe : describe.skip;

d('EscrowService — financial idempotency (§42/§43)', () => {
  beforeEach(resetDb);

  it('release: credits the creator exactly once no matter how many times it runs', async () => {
    const s = await seedFundedEngagement({ proposedRate: 5000 });

    const r1 = await escrowService.release({ applicationId: s.applicationId, actor: { userId: s.bizUserId, type: 'BUSINESS' } });
    const r2 = await escrowService.release({ applicationId: s.applicationId, actor: { userId: s.bizUserId, type: 'BUSINESS' } });
    const r3 = await escrowService.release({ applicationId: s.applicationId, actor: { type: 'SYSTEM' } });

    expect(r1.released).toBe(true);
    expect(r2.released).toBe(false);
    expect(r3.released).toBe(false);
    expect(await walletBalance(s.creatorId)).toBe(5000);
    expect(await prisma.paymentTransaction.count({ where: { applicationId: s.applicationId, type: 'PAYOUT' } })).toBe(1);
    expect(await prisma.walletTransaction.count({ where: { referenceId: s.applicationId, type: 'CAMPAIGN_PAYOUT' } })).toBe(1);

    const app = await prisma.application.findUniqueOrThrow({ where: { id: s.applicationId } });
    expect(app.escrowStatus).toBe('RELEASED');
    expect(app.workStatus).toBe('COMPLETED');
    expect(app.paymentStatus).toBe('RELEASED');
  });

  it('refund: returns money once and is a no-op afterwards', async () => {
    const s = await seedFundedEngagement({ proposedRate: 3000 });

    const f1 = await escrowService.refund({ applicationId: s.applicationId, reason: 'test' });
    const f2 = await escrowService.refund({ applicationId: s.applicationId, reason: 'test again' });

    expect(f1).toMatchObject({ refunded: true, amount: 3000, partial: false });
    expect(f2.refunded).toBe(false);
    expect(await prisma.paymentTransaction.count({ where: { applicationId: s.applicationId, type: 'REFUND' } })).toBe(1);

    const app = await prisma.application.findUniqueOrThrow({ where: { id: s.applicationId } });
    expect(app.escrowStatus).toBe('REFUNDED');
    expect(app.workStatus).toBe('CANCELLED');
    expect(await walletBalance(s.creatorId)).toBe(0);
  });

  it('release refuses a frozen escrow unless the actor is an admin', async () => {
    const s = await seedFundedEngagement();
    await prisma.application.update({ where: { id: s.applicationId }, data: { escrowStatus: 'FROZEN', workStatus: 'DISPUTED' } });

    await expect(escrowService.release({ applicationId: s.applicationId, actor: { userId: s.bizUserId, type: 'BUSINESS' } }))
      .rejects.toThrow(/dispute/i);
    const r = await escrowService.release({ applicationId: s.applicationId, actor: { userId: s.adminId, type: 'ADMIN' } });
    expect(r.released).toBe(true);
  });
});

d('Disputes (§27–§28)', () => {
  beforeEach(resetDb);

  it('raise freezes the escrow and blocks a second dispute', async () => {
    const s = await seedFundedEngagement();
    const { disputeId } = await escrowService.raiseDispute({
      applicationId: s.applicationId, raisedByUserId: s.creatorUserId, raisedByRole: 'CREATOR', reason: 'brief changed',
    });
    expect(disputeId).toBeTruthy();

    const app = await prisma.application.findUniqueOrThrow({ where: { id: s.applicationId } });
    expect(app.escrowStatus).toBe('FROZEN');
    expect(app.workStatus).toBe('DISPUTED');

    await expect(escrowService.raiseDispute({
      applicationId: s.applicationId, raisedByUserId: s.bizUserId, raisedByRole: 'BUSINESS', reason: 'x',
    })).rejects.toThrow(/already open/i);
  });

  it('PARTIAL resolution splits the escrow and is idempotent', async () => {
    const s = await seedFundedEngagement({ proposedRate: 10_000 });
    const { disputeId } = await escrowService.raiseDispute({
      applicationId: s.applicationId, raisedByUserId: s.bizUserId, raisedByRole: 'BUSINESS', reason: 'partly unusable',
    });

    await escrowService.resolveDispute({
      disputeId, adminUserId: s.adminId, outcome: 'PARTIAL', note: 'half each', creatorAmount: 6000, businessAmount: 4000,
    });

    expect(await walletBalance(s.creatorId)).toBe(6000);
    const txns = await prisma.paymentTransaction.findMany({ where: { applicationId: s.applicationId }, select: { type: true, amount: true } });
    expect(txns).toEqual(expect.arrayContaining([
      { type: 'ESCROW_IN', amount: 10_000 },
      { type: 'PARTIAL_REFUND', amount: 4000 },
      { type: 'PAYOUT', amount: 6000 },
    ]));
    const app = await prisma.application.findUniqueOrThrow({ where: { id: s.applicationId } });
    expect(app.escrowStatus).toBe('PARTIALLY_REFUNDED');
    expect(app.workStatus).toBe('COMPLETED');

    await expect(escrowService.resolveDispute({
      disputeId, adminUserId: s.adminId, outcome: 'PARTIAL', note: 'x', creatorAmount: 6000, businessAmount: 4000,
    })).rejects.toThrow(/already resolved/i);
  });

  it('rejects a PARTIAL split that does not sum to the escrow amount', async () => {
    const s = await seedFundedEngagement({ proposedRate: 10_000 });
    const { disputeId } = await escrowService.raiseDispute({
      applicationId: s.applicationId, raisedByUserId: s.bizUserId, raisedByRole: 'BUSINESS', reason: 'r',
    });
    await expect(escrowService.resolveDispute({
      disputeId, adminUserId: s.adminId, outcome: 'PARTIAL', note: 'bad', creatorAmount: 3000, businessAmount: 3000,
    })).rejects.toThrow(/must equal/i);
  });

  it('CREATOR_WON releases in full, BUSINESS_WON refunds in full', async () => {
    const won = await seedFundedEngagement({ proposedRate: 2000 });
    const wd = await escrowService.raiseDispute({ applicationId: won.applicationId, raisedByUserId: won.creatorUserId, raisedByRole: 'CREATOR', reason: 'r' });
    await escrowService.resolveDispute({ disputeId: wd.disputeId, adminUserId: won.adminId, outcome: 'CREATOR_WON', note: 'creator delivered' });
    expect(await walletBalance(won.creatorId)).toBe(2000);
    expect((await prisma.application.findUniqueOrThrow({ where: { id: won.applicationId } })).escrowStatus).toBe('RELEASED');

    const lost = await seedFundedEngagement({ proposedRate: 2000 });
    const ld = await escrowService.raiseDispute({ applicationId: lost.applicationId, raisedByUserId: lost.bizUserId, raisedByRole: 'BUSINESS', reason: 'r' });
    await escrowService.resolveDispute({ disputeId: ld.disputeId, adminUserId: lost.adminId, outcome: 'BUSINESS_WON', note: 'not delivered' });
    expect(await walletBalance(lost.creatorId)).toBe(0);
    expect((await prisma.application.findUniqueOrThrow({ where: { id: lost.applicationId } })).escrowStatus).toBe('REFUNDED');
  });
});

d('Sweeps (§10–§26)', () => {
  beforeEach(resetDb);

  it('confirmation timeout refunds in full and frees the slot; re-running does nothing', async () => {
    const s = await seedFundedEngagement({ workStatus: 'NONE', proposedRate: 4000 });
    await prisma.application.update({
      where: { id: s.applicationId },
      data: { creatorConfirmationDueAt: new Date(Date.now() - 3_600_000) },
    });

    await runEscrowSweep();
    let app = await prisma.application.findUniqueOrThrow({ where: { id: s.applicationId } });
    expect(app.escrowStatus).toBe('REFUNDED');
    expect(app.status).toBe('EXPIRED');
    expect((await prisma.campaign.findUniqueOrThrow({ where: { id: s.campaignId } })).status).toBe('ACTIVE');
    expect(await prisma.paymentTransaction.count({ where: { applicationId: s.applicationId, type: 'REFUND' } })).toBe(1);

    await runEscrowSweep();
    expect(await prisma.paymentTransaction.count({ where: { applicationId: s.applicationId, type: 'REFUND' } })).toBe(1);
  });

  it('content deadline → overdue → grace elapsed → CREATOR_FAILED + refund + reliability strike', async () => {
    const s = await seedFundedEngagement({ workStatus: 'IN_PROGRESS' });
    await prisma.application.update({
      where: { id: s.applicationId },
      data: { contentDeadline: new Date(Date.now() - 3_600_000) },
    });

    await runEscrowSweep();
    expect((await prisma.application.findUniqueOrThrow({ where: { id: s.applicationId } })).workStatus).toBe('CONTENT_OVERDUE');

    await prisma.application.update({
      where: { id: s.applicationId },
      data: { contentGraceDeadline: new Date(Date.now() - 3_600_000) },
    });
    await runEscrowSweep();
    const app = await prisma.application.findUniqueOrThrow({ where: { id: s.applicationId } });
    expect(app.workStatus).toBe('CREATOR_FAILED');
    expect(app.escrowStatus).toBe('REFUNDED');
    const rel = await prisma.creatorReliability.findUnique({ where: { creatorId: s.creatorId } });
    expect(rel?.failedCampaigns).toBe(1);
    expect(rel?.reliabilityScore).toBe(85);
  });

  it('settlement hold: RELEASE_PENDING releases once its window passes', async () => {
    const s = await seedFundedEngagement({ workStatus: 'APPROVED' });
    await prisma.application.update({
      where: { id: s.applicationId },
      data: { escrowStatus: 'RELEASE_PENDING', paymentReleaseAt: new Date(Date.now() - 3_600_000) },
    });

    await runEscrowSweep();
    const app = await prisma.application.findUniqueOrThrow({ where: { id: s.applicationId } });
    expect(app.escrowStatus).toBe('RELEASED');
    expect(await walletBalance(s.creatorId)).toBe(s.rate);

    await runEscrowSweep();
    expect(await prisma.walletTransaction.count({ where: { referenceId: s.applicationId, type: 'CAMPAIGN_PAYOUT' } })).toBe(1);
  });
});
