import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { hasDb, resetDb } from './helpers';
import prisma from '../src/prisma';

vi.mock('../src/modules/notifications/notification.service', async (orig) => {
  const actual = await orig<typeof import('../src/modules/notifications/notification.service')>();
  return { ...actual, sendExpoPush: vi.fn().mockResolvedValue(undefined) };
});
vi.mock('../src/utils/email/collaborationReminder', async (orig) => ({
  ...(await orig<typeof import('../src/utils/email/collaborationReminder')>()),
  sendActionEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/utils/cloudinary', async (orig) => ({
  ...(await orig<typeof import('../src/utils/cloudinary')>()),
  uploadImage: vi.fn(async () => 'https://res.cloudinary.com/test/proof.jpg'),
}));
// Khalti is the gateway of record in these tests — fully mocked, no network.
const khalti = vi.hoisted(() => ({
  pidx: 'pidx-1',
  lookup: { status: 'Completed', totalAmountPaisa: 0, transactionId: 'KTX-1' as string | null },
  initiateCalls: 0,
}));
vi.mock('../src/utils/khalti', () => ({
  initiateKhaltiPayment: vi.fn(async () => { khalti.initiateCalls++; return { pidx: khalti.pidx, paymentUrl: 'https://pay.khalti.test/x' }; }),
  lookupKhaltiPayment: vi.fn(async (pidx: string) => ({ pidx, ...khalti.lookup })),
}));

import { CompetitionService } from '../src/modules/competition/competition.service';
import { CompetitionPaymentService } from '../src/modules/competition/competition.payments.service';
import { createCompetitionSchema } from '../src/modules/competition/competition.schema';
import { env } from '../src/config/env';

const d = hasDb ? describe : describe.skip;
const H = 3_600_000;
const svc = new CompetitionService();
const pay = new CompetitionPaymentService();
const PAY_ADMIN = `payadmin-${randomUUID()}@test.dev`;

async function mkUser(role: 'BUSINESS' | 'CREATOR' | 'ADMIN', email?: string) {
  return prisma.user.create({ data: { email: email ?? `${role.toLowerCase()}-${randomUUID()}@test.dev`, password: 'x', role } });
}
async function seed() {
  const biz = await mkUser('BUSINESS');
  // Verified by default — paying winners directly requires it (see the dedicated test below).
  await prisma.businessProfile.create({ data: { userId: biz.id, businessName: 'Kolab', categories: [], isVerified: true } });
  const admin = await mkUser('ADMIN');
  const payAdmin = await mkUser('ADMIN', PAY_ADMIN);
  const creators = await Promise.all([1, 2, 3].map(async (i) => {
    const u = await mkUser('CREATOR');
    const c = await prisma.creatorProfile.create({ data: { userId: u.id, fullName: `Creator ${i}`, categories: [] } });
    return { userId: u.id, creatorId: c.id };
  }));
  return { bizId: biz.id, admin, payAdmin, creators };
}

function input(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return createCompetitionSchema.parse({
    title: 'Prize Payment Challenge',
    description: 'Create a 30–60 second video promoting Kolab.',
    rules: 'One entry per creator. Original work only.',
    registrationOpensAt: new Date(now - H),
    registrationDeadline: new Date(now + 48 * H),
    startsAt: new Date(now - H),
    endsAt: new Date(now + 30 * 24 * H),
    stages: [{ name: 'Final', opensAt: new Date(now - H), deadline: new Date(now + 72 * H), allowedMethods: ['EXTERNAL_LINK'] }],
    prizes: [
      { kind: 'PLACEMENT', title: 'Winner', amount: 10000, recipientCount: 1 },
      { kind: 'PLACEMENT', title: 'Runner-up', amount: 5000, recipientCount: 1 },
      { kind: 'SPECIAL', title: 'Goodie bag', amount: null, recipientCount: 1 },
    ],
    prizePaymentMethod: 'DIRECT',
    cashPrizePool: 15000,
    paymentTermsAccepted: true,
    ...overrides,
  });
}

const notifs = (userId: string, type: string) => prisma.notification.count({ where: { userId, type } });
async function waitFor<T>(fn: () => Promise<T>, ok: (v: T) => boolean, ms = 3000): Promise<T> {
  const until = Date.now() + ms;
  let v = await fn();
  while (!ok(v) && Date.now() < until) { await new Promise((r) => setTimeout(r, 50)); v = await fn(); }
  return v;
}

d('competition prize payments', () => {
  let s: Awaited<ReturnType<typeof seed>>;
  const saved = { ...env };

  beforeEach(async () => {
    await resetDb();
    s = await seed();
    Object.assign(env, { COMPETITION_PAYMENT_ADMIN_EMAILS: PAY_ADMIN, KHALTI_SECRET_KEY: 'test', KHALTI_RETURN_URL: 'http://localhost:3000/api/payments/khalti/callback', COMPETITION_KOLAB_PAYMENTS_ENABLED: true });
    khalti.pidx = `pidx-${randomUUID()}`;
    khalti.lookup = { status: 'Completed', totalAmountPaisa: 1_500_000, transactionId: 'KTX-1' };
    khalti.initiateCalls = 0;
  });
  afterEach(() => { Object.assign(env, saved); });

  /** Launch → everyone joins → close → winners 1 & 2 get the cash prizes, 3 the goodie bag → publish. */
  async function toResults(c: { id: string }) {
    for (const cr of s.creators) await svc.join(cr.userId, c.id);
    await svc.closeCompetition(s.bizId, c.id);
    const full = await svc.getForOrganizer(s.bizId, c.id);
    const parts = await prisma.competitionParticipant.findMany({ where: { competitionId: c.id }, include: { creator: true }, orderBy: { joinedAt: 'asc' } });
    const [win, ru, goodie] = full.prizes;
    const awards = [{ prizeId: win.id, participantId: parts[0].id }, { prizeId: ru.id, participantId: parts[1].id }, { prizeId: goodie.id, participantId: parts[2].id }];
    await svc.saveAwards(s.bizId, c.id, { awards });
    await svc.publishResults(s.bizId, c.id, 3);
    return prisma.competitionPayout.findMany({ where: { competitionId: c.id }, orderBy: { grossPaisa: 'desc' } });
  }

  // ── Configuration ─────────────────────────────────────────────────────────

  it('validates the prize & payment configuration before review', async () => {
    // Over-allocation is rejected even for a draft.
    await expect(svc.create(s.bizId, input({ cashPrizePool: 10000 }))).rejects.toMatchObject({ statusCode: 400 });
    // Under-allocation can be saved but not submitted.
    const c = await svc.create(s.bizId, input({ cashPrizePool: 20000 }));
    await expect(svc.submitForReview(s.bizId, c.id)).rejects.toThrow(/Allocate the whole prize pool/);
    // Changing the method clears the terms acceptance.
    await svc.update(s.bizId, c.id, { cashPrizePool: 15000, prizePaymentMethod: 'KOLAB' });
    await expect(svc.submitForReview(s.bizId, c.id)).rejects.toThrow(/Accept the prize payment terms/);
    await svc.update(s.bizId, c.id, { paymentTermsAccepted: true });
    const submitted = await svc.submitForReview(s.bizId, c.id);
    expect(submitted.payment).toMatchObject({ prizePaymentMethod: 'KOLAB', cashPrizePool: 15000, fundingStatus: 'UNFUNDED', paymentTermsAccepted: true });
    expect(await prisma.auditLog.count({ where: { entityId: c.id, action: 'competition.payment_configured' } })).toBeGreaterThan(0);
  });

  it('direct payment needs a verified business to submit for review; Kolab-managed does not', async () => {
    await prisma.businessProfile.updateMany({ where: { userId: s.bizId }, data: { isVerified: false } });
    const direct = await svc.create(s.bizId, input());
    await expect(svc.submitForReview(s.bizId, direct.id)).rejects.toMatchObject({ statusCode: 403, data: { code: 'BUSINESS_VERIFICATION_REQUIRED' } });
    expect((await prisma.competition.findUniqueOrThrow({ where: { id: direct.id } })).status).toBe('DRAFT');

    const kolab = await svc.create(s.bizId, input({ prizePaymentMethod: 'KOLAB' }));
    expect((await svc.submitForReview(s.bizId, kolab.id)).status).toBe('PENDING_REVIEW');

    await prisma.businessProfile.updateMany({ where: { userId: s.bizId }, data: { isVerified: true } });
    expect((await svc.submitForReview(s.bizId, direct.id)).status).toBe('PENDING_REVIEW');
  });

  it('does not block competitions that were already sent to review before (resubmissions)', async () => {
    await prisma.businessProfile.updateMany({ where: { userId: s.bizId }, data: { isVerified: false } });
    const c = await svc.create(s.bizId, input());
    // An existing competition that went through review and came back with changes requested.
    await prisma.competition.update({ where: { id: c.id }, data: { status: 'CHANGES_REQUESTED', reviewRevision: 1 } });
    expect((await svc.submitForReview(s.bizId, c.id)).status).toBe('PENDING_REVIEW');
  });

  it('keeps Kolab-managed payments disabled unless the deployment enables them', async () => {
    Object.assign(env, { COMPETITION_KOLAB_PAYMENTS_ENABLED: false });
    await expect(svc.create(s.bizId, input({ prizePaymentMethod: 'KOLAB' }))).rejects.toThrow(/isn’t available yet/);
    const ok = await svc.create(s.bizId, input());
    expect(ok.payment.prizePaymentMethod).toBe('DIRECT');
  });

  it('a legacy competition with no payment method creates no payouts', async () => {
    const c = await svc.create(s.bizId, input());
    await svc.submitForReview(s.bizId, c.id);
    await svc.approve(s.admin.id, c.id);
    await prisma.competition.update({ where: { id: c.id }, data: { prizePaymentMethod: null, cashPrizePoolPaisa: null } });
    expect(await toResults(c)).toHaveLength(0);
  });

  // ── Direct business payment ───────────────────────────────────────────────

  it('direct payment: evidence → winner confirms; a report alone is never “paid”', async () => {
    const c = await svc.create(s.bizId, input());
    await svc.submitForReview(s.bizId, c.id);
    const approved = await svc.approve(s.admin.id, c.id);
    expect(approved.status).toBe('ACTIVE'); // no funding needed
    expect(await prisma.competitionFunding.count()).toBe(0);

    const payouts = await toResults(c);
    expect(payouts.map((p) => [p.creatorName, p.status, p.netPaisa])).toEqual([
      ['Creator 1', 'AWAITING_BUSINESS_PAYMENT', 1_000_000],
      ['Creator 2', 'AWAITING_BUSINESS_PAYMENT', 500_000],
    ]); // the non-cash goodie bag gets no payout
    expect(await waitFor(() => notifs(s.creators[0].userId, 'competition_prize_won'), (n) => n === 1)).toBe(1);
    expect(await waitFor(() => notifs(s.bizId, 'competition_prizes_outstanding'), (n) => n === 1)).toBe(1);

    const [p1] = payouts;
    const report = { paidOn: new Date(), method: 'ESEWA' as const, amount: 10000 };
    await expect(pay.reportDirectPayment(s.bizId, c.id, p1.id, { ...report })).rejects.toThrow(/reference or upload proof/);
    await expect(pay.reportDirectPayment(s.bizId, c.id, p1.id, { ...report, amount: 10001, reference: 'E1' })).rejects.toThrow(/more than the prize/);
    const reported = await pay.reportDirectPayment(s.bizId, c.id, p1.id, { ...report, reference: 'ESW-123' }, Buffer.from('img'));
    expect(reported.status).toBe('AWAITING_CONFIRMATION');
    expect(reported.reported?.evidenceUrl).toContain('cloudinary');

    // Only the winner can confirm their own prize.
    await expect(pay.confirmReceipt(s.creators[1].userId, c.id, p1.id)).rejects.toMatchObject({ statusCode: 404 });
    const disputed = await pay.dispute(s.creators[0].userId, c.id, p1.id, 'Nothing arrived in my eSewa yet');
    expect(disputed.status).toBe('DISPUTED');
    expect(await waitFor(() => notifs(s.admin.id, 'competition_prize_payment_disputed'), (n) => n === 1)).toBe(1);

    // Results with a payment in motion can't be reopened.
    await expect(svc.reopenResults(s.bizId, c.id, 'Change the winner please')).rejects.toMatchObject({ statusCode: 409 });

    await pay.reportDirectPayment(s.bizId, c.id, p1.id, { ...report, reference: 'ESW-124' });
    const confirmed = await pay.confirmReceipt(s.creators[0].userId, c.id, p1.id);
    expect(confirmed.status).toBe('PAID');
    await expect(pay.confirmReceipt(s.creators[0].userId, c.id, p1.id)).rejects.toMatchObject({ statusCode: 409 });

    const summary = await pay.organizerSummary(s.bizId, c.id);
    expect(summary.totals.direct).toEqual({ owedByBusiness: 5000, reportedPaidByBusiness: 10000, confirmedReceived: 10000 });
    expect(summary.totals.kolab.fundsReceived).toBe(0);
    expect(await prisma.competitionPayoutEvent.count({ where: { payoutId: p1.id } })).toBe(5); // created, reported, disputed, re-reported, confirmed
  });

  it('admin verification of a direct payment needs a payment admin and evidence', async () => {
    const c = await svc.create(s.bizId, input());
    await svc.submitForReview(s.bizId, c.id);
    await svc.approve(s.admin.id, c.id);
    const [, p2] = await toResults(c);
    await expect(pay.adminPayoutAction(s.payAdmin.id, PAY_ADMIN, c.id, p2.id, { action: 'admin_verify', note: 'Checked bank statement' })).rejects.toMatchObject({ statusCode: 409 });
    await pay.reportDirectPayment(s.bizId, c.id, p2.id, { amount: 5000, paidOn: new Date(), method: 'BANK_TRANSFER', reference: 'NIC-1' });
    await expect(pay.adminPayoutAction(s.admin.id, s.admin.email, c.id, p2.id, { action: 'admin_verify', note: 'Checked bank statement' })).rejects.toMatchObject({ statusCode: 403 });
    const view = await pay.adminPayoutAction(s.payAdmin.id, PAY_ADMIN, c.id, p2.id, { action: 'admin_verify', note: 'Checked bank statement' });
    expect(view.payouts.find((p) => p.id === p2.id)?.status).toBe('PAID');
  });

  // ── Kolab-managed funding + payouts ───────────────────────────────────────

  async function kolabApproved() {
    const c = await svc.create(s.bizId, input({ prizePaymentMethod: 'KOLAB' }));
    await svc.submitForReview(s.bizId, c.id);
    return { c, approved: await svc.approve(s.admin.id, c.id) };
  }

  it('Kolab-managed: approval alone never makes it live; verified funding does, exactly once', async () => {
    const { c, approved } = await kolabApproved();
    expect(approved.status).toBe('SCHEDULED');
    expect(await waitFor(() => notifs(s.bizId, 'competition_funding_required'), (n) => n === 1)).toBe(1);
    await svc.runLifecycleSweep(new Date(Date.now() + H), c.id);
    expect((await prisma.competition.findUniqueOrThrow({ where: { id: c.id } })).status).toBe('SCHEDULED');
    expect((await svc.discover({ tab: 'all', page: 1, limit: 10 })).items).toHaveLength(0);

    const started = await pay.initiateFunding(s.bizId, c.id, 'khalti', 'mobile');
    expect(started.paymentUrl).toContain('khalti');
    const f = await prisma.competitionFunding.findFirstOrThrow({ where: { competitionId: c.id } });
    expect(f).toMatchObject({ amountPaisa: 1_500_000, status: 'PENDING', providerRef: khalti.pidx });

    // Forged / mismatched redirects never confirm anything.
    await expect(pay.confirmKhalti(f.id, 'other-pidx')).rejects.toMatchObject({ statusCode: 400 });

    // Duplicate callbacks (and a concurrent pair) record one success.
    await Promise.all([pay.confirmKhalti(f.id, khalti.pidx), pay.confirmKhalti(f.id, khalti.pidx)]);
    await pay.confirmKhalti(f.id, khalti.pidx);
    const comp = await prisma.competition.findUniqueOrThrow({ where: { id: c.id } });
    expect(comp).toMatchObject({ fundingStatus: 'FUNDED', fundedAmountPaisa: 1_500_000, status: 'ACTIVE' });
    expect(await prisma.auditLog.count({ where: { entityId: c.id, action: 'competition.funding_confirmed' } })).toBe(1);
    expect(await waitFor(() => notifs(s.bizId, 'competition_funding_confirmed'), (n) => n >= 1)).toBe(1);

    // Method and pool are now locked.
    await expect(svc.update(s.bizId, c.id, { prizePaymentMethod: 'DIRECT' })).rejects.toMatchObject({ statusCode: 409 });
    // A second funding attempt is refused.
    await expect(pay.initiateFunding(s.bizId, c.id, 'khalti', 'mobile')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('Kolab-managed: a wrong amount from the gateway never funds the pool', async () => {
    const { c } = await kolabApproved();
    await pay.initiateFunding(s.bizId, c.id, 'khalti', 'web');
    const f = await prisma.competitionFunding.findFirstOrThrow({ where: { competitionId: c.id } });
    khalti.lookup = { status: 'Completed', totalAmountPaisa: 100, transactionId: 'KTX-2' };
    const r = await pay.confirmKhalti(f.id, khalti.pidx);
    expect(r.outcome).toBe('FAILED');
    expect(await prisma.competition.findUniqueOrThrow({ where: { id: c.id } })).toMatchObject({ fundingStatus: 'FAILED', fundedAmountPaisa: 0, status: 'SCHEDULED' });
  });

  it('Kolab-managed payouts: payment admin approves, processes and records each one; never twice', async () => {
    const { c } = await kolabApproved();
    await pay.initiateFunding(s.bizId, c.id, 'khalti', 'mobile');
    const f = await prisma.competitionFunding.findFirstOrThrow({ where: { competitionId: c.id } });
    await pay.confirmKhalti(f.id, khalti.pidx);
    const payouts = await toResults(c);
    expect(payouts.map((p) => [p.method, p.status])).toEqual([['KOLAB', 'NOT_READY'], ['KOLAB', 'NOT_READY']]);
    const [p1] = payouts;

    // Ordinary admins and the business can't move money.
    await expect(pay.adminPayoutAction(s.admin.id, s.admin.email, c.id, p1.id, { action: 'approve' })).rejects.toMatchObject({ statusCode: 403 });
    await expect(pay.reportDirectPayment(s.bizId, c.id, p1.id, { amount: 10000, paidOn: new Date(), method: 'ESEWA', reference: 'X' })).rejects.toMatchObject({ statusCode: 409 });

    await pay.adminPayoutAction(s.payAdmin.id, PAY_ADMIN, c.id, p1.id, { action: 'approve' });
    // Can't send money without the winner's payout account.
    await expect(pay.adminPayoutAction(s.payAdmin.id, PAY_ADMIN, c.id, p1.id, { action: 'start_processing' })).rejects.toThrow(/payout account/);
    await prisma.payoutMethod.create({ data: { creatorId: s.creators[0].creatorId, type: 'ESEWA', accountName: 'Creator 1', walletId: '9800000000', isDefault: true } });
    await pay.adminPayoutAction(s.payAdmin.id, PAY_ADMIN, c.id, p1.id, { action: 'start_processing' });
    await expect(pay.adminPayoutAction(s.payAdmin.id, PAY_ADMIN, c.id, p1.id, { action: 'mark_paid' })).rejects.toThrow(/reference/);
    const results = await Promise.allSettled([
      pay.adminPayoutAction(s.payAdmin.id, PAY_ADMIN, c.id, p1.id, { action: 'mark_paid', reference: 'ESW-OUT-1' }),
      pay.adminPayoutAction(s.payAdmin.id, PAY_ADMIN, c.id, p1.id, { action: 'mark_paid', reference: 'ESW-OUT-1' }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.competitionPayout.count({ where: { competitionId: c.id, status: 'PAID' } })).toBe(1);
    expect(await waitFor(() => notifs(s.creators[0].userId, 'competition_payout_update'), (n) => n === 3)).toBe(3);

    const view = await pay.adminDetail(c.id, PAY_ADMIN);
    expect(view.totals.kolab).toMatchObject({ fundsReceived: 15000, paidOut: 10000, payableToWinners: 5000 });
    expect(view.totals.direct.owedByBusiness).toBe(0);
    // Creator sees their own payout; the destination is masked for them.
    const progress = await svc.myProgress(s.creators[0].userId, c.id);
    expect(progress.prizePayments[0]).toMatchObject({ status: 'PAID', providerRef: 'ESW-OUT-1' });
    expect(JSON.stringify(progress.prizePayments)).not.toContain('9800000000');
  });

  it('cancelling a funded competition owes a refund, recorded as a new ledger row', async () => {
    const { c } = await kolabApproved();
    await pay.initiateFunding(s.bizId, c.id, 'khalti', 'mobile');
    const f = await prisma.competitionFunding.findFirstOrThrow({ where: { competitionId: c.id } });
    await pay.confirmKhalti(f.id, khalti.pidx);
    await svc.cancel(s.bizId, c.id, 'Sponsor pulled out');
    expect((await prisma.competition.findUniqueOrThrow({ where: { id: c.id } })).fundingStatus).toBe('REFUND_PENDING');
    await expect(pay.adminRecordRefund(s.payAdmin.id, PAY_ADMIN, c.id, { amount: 20000, reference: 'RF-1' })).rejects.toMatchObject({ statusCode: 400 });
    await pay.adminRecordRefund(s.payAdmin.id, PAY_ADMIN, c.id, { amount: 15000, reference: 'RF-1' });
    expect(await prisma.competition.findUniqueOrThrow({ where: { id: c.id } })).toMatchObject({ fundingStatus: 'REFUNDED', fundedAmountPaisa: 0 });
    expect(await prisma.competitionFunding.count({ where: { competitionId: c.id } })).toBe(2); // charge kept + refund
  });
});
