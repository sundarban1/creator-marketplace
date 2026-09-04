import { describe, it, expect, vi, beforeEach } from 'vitest';

const settings = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('../../utils/settingsCache', () => ({
  getCachedSettings: async () => settings.value,
}));

import { getEscrowTimings, deadlineFromNow } from './escrow-config';

beforeEach(() => { settings.value = {}; });

describe('getEscrowTimings', () => {
  it('falls back to the spec defaults when no settings are stored', async () => {
    const t = await getEscrowTimings();
    expect(t).toEqual({
      paymentWindowHours: 24,
      creatorConfirmWindowHours: 24,
      minContentWindowHours: 24,
      contentGraceHours: 6,
      businessReviewHours: 24,
      businessReviewReminderHours: 12,
      settlementHours: 24,
      maxIncludedRevisions: 2,
      settlementHoldEnabled: false,
      autoApproveOnReviewTimeout: false,
    });
  });

  it('reads admin overrides', async () => {
    settings.value = {
      'escrow.paymentWindowHours': 48,
      'escrow.settlementHoldEnabled': true,
      'escrow.autoApproveOnReviewTimeout': true,
      'escrow.maxIncludedRevisions': 3,
    };
    const t = await getEscrowTimings();
    expect(t.paymentWindowHours).toBe(48);
    expect(t.settlementHoldEnabled).toBe(true);
    expect(t.autoApproveOnReviewTimeout).toBe(true);
    expect(t.maxIncludedRevisions).toBe(3);
  });

  it('ignores malformed values and negative numbers', async () => {
    settings.value = {
      'escrow.paymentWindowHours': 'nonsense',
      'escrow.contentGraceHours': -5,
      'escrow.settlementHoldEnabled': 'true', // not a real boolean
    };
    const t = await getEscrowTimings();
    expect(t.paymentWindowHours).toBe(24);
    expect(t.contentGraceHours).toBe(6);
    expect(t.settlementHoldEnabled).toBe(false);
  });

  it('floors maxIncludedRevisions to an integer', async () => {
    settings.value = { 'escrow.maxIncludedRevisions': 2.9 };
    expect((await getEscrowTimings()).maxIncludedRevisions).toBe(2);
  });
});

describe('deadlineFromNow', () => {
  it('adds the given hours as an absolute timestamp', () => {
    const from = new Date('2026-09-04T10:00:00.000Z');
    expect(deadlineFromNow(24, from).toISOString()).toBe('2026-09-05T10:00:00.000Z');
    expect(deadlineFromNow(6, from).toISOString()).toBe('2026-09-04T16:00:00.000Z');
  });
});
