import { describe, it, expect } from 'vitest';
import * as R from './competition.payments.rules';

const prizes = [
  { title: 'Winner', amount: 10000, recipientCount: 1 },
  { title: 'Runner-up', amount: 5000, recipientCount: 1 },
  { title: 'Consolation', amount: 1000, recipientCount: 5 },
  { title: 'Goodie bag', amount: null, recipientCount: 10 },
];
const accepted = (m: R.PrizePaymentMethod) => ({ paymentTermsMethod: m, paymentTermsAcceptedAt: new Date() });

describe('competition prize payment rules', () => {
  it('converts NPR to integer paisa exactly and rejects >2 decimals', () => {
    expect(R.toPaisa(10000)).toBe(1_000_000);
    expect(R.toPaisa(0.1 + 0.2)).toBe(30);
    expect(R.toPaisa(12.5)).toBe(1250);
    expect(R.toPaisa(12.345)).toBeNull();
    expect(R.toPaisa(-1)).toBeNull();
    expect(R.toPaisa(null)).toBeNull();
  });

  it('sums cash allocations over ranks and multiple winners, ignoring non-cash prizes', () => {
    expect(R.cashAllocationPaisa(prizes)).toBe(2_000_000);
  });

  it('rejects over-allocation even on a draft save', () => {
    const p = R.validatePaymentConfig(prizes, { prizePaymentMethod: 'DIRECT', cashPrizePoolPaisa: 1_500_000, paymentTermsMethod: null, paymentTermsAcceptedAt: null }, { strict: false, kolabEnabled: true });
    expect(p.map((x) => x.field)).toContain('cashPrizePool');
  });

  it('requires method, full allocation and accepted terms to submit', () => {
    const none = R.validatePaymentConfig(prizes, { prizePaymentMethod: null, cashPrizePoolPaisa: null, paymentTermsMethod: null, paymentTermsAcceptedAt: null }, { strict: true, kolabEnabled: true });
    expect(none.map((x) => x.field)).toEqual(expect.arrayContaining(['prizePaymentMethod', 'cashPrizePool']));

    const under = R.validatePaymentConfig(prizes, { prizePaymentMethod: 'DIRECT', cashPrizePoolPaisa: 2_500_000, ...accepted('DIRECT') }, { strict: true, kolabEnabled: true });
    expect(under.some((x) => x.message.startsWith('Allocate the whole prize pool'))).toBe(true);

    const ok = R.validatePaymentConfig(prizes, { prizePaymentMethod: 'DIRECT', cashPrizePoolPaisa: 2_000_000, ...accepted('DIRECT') }, { strict: true, kolabEnabled: true });
    expect(ok).toEqual([]);
  });

  it('terms accepted for the other method do not count', () => {
    const p = R.validatePaymentConfig(prizes, { prizePaymentMethod: 'KOLAB', cashPrizePoolPaisa: 2_000_000, ...accepted('DIRECT') }, { strict: true, kolabEnabled: true });
    expect(p.map((x) => x.field)).toContain('paymentTermsAccepted');
  });

  it('blocks Kolab-managed payments while the feature is disabled', () => {
    const p = R.validatePaymentConfig(prizes, { prizePaymentMethod: 'KOLAB', cashPrizePoolPaisa: 2_000_000, ...accepted('KOLAB') }, { strict: false, kolabEnabled: false });
    expect(p.map((x) => x.field)).toContain('prizePaymentMethod');
  });

  it('non-cash-only competitions need no payment method', () => {
    expect(R.validatePaymentConfig([{ title: 'Trophy', amount: null, recipientCount: 1 }], { prizePaymentMethod: null, cashPrizePoolPaisa: null, paymentTermsMethod: null, paymentTermsAcceptedAt: null }, { strict: true, kolabEnabled: true })).toEqual([]);
  });

  it('only fully funded or unfunded-by-design competitions can launch', () => {
    expect(R.baselineFundingStatus('KOLAB', 100)).toBe('UNFUNDED');
    expect(R.baselineFundingStatus('DIRECT', 100)).toBe('NOT_REQUIRED');
    expect(R.baselineFundingStatus('KOLAB', 0)).toBe('NOT_REQUIRED');
    expect(R.fundingAllowsLaunch('FUNDED')).toBe(true);
    expect(R.fundingAllowsLaunch('NOT_REQUIRED')).toBe(true);
    for (const s of ['UNFUNDED', 'PENDING', 'PARTIALLY_FUNDED', 'FAILED', 'REFUND_PENDING']) expect(R.fundingAllowsLaunch(s)).toBe(false);
  });

  describe('payout transitions', () => {
    it('Kolab payouts: approve → processing → paid, only by an admin', () => {
      expect(R.payoutTransition('approve', 'KOLAB', 'NOT_READY', 'ADMIN')).toBe('APPROVED');
      expect(R.payoutTransition('approve', 'KOLAB', 'NOT_READY', 'BUSINESS')).toBeNull();
      expect(R.payoutTransition('start_processing', 'KOLAB', 'APPROVED', 'ADMIN')).toBe('PROCESSING');
      expect(R.payoutTransition('mark_paid', 'KOLAB', 'APPROVED', 'ADMIN')).toBeNull();
      expect(R.payoutTransition('mark_paid', 'KOLAB', 'PROCESSING', 'ADMIN')).toBe('PAID');
      expect(R.payoutTransition('mark_paid', 'KOLAB', 'PAID', 'ADMIN')).toBeNull();
      expect(R.payoutTransition('retry', 'KOLAB', 'FAILED', 'ADMIN')).toBe('APPROVED');
      expect(R.payoutTransition('retry', 'KOLAB', 'PAID', 'ADMIN')).toBeNull();
    });

    it('direct payments: business report never means paid; winner or admin confirms', () => {
      expect(R.payoutTransition('report_payment', 'DIRECT', 'AWAITING_BUSINESS_PAYMENT', 'BUSINESS')).toBe('AWAITING_CONFIRMATION');
      expect(R.payoutTransition('report_payment', 'DIRECT', 'PAID', 'BUSINESS')).toBeNull();
      expect(R.payoutTransition('confirm_receipt', 'DIRECT', 'AWAITING_CONFIRMATION', 'CREATOR')).toBe('PAID');
      expect(R.payoutTransition('confirm_receipt', 'DIRECT', 'AWAITING_BUSINESS_PAYMENT', 'CREATOR')).toBeNull();
      expect(R.payoutTransition('confirm_receipt', 'DIRECT', 'AWAITING_CONFIRMATION', 'BUSINESS')).toBeNull();
      expect(R.payoutTransition('dispute', 'DIRECT', 'AWAITING_CONFIRMATION', 'CREATOR')).toBe('DISPUTED');
      expect(R.payoutTransition('admin_verify', 'DIRECT', 'DISPUTED', 'ADMIN')).toBe('PAID');
      expect(R.payoutTransition('resolve_unpaid', 'DIRECT', 'DISPUTED', 'ADMIN')).toBe('AWAITING_BUSINESS_PAYMENT');
      // Kolab-only actions don't apply to direct payments.
      expect(R.payoutTransition('approve', 'DIRECT', 'AWAITING_BUSINESS_PAYMENT', 'ADMIN')).toBeNull();
    });

    it('initial statuses and the untouched set used by reopen', () => {
      expect(R.initialPayoutStatus('KOLAB')).toBe('NOT_READY');
      expect(R.initialPayoutStatus('DIRECT')).toBe('AWAITING_BUSINESS_PAYMENT');
      expect(R.PAYOUT_UNTOUCHED).not.toContain('AWAITING_CONFIRMATION');
      expect(R.PAYOUT_UNTOUCHED).not.toContain('PROCESSING');
    });
  });

  it('maps gateway statuses conservatively', () => {
    expect(R.khaltiOutcome('Completed')).toBe('SUCCEEDED');
    expect(R.khaltiOutcome('Pending')).toBe('PENDING');
    expect(R.khaltiOutcome('User canceled')).toBe('CANCELLED');
    expect(R.khaltiOutcome('Refunded')).toBe('FAILED');
    expect(R.esewaOutcome('COMPLETE')).toBe('SUCCEEDED');
    expect(R.esewaOutcome('AMBIGUOUS')).toBe('PENDING');
    expect(R.esewaOutcome('FULL_REFUND')).toBe('FAILED');
  });
});
