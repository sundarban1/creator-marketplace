import { describe, it, expect } from 'vitest';
import {
  deriveEngagementState,
  assertWorkTransition,
  assertEscrowTransition,
  canPerform,
  assertCanPerform,
  type EngagementSnapshot,
} from './application-state-machine';

const base: EngagementSnapshot = {
  applicationStatus: 'ACCEPTED',
  workStatus: 'NONE',
  escrowStatus: 'NOT_FUNDED',
  campaignType: 'PAID_CAMPAIGN',
};

describe('deriveEngagementState', () => {
  it('maps the happy-path paid lifecycle', () => {
    expect(deriveEngagementState({ ...base, applicationStatus: 'PENDING' })).toBe('PROPOSAL_PENDING');
    expect(deriveEngagementState({ ...base, applicationStatus: 'SHORTLISTED' })).toBe('PROPOSAL_PENDING');
    expect(deriveEngagementState({ ...base, escrowStatus: 'NOT_FUNDED' })).toBe('CREATOR_SELECTED');
    expect(deriveEngagementState({ ...base, escrowStatus: 'PAYMENT_PENDING' })).toBe('CREATOR_SELECTED');
    expect(deriveEngagementState({ ...base, escrowStatus: 'HELD' })).toBe('ESCROW_FUNDED');
    expect(deriveEngagementState({ ...base, workStatus: 'IN_PROGRESS', escrowStatus: 'HELD' })).toBe('IN_PROGRESS');
    expect(deriveEngagementState({ ...base, workStatus: 'IN_PROGRESS', escrowStatus: 'HELD', revisionRequestedAt: new Date() })).toBe('REVISION_REQUESTED');
    expect(deriveEngagementState({ ...base, workStatus: 'SUBMITTED', escrowStatus: 'HELD' })).toBe('BUSINESS_REVIEW');
    expect(deriveEngagementState({ ...base, workStatus: 'APPROVED', escrowStatus: 'RELEASE_PENDING' })).toBe('PAYMENT_RELEASE_PENDING');
    expect(deriveEngagementState({ ...base, workStatus: 'COMPLETED', escrowStatus: 'RELEASED' })).toBe('COMPLETED');
  });

  it('lets money / terminal states win over in-flight ones', () => {
    expect(deriveEngagementState({ ...base, workStatus: 'DISPUTED', escrowStatus: 'FROZEN' })).toBe('DISPUTED');
    expect(deriveEngagementState({ ...base, workStatus: 'SUBMITTED', escrowStatus: 'FROZEN' })).toBe('DISPUTED');
    expect(deriveEngagementState({ ...base, workStatus: 'IN_PROGRESS', escrowStatus: 'REFUNDED' })).toBe('REFUNDED');
    expect(deriveEngagementState({ ...base, workStatus: 'SUBMITTED', escrowStatus: 'PARTIALLY_REFUNDED' })).toBe('PARTIALLY_REFUNDED');
    expect(deriveEngagementState({ ...base, escrowStatus: 'RELEASED', workStatus: 'IN_PROGRESS' })).toBe('PAYMENT_RELEASED');
    expect(deriveEngagementState({ ...base, campaignStatus: 'CANCELLED' })).toBe('CANCELLED');
  });

  it('handles rejected / expired / withdrawn proposals', () => {
    expect(deriveEngagementState({ ...base, applicationStatus: 'REJECTED' })).toBe('PROPOSAL_REJECTED');
    expect(deriveEngagementState({ ...base, applicationStatus: 'EXPIRED' })).toBe('PROPOSAL_EXPIRED');
    expect(deriveEngagementState({ ...base, applicationStatus: 'WITHDRAWN' })).toBe('PROPOSAL_WITHDRAWN');
  });

  it('treats an accepted free event as immediately COMPLETED', () => {
    expect(deriveEngagementState({ ...base, campaignType: 'OPEN_EVENT', workStatus: 'COMPLETED', escrowStatus: 'NOT_FUNDED' })).toBe('COMPLETED');
  });

  it('surfaces the overdue / failed work states', () => {
    expect(deriveEngagementState({ ...base, workStatus: 'CONTENT_OVERDUE', escrowStatus: 'HELD' })).toBe('CONTENT_OVERDUE');
    expect(deriveEngagementState({ ...base, workStatus: 'CREATOR_FAILED', escrowStatus: 'HELD' })).toBe('CREATOR_FAILED');
  });
});

describe('assertWorkTransition', () => {
  it('allows the legal edges', () => {
    expect(() => assertWorkTransition('NONE', 'IN_PROGRESS')).not.toThrow();
    expect(() => assertWorkTransition('IN_PROGRESS', 'SUBMITTED')).not.toThrow();
    expect(() => assertWorkTransition('CONTENT_OVERDUE', 'SUBMITTED')).not.toThrow();
    expect(() => assertWorkTransition('SUBMITTED', 'APPROVED')).not.toThrow();
    expect(() => assertWorkTransition('SUBMITTED', 'IN_PROGRESS')).not.toThrow(); // revision
    expect(() => assertWorkTransition('SUBMITTED', 'DISPUTED')).not.toThrow();
    expect(() => assertWorkTransition('APPROVED', 'COMPLETED')).not.toThrow();
    expect(() => assertWorkTransition('SUBMITTED', 'SUBMITTED')).not.toThrow(); // idempotent
  });

  it('rejects illegal edges with a 409', () => {
    const bad = [
      ['NONE', 'SUBMITTED'],
      ['COMPLETED', 'IN_PROGRESS'],
      ['IN_PROGRESS', 'APPROVED'],
      ['CREATOR_FAILED', 'SUBMITTED'],
      ['CANCELLED', 'IN_PROGRESS'],
    ] as const;
    for (const [from, to] of bad) {
      try {
        assertWorkTransition(from, to);
        throw new Error(`expected ${from}->${to} to throw`);
      } catch (e) {
        expect((e as { statusCode?: number }).statusCode).toBe(409);
      }
    }
  });
});

describe('assertEscrowTransition', () => {
  it('allows the legal edges', () => {
    expect(() => assertEscrowTransition('NOT_FUNDED', 'HELD')).not.toThrow();
    expect(() => assertEscrowTransition('HELD', 'RELEASE_PENDING')).not.toThrow();
    expect(() => assertEscrowTransition('HELD', 'RELEASED')).not.toThrow();
    expect(() => assertEscrowTransition('HELD', 'FROZEN')).not.toThrow();
    expect(() => assertEscrowTransition('RELEASE_PENDING', 'RELEASED')).not.toThrow();
    expect(() => assertEscrowTransition('RELEASE_PENDING', 'FROZEN')).not.toThrow();
    expect(() => assertEscrowTransition('FROZEN', 'HELD')).not.toThrow();
    expect(() => assertEscrowTransition('FROZEN', 'PARTIALLY_REFUNDED')).not.toThrow();
  });

  it('rejects moving out of a terminal money state', () => {
    for (const from of ['RELEASED', 'REFUNDED', 'PARTIALLY_REFUNDED'] as const) {
      try {
        assertEscrowTransition(from, 'HELD');
        throw new Error(`expected ${from}->HELD to throw`);
      } catch (e) {
        expect((e as { statusCode?: number }).statusCode).toBe(409);
      }
    }
  });
});

describe('permission matrix (§35)', () => {
  it('encodes the spec table', () => {
    expect(canPerform('payCampaign', 'BUSINESS')).toBe(true);
    expect(canPerform('payCampaign', 'CREATOR')).toBe(false);
    expect(canPerform('payCampaign', 'ADMIN')).toBe(false);
    expect(canPerform('submitContent', 'CREATOR')).toBe(true);
    expect(canPerform('submitContent', 'BUSINESS')).toBe(false);
    expect(canPerform('approveContent', 'BUSINESS')).toBe(true);
    expect(canPerform('resolveDispute', 'ADMIN')).toBe(true);
    expect(canPerform('resolveDispute', 'BUSINESS')).toBe(false);
    expect(canPerform('raiseDispute', 'CREATOR')).toBe(true);
    expect(canPerform('raiseDispute', 'BUSINESS')).toBe(true);
    expect(canPerform('markOverdue', 'SYSTEM')).toBe(true);
    expect(canPerform('markOverdue', 'ADMIN')).toBe(false);
    expect(canPerform('releasePayment', 'SYSTEM')).toBe(true);
    expect(canPerform('releasePayment', 'ADMIN')).toBe(true);
    expect(canPerform('releasePayment', 'BUSINESS')).toBe(false);
  });

  it('assertCanPerform throws 403 for a disallowed actor', () => {
    try {
      assertCanPerform('resolveDispute', 'BUSINESS');
      throw new Error('expected throw');
    } catch (e) {
      expect((e as { statusCode?: number }).statusCode).toBe(403);
    }
  });
});
