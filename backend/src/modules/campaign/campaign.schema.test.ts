import { describe, it, expect } from 'vitest';
import {
  createCampaignSchema,
  canReduceCreatorsNeeded,
  computeTotalBudget,
  deriveBudgetRateType,
  MIN_BUDGET_PER_CREATOR,
} from './campaign.schema';

function body(over: Record<string, unknown> = {}) {
  return {
    title: 'Cover our launch event',
    category: 'Food & Drink',
    deadline: '2026-10-01T00:00:00.000Z',
    ...over,
  };
}

describe('computeTotalBudget', () => {
  it('is creatorsNeeded * budgetMax', () => {
    expect(computeTotalBudget(2, 8000)).toBe(16000);
    expect(computeTotalBudget(1, 8000)).toBe(8000);
  });
  it('treats missing / zero inputs as zero, never negative', () => {
    expect(computeTotalBudget(0, 0)).toBe(0);
    expect(computeTotalBudget(3, 0)).toBe(0);
  });
  it('rounds to a whole rupee', () => {
    expect(computeTotalBudget(3, 8333.33)).toBe(25000);
  });
});

describe('deriveBudgetRateType', () => {
  it('FIXED when min === max, RANGE otherwise', () => {
    expect(deriveBudgetRateType(8000, 8000)).toBe('FIXED');
    expect(deriveBudgetRateType(6000, 10000)).toBe('RANGE');
  });
});

describe('canReduceCreatorsNeeded', () => {
  it('always allows raising or keeping the count', () => {
    expect(canReduceCreatorsNeeded(3, 2, 2)).toBe(true);
    expect(canReduceCreatorsNeeded(2, 2, 2)).toBe(true);
  });
  it('allows a decrease that stays at or above the accepted count', () => {
    expect(canReduceCreatorsNeeded(2, 3, 2)).toBe(true);
    expect(canReduceCreatorsNeeded(1, 3, 0)).toBe(true);
  });
  it('blocks a decrease below the accepted count', () => {
    expect(canReduceCreatorsNeeded(1, 2, 2)).toBe(false);
    expect(canReduceCreatorsNeeded(0, 5, 3)).toBe(false);
  });
});

describe('createCampaignSchema — publish budget gate', () => {
  it('rejects an ACTIVE paid campaign with no per-creator payment', () => {
    const res = createCampaignSchema.safeParse(body());
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.includes('budgetMax'))).toBe(true);
    }
  });

  it('accepts an ACTIVE paid campaign with a per-creator fee', () => {
    const res = createCampaignSchema.safeParse(body({
      budgetMin: 8000, budgetMax: 8000, creatorsNeeded: 2,
    }));
    expect(res.success).toBe(true);
  });

  it('allows a DRAFT paid campaign without payment set', () => {
    expect(createCampaignSchema.safeParse(body({ status: 'DRAFT' })).success).toBe(true);
  });

  it('does not gate a free OPEN_EVENT', () => {
    expect(createCampaignSchema.safeParse(body({ campaignType: 'OPEN_EVENT' })).success).toBe(true);
  });

  it('exempts a product-exchange campaign (no cash)', () => {
    expect(createCampaignSchema.safeParse(body({ paymentType: 'Product Exchange' })).success).toBe(true);
  });

  it('still enforces budgetMax >= budgetMin', () => {
    const res = createCampaignSchema.safeParse(body({ budgetMin: 9000, budgetMax: 8000 }));
    expect(res.success).toBe(false);
  });

  it('carries budgetRateType / budgetInputType through when provided', () => {
    const res = createCampaignSchema.safeParse(body({
      budgetMin: 6000, budgetMax: 10000, budgetRateType: 'RANGE', budgetInputType: 'TOTAL',
    }));
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.budgetRateType).toBe('RANGE');
      expect(res.data.budgetInputType).toBe('TOTAL');
    }
  });

  it('MIN_BUDGET_PER_CREATOR is the documented floor', () => {
    expect(createCampaignSchema.safeParse(body({
      budgetMin: MIN_BUDGET_PER_CREATOR - 1, budgetMax: MIN_BUDGET_PER_CREATOR - 1,
    })).success).toBe(false);
    expect(createCampaignSchema.safeParse(body({
      budgetMin: MIN_BUDGET_PER_CREATOR, budgetMax: MIN_BUDGET_PER_CREATOR,
    })).success).toBe(true);
  });
});
