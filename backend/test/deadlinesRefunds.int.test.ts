import { describe, it, expect, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import { Role } from '@prisma/client';
import { hasDb, resetDb, seedFundedEngagement } from './helpers';
import prisma from '../src/prisma';
import { runEscrowSweep } from '../src/jobs/escrowStateMachine';
import { CampaignService } from '../src/modules/campaign/campaign.service';
import { escrowService } from '../src/modules/campaign/escrow.service';
import { deliverableDeadlineService as dds } from '../src/modules/campaign/deliverable-deadline.service';
import { refundAdminService as ras } from '../src/modules/refund/refund.admin.service';
import { sweepApplicationDeadlines, reopenApplications } from '../src/modules/campaign/proposal-deadline.service';
import { listAdminProposals } from '../src/modules/refund/proposals.admin.service';
import { refundAdminRoutes } from '../src/modules/refund/refund.admin.routes';
import { invalidateSettingsCache } from '../src/utils/settingsCache';

const d = hasDb ? describe : describe.skip;
const campaignService = new CampaignService();

const HOUR = 3_600_000;
const ago = (ms: number) => new Date(Date.now() - ms);
const ahead = (ms: number) => new Date(Date.now() + ms);

/** A funded engagement whose creator is working toward `deadline`. */
async function inProgress(deadline: Date, rate = 2000) {
  const s = await seedFundedEngagement({ workStatus: 'IN_PROGRESS', proposedRate: rate });
  await prisma.application.update({ where: { id: s.applicationId }, data: { contentDeadline: deadline, submittedAt: null } });
  return s;
}

/** In progress → deadline passes → swept to CONTENT_OVERDUE. */
async function overdue(rate = 2000) {
  const s = await inProgress(ago(HOUR), rate);
  await runEscrowSweep();
  return s;
}

const app = (id: string) => prisma.application.findUniqueOrThrow({ where: { id } });
const refunds = (applicationId: string) => prisma.refundRequest.findMany({ where: { applicationId } });

/** Take a refund request from PENDING all the way to COMPLETED. */
async function settle(refundId: string, adminId: string, amount: number) {
  await ras.setRecipient(refundId, adminId, { recipientName: 'Test Co', recipientMethod: 'ESEWA', account: { walletId: '9800000000' }, verified: true });
  await ras.approve(refundId, adminId, {});
  await ras.startProcessing(refundId, adminId, {});
  return ras.complete(refundId, adminId, { transferMethod: 'ESEWA', amount, transferredAt: new Date(), transferReference: `TX-${randomUUID().slice(0, 8)}` });
}

async function setSetting(key: string, value: unknown) {
  const v = JSON.stringify(value);
  await prisma.platformSetting.upsert({ where: { key }, update: { value: v }, create: { key, value: v } });
  invalidateSettingsCache();
}

// ─────────────────────────────────────────────────────────────────────────────
const settleThenReset = async () => { await new Promise((r) => setTimeout(r, 250)); await resetDb(); };

d('Deliverable deadlines & extensions', () => {
  beforeEach(settleThenReset);

  it('1. a submission before the deadline keeps its timestamp and is never cancelled later', async () => {
    const s = await inProgress(ahead(2 * HOUR));
    await campaignService.submitWork(s.applicationId, s.creatorUserId, { urls: 'https://drive.google.com/x' });
    const a1 = await app(s.applicationId);
    expect(a1.workStatus).toBe('SUBMITTED');
    expect(a1.submittedAt).not.toBeNull();

    // Even once the deadline is in the past, the sweep leaves it alone.
    await prisma.application.update({ where: { id: s.applicationId }, data: { contentDeadline: ago(HOUR) } });
    await runEscrowSweep();
    const a2 = await app(s.applicationId);
    expect(a2.workStatus).toBe('SUBMITTED');
    expect(a2.submittedAt?.getTime()).toBe(a1.submittedAt?.getTime());
    expect(await refunds(s.applicationId)).toHaveLength(0);
  });

  it('2. the original deadline passing marks the deliverable overdue, records the miss, and does not refund yet', async () => {
    const s = await inProgress(ago(HOUR));
    const before = await app(s.applicationId);
    await runEscrowSweep();
    const a = await app(s.applicationId);
    expect(a.workStatus).toBe('CONTENT_OVERDUE');
    expect(a.status).toBe('ACCEPTED'); // proposal status untouched
    expect(a.contentOverdueAt).not.toBeNull();
    expect(a.originalContentDeadline?.getTime()).toBe(before.contentDeadline?.getTime());
    expect(a.contentGraceDeadline!.getTime()).toBeGreaterThan(Date.now() + 23 * HOUR); // 24h decision window
    expect(a.escrowStatus).toBe('HELD');
    expect(await refunds(s.applicationId)).toHaveLength(0);
  });

  it('3. an overdue creator can request one extension; it blocks the automatic refund while pending', async () => {
    const s = await overdue();
    const ext = await dds.requestExtension(s.applicationId, s.creatorUserId, {
      reason: 'Video is edited, export failed overnight', proposedDeadline: ahead(12 * HOUR).toISOString(), previewUrl: 'drive.google.com/preview',
    });
    expect(ext.status).toBe('PENDING');
    expect(ext.previewUrl).toBe('https://drive.google.com/preview');

    await runEscrowSweep();
    expect((await app(s.applicationId)).workStatus).toBe('CONTENT_OVERDUE');
    expect(await refunds(s.applicationId)).toHaveLength(0);

    // Requesting doesn't reopen anything — direct submission is still refused.
    await expect(campaignService.submitWork(s.applicationId, s.creatorUserId, { urls: 'https://x.dev/a' })).rejects.toThrow(/extension/i);
  });

  it('4. business approves the extension → deliverable reopens with the new deadline and the creator can submit', async () => {
    const s = await overdue();
    const newDeadline = ahead(10 * HOUR);
    const ext = await dds.requestExtension(s.applicationId, s.creatorUserId, { reason: 'Need a few more hours please', proposedDeadline: newDeadline.toISOString() });
    await dds.approveExtension(s.applicationId, ext.id, s.bizUserId, { note: 'ok' });

    const a = await app(s.applicationId);
    expect(a.workStatus).toBe('IN_PROGRESS');
    expect(a.contentDeadline?.getTime()).toBe(newDeadline.getTime());
    expect(a.extensionCount).toBe(1);
    expect(a.escrowStatus).toBe('HELD'); // funds stay reserved
    expect((await prisma.deliverableExtension.findUniqueOrThrow({ where: { id: ext.id } })).status).toBe('APPROVED');

    await campaignService.submitWork(s.applicationId, s.creatorUserId, { urls: 'https://x.dev/final' });
    expect((await app(s.applicationId)).workStatus).toBe('SUBMITTED');
  });

  it('5. business rejects the extension → deliverable closed + exactly one refund request', async () => {
    const s = await overdue();
    const ext = await dds.requestExtension(s.applicationId, s.creatorUserId, { reason: 'Need a few more hours please', proposedDeadline: ahead(10 * HOUR).toISOString() });
    await expect(dds.rejectExtension(s.applicationId, ext.id, s.bizUserId, { note: '' })).rejects.toThrow(/reason/i);
    await dds.rejectExtension(s.applicationId, ext.id, s.bizUserId, { note: 'We needed it for the launch' });

    const a = await app(s.applicationId);
    expect(a.workStatus).toBe('CREATOR_FAILED');
    expect(a.escrowStatus).toBe('REFUND_PENDING');
    expect(a.deliverableClosedAt).not.toBeNull();
    const rr = await refunds(s.applicationId);
    expect(rr).toHaveLength(1);
    expect(rr[0]).toMatchObject({ reasonCode: 'EXTENSION_REJECTED', status: 'PENDING', currency: 'NPR' });
    expect((await prisma.deliverableExtension.findUniqueOrThrow({ where: { id: ext.id } })).status).toBe('REJECTED');
  });

  it('6. the extended deadline passing closes the deliverable straight away and refuses submissions', async () => {
    const s = await overdue();
    const ext = await dds.requestExtension(s.applicationId, s.creatorUserId, { reason: 'Need a few more hours please', proposedDeadline: ahead(10 * HOUR).toISOString() });
    await dds.approveExtension(s.applicationId, ext.id, s.bizUserId, {});
    await prisma.application.update({ where: { id: s.applicationId }, data: { contentDeadline: ago(60_000) } });

    await runEscrowSweep();
    const a = await app(s.applicationId);
    expect(a.workStatus).toBe('CREATOR_FAILED');
    expect(a.status).toBe('ACCEPTED');
    const rr = await refunds(s.applicationId);
    expect(rr).toHaveLength(1);
    expect(rr[0].reasonCode).toBe('DEADLINE_MISSED');
    await expect(campaignService.submitWork(s.applicationId, s.creatorUserId, { urls: 'https://x.dev/late' })).rejects.toThrow(/closed/i);
  });

  it('7. a pending extension when the decision window lapses → request EXPIRED, deliverable cancelled + refunded', async () => {
    const s = await overdue();
    const ext = await dds.requestExtension(s.applicationId, s.creatorUserId, { reason: 'Need a few more hours please', proposedDeadline: ahead(10 * HOUR).toISOString() });
    await prisma.application.update({ where: { id: s.applicationId }, data: { contentGraceDeadline: ago(60_000) } });

    await runEscrowSweep();
    expect((await prisma.deliverableExtension.findUniqueOrThrow({ where: { id: ext.id } })).status).toBe('EXPIRED');
    expect((await app(s.applicationId)).workStatus).toBe('CREATOR_FAILED');
    const rr = await refunds(s.applicationId);
    expect(rr.map((r) => r.reasonCode)).toEqual(['EXTENSION_EXPIRED']);
    // Business can no longer decide it.
    await expect(dds.approveExtension(s.applicationId, ext.id, s.bizUserId, {})).rejects.toThrow(/decided/i);
  });

  it('8. a second extension cannot be requested by the creator or granted by the business', async () => {
    const s = await overdue();
    const ext = await dds.requestExtension(s.applicationId, s.creatorUserId, { reason: 'Need a few more hours please', proposedDeadline: ahead(10 * HOUR).toISOString() });
    await expect(dds.requestExtension(s.applicationId, s.creatorUserId, { reason: 'Asking again for more time', proposedDeadline: ahead(20 * HOUR).toISOString() }))
      .rejects.toThrow(/already requested/i);
    await dds.approveExtension(s.applicationId, ext.id, s.bizUserId, {});
    // Missed again → closed; creator still can't ask again.
    await prisma.application.update({ where: { id: s.applicationId }, data: { contentDeadline: ago(60_000) } });
    await runEscrowSweep();
    await expect(dds.requestExtension(s.applicationId, s.creatorUserId, { reason: 'One more chance please', proposedDeadline: ahead(10 * HOUR).toISOString() }))
      .rejects.toThrow();
    // Max 48h per extension.
    const s2 = await overdue();
    await expect(dds.requestExtension(s2.applicationId, s2.creatorUserId, { reason: 'Need a few more days please', proposedDeadline: ahead(72 * HOUR).toISOString() }))
      .rejects.toThrow(/48 hours/);
  });

  it('9. an admin exceptional extension needs consent + reason, reopens a closed deliverable and voids the pending refund', async () => {
    // Standard extension used and missed → closed with a pending refund.
    const s = await overdue();
    const std = await dds.requestExtension(s.applicationId, s.creatorUserId, { reason: 'Need a few more hours please', proposedDeadline: ahead(10 * HOUR).toISOString() });
    await dds.approveExtension(s.applicationId, std.id, s.bizUserId, {});
    await prisma.application.update({ where: { id: s.applicationId }, data: { contentDeadline: ago(60_000) } });
    await runEscrowSweep();
    const [rr] = await refunds(s.applicationId);
    expect(rr.status).toBe('PENDING');

    await expect(dds.grantExceptionalExtension(s.applicationId, s.adminId, { newDeadline: ahead(10 * HOUR).toISOString(), reason: 'Agreed by phone', businessConsent: false }))
      .rejects.toThrow(/consent/i);
    await expect(dds.grantExceptionalExtension(s.applicationId, s.adminId, { newDeadline: ahead(10 * HOUR).toISOString(), reason: '', businessConsent: true }))
      .rejects.toThrow(/reason/i);

    await dds.grantExceptionalExtension(s.applicationId, s.adminId, { newDeadline: ahead(10 * HOUR).toISOString(), reason: 'Business agreed on a call', businessConsent: true });
    const a = await app(s.applicationId);
    expect(a.workStatus).toBe('IN_PROGRESS');
    expect(a.escrowStatus).toBe('HELD');
    expect(a.extensionCount).toBe(2);
    expect(a.deliverableClosedAt).toBeNull();
    expect((await prisma.refundRequest.findUniqueOrThrow({ where: { id: rr.id } })).status).toBe('CANCELLED');
    const ext = await prisma.deliverableExtension.findFirstOrThrow({ where: { applicationId: s.applicationId, kind: 'ADMIN_EXCEPTIONAL' } });
    expect(ext).toMatchObject({ businessConsent: true, decidedByRole: 'ADMIN', decisionNote: 'Business agreed on a call' });

    // Missed again → the same refund request comes back (still one row).
    await prisma.application.update({ where: { id: s.applicationId }, data: { contentDeadline: ago(60_000) } });
    await runEscrowSweep();
    const after = await refunds(s.applicationId);
    expect(after).toHaveLength(1);
    expect(after[0].status).toBe('PENDING');
    // Cap of 2 extensions reached — no unlimited resets.
    await expect(dds.grantExceptionalExtension(s.applicationId, s.adminId, { newDeadline: ahead(10 * HOUR).toISOString(), reason: 'again', businessConsent: true }))
      .rejects.toThrow(/maximum/i);
  });

  it('10. a stale deadline job after an approved extension does nothing', async () => {
    const s = await overdue();
    const ext = await dds.requestExtension(s.applicationId, s.creatorUserId, { reason: 'Need a few more hours please', proposedDeadline: ahead(10 * HOUR).toISOString() });
    await dds.approveExtension(s.applicationId, ext.id, s.bizUserId, {});

    expect(await dds.handleDecisionWindowLapsed(s.applicationId, ahead(48 * HOUR))).toBe(false);
    expect(await dds.handleMissedDeadline(s.applicationId)).toBeNull(); // new deadline is in the future
    const a = await app(s.applicationId);
    expect(a.workStatus).toBe('IN_PROGRESS');
    expect(await refunds(s.applicationId)).toHaveLength(0);
  });

  it('11. a submission racing the deadline job ends in exactly one consistent outcome', async () => {
    for (let i = 0; i < 6; i++) {
      const s = await inProgress(ahead(40 + i * 15));
      await new Promise((r) => setTimeout(r, 40));
      const [submit] = await Promise.allSettled([
        campaignService.submitWork(s.applicationId, s.creatorUserId, { urls: 'https://x.dev/race' }),
        dds.handleMissedDeadline(s.applicationId),
      ]);
      const a = await app(s.applicationId);
      if (submit.status === 'fulfilled') {
        expect(a.workStatus).toBe('SUBMITTED');
        expect(a.submittedAt!.getTime()).toBeLessThanOrEqual(a.contentDeadline!.getTime());
      } else {
        // The late submission was refused. Either the job already moved it to
        // overdue, or it ran a hair before the deadline and the next run will.
        expect(['CONTENT_OVERDUE', 'IN_PROGRESS']).toContain(a.workStatus);
        expect(a.submittedAt).toBeNull();
        await dds.handleMissedDeadline(s.applicationId);
        expect((await app(s.applicationId)).workStatus).toBe('CONTENT_OVERDUE');
      }
      expect(await refunds(s.applicationId)).toHaveLength(0);
    }
  });

  it('12. a creator cannot submit or upload to a cancelled deliverable', async () => {
    const s = await overdue();
    await dds.cancelOverdue(s.applicationId, s.bizUserId, {});
    await expect(campaignService.submitWork(s.applicationId, s.creatorUserId, { urls: 'https://x.dev/a' })).rejects.toThrow(/closed/i);
    await expect(campaignService.requestDeliverableVideoSignature(s.applicationId, s.creatorUserId, 1000, 'video/mp4')).rejects.toThrow(/closed/i);
  });

  it('13. once the refund is completed the original deliverable can never be reopened', async () => {
    const s = await overdue();
    await dds.cancelOverdue(s.applicationId, s.bizUserId, {});
    const [rr] = await refunds(s.applicationId);
    await settle(rr.id, s.adminId, 2000);
    expect((await app(s.applicationId)).escrowStatus).toBe('REFUNDED');

    await expect(dds.grantExceptionalExtension(s.applicationId, s.adminId, { newDeadline: ahead(10 * HOUR).toISOString(), reason: 'creator has the video', businessConsent: true }))
      .rejects.toThrow(/new agreement/i);
    await expect(dds.requestExtension(s.applicationId, s.creatorUserId, { reason: 'I have the video now', proposedDeadline: ahead(5 * HOUR).toISOString() }))
      .rejects.toThrow();
    expect(await refunds(s.applicationId)).toHaveLength(1);
  });

  it('only the owning business can decide; only the owning creator can request', async () => {
    const s = await overdue();
    const other = await seedFundedEngagement();
    await expect(dds.requestExtension(s.applicationId, other.creatorUserId, { reason: 'not my engagement', proposedDeadline: ahead(5 * HOUR).toISOString() }))
      .rejects.toThrow(/authorized/i);
    const ext = await dds.requestExtension(s.applicationId, s.creatorUserId, { reason: 'Need a few more hours please', proposedDeadline: ahead(10 * HOUR).toISOString() });
    await expect(dds.approveExtension(s.applicationId, ext.id, other.bizUserId, {})).rejects.toThrow(/authorized/i);
    await expect(dds.cancelOverdue(s.applicationId, other.bizUserId, {})).rejects.toThrow(/authorized/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
d('Refund requests (admin manual transfer)', () => {
  beforeEach(settleThenReset);

  it('14–15. an eligible cancellation creates exactly one request, re-running the job adds none', async () => {
    const s = await overdue(5000);
    await prisma.application.update({ where: { id: s.applicationId }, data: { contentGraceDeadline: ago(60_000) } });
    await runEscrowSweep();
    await runEscrowSweep();
    await dds.handleDecisionWindowLapsed(s.applicationId);
    const rr = await refunds(s.applicationId);
    expect(rr).toHaveLength(1);
    expect(Number(rr[0].refundableAmount)).toBe(5000);
    expect(Number(rr[0].originalAmount)).toBe(5000);
    expect(rr[0].referenceCode).toMatch(/^RF-[A-Z2-9]{8}$/);
    expect(rr[0].paymentTransactionId).not.toBeNull();
    expect(await prisma.refundRequestEvent.count({ where: { refundRequestId: rr[0].id } })).toBe(1);
  });

  it('16–18. approve, reject-needs-reason, record transfer → COMPLETED with one ledger row', async () => {
    const s = await seedFundedEngagement({ proposedRate: 3000 });
    const { refundRequestId } = await escrowService.refund({ applicationId: s.applicationId, reason: 'test' });
    const id = refundRequestId!;

    await expect(ras.reject(id, s.adminId, { reason: '  ' })).rejects.toThrow(/reason/i);
    await expect(ras.startProcessing(id, s.adminId, {})).rejects.toThrow(/pending/i);

    await ras.approve(id, s.adminId, { note: 'checked' });
    expect((await prisma.refundRequest.findUniqueOrThrow({ where: { id } })).status).toBe('APPROVED');
    await expect(ras.startProcessing(id, s.adminId, {})).rejects.toThrow(/recipient/i);
    await ras.setRecipient(id, s.adminId, { recipientName: 'Test Co', recipientMethod: 'BANK', account: { bankName: 'NIC Asia', accountNumber: '0101' }, verified: true });
    await expect(ras.complete(id, s.adminId, { transferMethod: 'BANK', amount: 3000, transferredAt: new Date(), transferReference: 'X' })).rejects.toThrow(/processing/i);
    await ras.startProcessing(id, s.adminId, {});
    // Starting a transfer is not completing it.
    expect((await app(s.applicationId)).escrowStatus).toBe('REFUND_PENDING');
    expect(await prisma.paymentTransaction.count({ where: { applicationId: s.applicationId, type: 'REFUND' } })).toBe(0);

    const done = await ras.complete(id, s.adminId, { transferMethod: 'BANK', amount: 3000, transferredAt: new Date(), transferReference: 'NIC-778899' });
    expect(done.status).toBe('COMPLETED');
    expect(done.transfer.reference).toBe('NIC-778899');
    expect(await prisma.paymentTransaction.count({ where: { applicationId: s.applicationId, type: 'REFUND' } })).toBe(1);
    expect(await prisma.paymentTransaction.count({ where: { applicationId: s.applicationId, type: 'ESCROW_IN' } })).toBe(1); // original untouched
    const a = await app(s.applicationId);
    expect(a.escrowStatus).toBe('REFUNDED');
    expect(a.paymentStatus).toBe('REFUNDED');
    expect(done.events.map((e) => e.action)).toEqual(['created', 'approved', 'recipient_verified', 'processing', 'completed']);
  });

  it('19. a failed transfer can be retried without a duplicate refund', async () => {
    const s = await seedFundedEngagement({ proposedRate: 3000 });
    const { refundRequestId: id } = await escrowService.refund({ applicationId: s.applicationId, reason: 'test' });
    await ras.setRecipient(id!, s.adminId, { recipientName: 'Test Co', recipientMethod: 'KHALTI', account: { walletId: '98' }, verified: true });
    await ras.approve(id!, s.adminId, {});
    await ras.startProcessing(id!, s.adminId, {});
    await expect(ras.fail(id!, s.adminId, { reason: '' })).rejects.toThrow();
    await ras.fail(id!, s.adminId, { reason: 'Wallet rejected the transfer' });
    expect((await prisma.refundRequest.findUniqueOrThrow({ where: { id: id! } })).status).toBe('FAILED');
    expect((await app(s.applicationId)).escrowStatus).toBe('REFUND_PENDING');

    await ras.startProcessing(id!, s.adminId, { note: 'retry via bank' });
    await ras.complete(id!, s.adminId, { transferMethod: 'BANK', amount: 3000, transferredAt: new Date(), transferReference: 'R2' });
    const row = await prisma.refundRequest.findUniqueOrThrow({ where: { id: id! } });
    expect(row.attemptCount).toBe(2);
    expect(await prisma.paymentTransaction.count({ where: { applicationId: s.applicationId, type: { in: ['REFUND', 'PARTIAL_REFUND'] } } })).toBe(1);
  });

  it('20. never refunds more than approved or than what remains refundable', async () => {
    const s = await seedFundedEngagement({ proposedRate: 3000 });
    const { refundRequestId: id } = await escrowService.refund({ applicationId: s.applicationId, reason: 'test' });
    await expect(ras.approve(id!, s.adminId, { amount: 3500 })).rejects.toThrow(/exceed/i);
    await ras.setRecipient(id!, s.adminId, { recipientName: 'Test Co', recipientMethod: 'BANK', account: { accountNumber: '1' }, verified: true });
    await ras.approve(id!, s.adminId, {});
    await ras.startProcessing(id!, s.adminId, {});
    await expect(ras.complete(id!, s.adminId, { transferMethod: 'BANK', amount: 3000.01, transferredAt: new Date(), transferReference: 'X' }))
      .rejects.toThrow(/cannot exceed/i);
    await expect(ras.complete(id!, s.adminId, { transferMethod: 'BANK', amount: 3000, currency: 'USD', transferredAt: new Date(), transferReference: 'X' }))
      .rejects.toThrow(/NPR/);
    // Somehow money already went back outside this request → remaining is 0.
    await prisma.paymentTransaction.create({ data: { type: 'PARTIAL_REFUND', amount: 3000, applicationId: s.applicationId, campaignId: s.campaignId, businessId: s.businessId, reference: `manual:${s.applicationId}` } });
    await expect(ras.complete(id!, s.adminId, { transferMethod: 'BANK', amount: 3000, transferredAt: new Date(), transferReference: 'X' }))
      .rejects.toThrow(/still refundable/i);
  });

  it('21. two admins completing the same refund concurrently → one wins, one ledger row', async () => {
    const s = await seedFundedEngagement({ proposedRate: 3000 });
    const { refundRequestId: id } = await escrowService.refund({ applicationId: s.applicationId, reason: 'test' });
    const admin2 = await prisma.user.create({ data: { email: `adm2-${randomUUID()}@test.dev`, password: 'x', role: 'ADMIN' } });
    await ras.setRecipient(id!, s.adminId, { recipientName: 'Test Co', recipientMethod: 'BANK', account: { accountNumber: '1' }, verified: true });
    await ras.approve(id!, s.adminId, {});
    await ras.startProcessing(id!, s.adminId, {});
    const results = await Promise.allSettled([
      ras.complete(id!, s.adminId, { transferMethod: 'BANK', amount: 3000, transferredAt: new Date(), transferReference: 'A' }),
      ras.complete(id!, admin2.id, { transferMethod: 'BANK', amount: 3000, transferredAt: new Date(), transferReference: 'B' }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(await prisma.paymentTransaction.count({ where: { applicationId: s.applicationId, type: 'REFUND' } })).toBe(1);
  });

  it('22. financial endpoints are admin-only', async () => {
    const authLayer = refundAdminRoutes.stack.find((l) => !l.route && l.name !== 'authenticate' && l.handle.length === 3 && l !== refundAdminRoutes.stack[0]);
    const guard = (authLayer ?? refundAdminRoutes.stack[1]).handle as (req: unknown, res: unknown, next: (err?: unknown) => void) => void;
    for (const role of [Role.BUSINESS, Role.CREATOR]) {
      let err: unknown;
      guard({ user: { id: 'u', role } }, {}, (e?: unknown) => { err = e; });
      expect((err as { statusCode?: number })?.statusCode).toBe(403);
    }
    let ok: unknown = 'unset';
    guard({ user: { id: 'u', role: Role.ADMIN } }, {}, (e?: unknown) => { ok = e; });
    expect(ok).toBeUndefined();
  });

  it('23. partial refunds: a split settlement and a short transfer are recorded as partial', async () => {
    const s = await seedFundedEngagement({ proposedRate: 10_000 });
    const { disputeId } = await escrowService.raiseDispute({ applicationId: s.applicationId, raisedByUserId: s.bizUserId, raisedByRole: 'BUSINESS', reason: 'half usable' });
    await escrowService.resolveDispute({ disputeId, adminUserId: s.adminId, outcome: 'PARTIAL', note: 'split', creatorAmount: 6000, businessAmount: 4000 });
    const [rr] = await refunds(s.applicationId);
    expect(rr.partial).toBe(true);
    await settle(rr.id, s.adminId, 4000);
    expect(await prisma.paymentTransaction.count({ where: { applicationId: s.applicationId, type: 'PARTIAL_REFUND' } })).toBe(1);
    expect((await app(s.applicationId)).escrowStatus).toBe('PARTIALLY_REFUNDED');
    const detail = await ras.detail(rr.id);
    expect(detail.payment.remainingRefundable).toBe(0);

    // Full request settled with a smaller (approved-down) amount.
    const t = await seedFundedEngagement({ proposedRate: 3000 });
    const { refundRequestId } = await escrowService.refund({ applicationId: t.applicationId, reason: 'test' });
    await ras.setRecipient(refundRequestId!, t.adminId, { recipientName: 'Test Co', recipientMethod: 'BANK', account: { accountNumber: '1' }, verified: true });
    await ras.approve(refundRequestId!, t.adminId, { amount: 2500, note: 'bank fee deducted by policy' });
    const approved = await prisma.refundRequest.findUniqueOrThrow({ where: { id: refundRequestId! } });
    expect(Number(approved.refundableAmount)).toBe(2500);
    expect(Number(approved.deductionAmount)).toBe(500);
    await ras.startProcessing(refundRequestId!, t.adminId, {});
    await ras.complete(refundRequestId!, t.adminId, { transferMethod: 'BANK', amount: 2500, transferredAt: new Date(), transferReference: 'P' });
    expect((await app(t.applicationId)).escrowStatus).toBe('REFUNDED');
  });

  it('dual approval: above the threshold a second, different admin must approve', async () => {
    await setSetting('refund.dualApprovalThreshold', 1000);
    try {
      const s = await seedFundedEngagement({ proposedRate: 3000 });
      const { refundRequestId: id } = await escrowService.refund({ applicationId: s.applicationId, reason: 'test' });
      await ras.approve(id!, s.adminId, {});
      expect((await prisma.refundRequest.findUniqueOrThrow({ where: { id: id! } })).status).toBe('PENDING');
      await expect(ras.approve(id!, s.adminId, {})).rejects.toThrow(/different admin/i);
      const admin2 = await prisma.user.create({ data: { email: `adm2-${randomUUID()}@test.dev`, password: 'x', role: 'ADMIN' } });
      await ras.approve(id!, admin2.id, {});
      expect((await prisma.refundRequest.findUniqueOrThrow({ where: { id: id! } })).status).toBe('APPROVED');
    } finally {
      await prisma.platformSetting.deleteMany({ where: { key: 'refund.dualApprovalThreshold' } });
      invalidateSettingsCache();
    }
  });

  it('rejecting restores the prior escrow hold; listing filters, totals and search work', async () => {
    const s = await seedFundedEngagement({ proposedRate: 3000 });
    const { refundRequestId: id, referenceCode } = await escrowService.refund({ applicationId: s.applicationId, reason: 'test' });
    const t = await seedFundedEngagement({ proposedRate: 1000 });
    await escrowService.refund({ applicationId: t.applicationId, reason: 'test' });

    let list = await ras.list({ page: 1, limit: 20 });
    expect(list.summary).toMatchObject({ pendingCount: 2, pendingAmount: 4000 });
    list = await ras.list({ page: 1, limit: 20, sort: 'amount', order: 'asc' });
    expect(list.items.map((i) => i.refundableAmount)).toEqual([1000, 3000]);
    list = await ras.list({ page: 1, limit: 20, search: referenceCode });
    expect(list.items).toHaveLength(1);

    await ras.reject(id!, s.adminId, { reason: 'Duplicate of an offline refund' });
    expect((await app(s.applicationId)).escrowStatus).toBe('HELD');
    list = await ras.list({ page: 1, limit: 20, status: 'REJECTED' });
    expect(list.items.map((i) => i.id)).toEqual([id]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
d('Proposal / application deadlines', () => {
  beforeEach(settleThenReset);

  async function openCampaign(applicationDeadline: Date) {
    const s = await seedFundedEngagement();
    await prisma.campaign.update({ where: { id: s.campaignId }, data: { status: 'ACTIVE', applicationDeadline } });
    const mk = async (name: string) => {
      const u = await prisma.user.create({ data: { email: `c-${randomUUID()}@test.dev`, password: 'x', role: 'CREATOR' } });
      const c = await prisma.creatorProfile.create({ data: { userId: u.id, fullName: name, categories: [] } });
      return { userId: u.id, creatorId: c.id };
    };
    const onTime = await mk('On Time');
    const never = await mk('Never Applied');
    const proposal = await prisma.application.create({
      data: { campaignId: s.campaignId, creatorId: onTime.creatorId, coverLetter: 'c', proposedRate: 1000, timeline: '1w', createdAt: ago(2 * HOUR) },
    });
    for (const c of [onTime, never]) {
      await prisma.campaignInvitation.create({ data: { campaignId: s.campaignId, creatorId: c.creatorId, businessId: s.businessId } });
    }
    return { ...s, onTime, never, proposalId: proposal.id };
  }

  it('24–26. after the application deadline: on-time proposals stay PENDING, never-submitted invitations become DEADLINE_MISSED', async () => {
    const c = await openCampaign(ago(HOUR));
    await sweepApplicationDeadlines(new Date());
    await sweepApplicationDeadlines(new Date()); // idempotent

    expect((await app(c.proposalId)).status).toBe('PENDING');
    const invs = await prisma.campaignInvitation.findMany({ where: { campaignId: c.campaignId } });
    expect(invs.find((i) => i.creatorId === c.onTime.creatorId)?.status).toBe('PENDING'); // applied → untouched
    const missed = invs.find((i) => i.creatorId === c.never.creatorId)!;
    expect(missed.status).toBe('DEADLINE_MISSED');
    expect(missed.closedAt).not.toBeNull();
    // No fake proposal was created for the creator who never applied.
    expect(await prisma.application.count({ where: { creatorId: c.never.creatorId } })).toBe(0);
  });

  it('27. a business closing early expires invitations, not "deadline missed"', async () => {
    const c = await openCampaign(ahead(24 * HOUR));
    await campaignService.cancelCampaign(c.campaignId, c.bizUserId);
    await new Promise((r) => setTimeout(r, 200)); // fire-and-forget expiry
    const inv = await prisma.campaignInvitation.findFirstOrThrow({ where: { campaignId: c.campaignId, creatorId: c.never.creatorId } });
    expect(inv.status).toBe('EXPIRED');
    expect(inv.closedReason).toMatch(/cancelled/i);
  });

  it('28. applying after the deadline is refused until an admin reopens applications', async () => {
    const c = await openCampaign(ago(HOUR));
    await sweepApplicationDeadlines(new Date());
    await expect(campaignService.apply(c.campaignId, c.never.userId, { coverLetter: 'Late but keen', proposedRate: 1000, timeline: '1w', socialHandles: {} } as never))
      .rejects.toThrow(/application deadline/i);

    await expect(reopenApplications(c.campaignId, c.adminId, { applicationDeadline: ahead(HOUR).toISOString(), reason: '' })).rejects.toThrow(/reason/i);
    const r = await reopenApplications(c.campaignId, c.adminId, { applicationDeadline: ahead(2 * HOUR).toISOString(), reason: 'Business asked for more applicants' });
    expect(r.invitationsRestored).toBe(1);
    expect((await prisma.campaign.findUniqueOrThrow({ where: { id: c.campaignId } })).applicationDeadline!.getTime()).toBeGreaterThan(Date.now());
    expect((await prisma.campaignInvitation.findFirstOrThrow({ where: { creatorId: c.never.creatorId } })).status).toBe('PENDING');
  });

  it('29. an accepted proposal stays ACCEPTED when its deliverable deadline is missed', async () => {
    const s = await overdue();
    await prisma.application.update({ where: { id: s.applicationId }, data: { contentGraceDeadline: ago(60_000) } });
    await runEscrowSweep();
    const a = await app(s.applicationId);
    expect(a.status).toBe('ACCEPTED');
    expect(a.workStatus).toBe('CREATOR_FAILED');
  });

  it('30. admin proposal filters, search and timestamps', async () => {
    const c = await openCampaign(ago(HOUR));
    await sweepApplicationDeadlines(new Date());

    const all = await listAdminProposals({ filter: 'all', page: 1, limit: 50 });
    // seed engagement (ACCEPTED) + on-time PENDING proposal + missed invitation
    expect(all.total).toBe(3);
    expect(all.counts).toMatchObject({ pending: 1, accepted: 1, deadline_missed: 1 });

    const pending = await listAdminProposals({ filter: 'pending', page: 1, limit: 50 });
    expect(pending.items).toHaveLength(1);
    expect(pending.items[0]).toMatchObject({ kind: 'PROPOSAL', status: 'PENDING', submittedOnTime: true });
    expect(pending.items[0].submittedAt).not.toBeNull();

    const missed = await listAdminProposals({ filter: 'deadline_missed', page: 1, limit: 50 });
    expect(missed.items).toHaveLength(1);
    expect(missed.items[0]).toMatchObject({ kind: 'INVITATION', status: 'DEADLINE_MISSED', submittedAt: null });
    expect(missed.items[0].creator.name).toBe('Never Applied');

    const search = await listAdminProposals({ filter: 'all', search: 'on time', page: 1, limit: 50 });
    expect(search.items.map((i) => i.creator.name)).toEqual(['On Time']);

    const accepted = await listAdminProposals({ filter: 'accepted', page: 1, limit: 50 });
    expect(accepted.items[0].deliverable).toMatchObject({ applicationId: c.applicationId });
  });
});
