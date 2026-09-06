import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiCampaignDraftSchema, type AiCampaignDraft } from './campaign-ai.schema';
import { CampaignAiService, normalizeCampaignBudget } from './campaign-ai.service';

vi.mock('../../utils/imageSearch', () => ({
  searchStockPhoto: vi.fn().mockResolvedValue(null),
}));

// A schema-valid model classification with everything but the budget fixed.
function draft(over: Partial<AiCampaignDraft> = {}): AiCampaignDraft {
  return aiCampaignDraftSchema.parse({
    title: 'Cover our launch night',
    description: 'Two creators shoot stories and one recap reel each at the launch.',
    category: 'Food & Drink',
    platform: 'Instagram',
    goal: 'Brand Awareness',
    suggestedDurationDays: 7,
    creatorsNeeded: 2,
    deliverables: { REEL: 1, STORY: 2, PHOTO_POST: 0, VISIT_STORE: 0, PRODUCT_REVIEW_VIDEO: 0, EVENT_COVERAGE_VIDEO: 0, MENTION_IN_CAPTION: 0, TAG_BUSINESS: 0, GOOGLE_REVIEW: 0 },
    hashtags: ['launch'],
    sampleCaption: 'Had the best time at the launch!',
    ...over,
  });
}

describe('normalizeCampaignBudget — the 4 spec cases', () => {
  it('§1 STATED_PER_CREATOR fixed: budgetMin == budgetMax == the amount', () => {
    const d = normalizeCampaignBudget(draft({ budgetStatus: 'STATED_PER_CREATOR', statedAmount: 8000, creatorsNeeded: 2 }));
    expect([d.budgetMin, d.budgetMax, d.budgetRateType]).toEqual([8000, 8000, 'FIXED']);
    expect(d.statedAmount).toBe(8000);
  });

  it('§1 STATED_PER_CREATOR range: keeps both bounds and RANGE', () => {
    const d = normalizeCampaignBudget(draft({ budgetStatus: 'STATED_PER_CREATOR', budgetRateType: 'RANGE', statedAmount: 8000, statedAmountMax: 10000 }));
    expect([d.budgetMin, d.budgetMax, d.budgetRateType]).toEqual([8000, 10000, 'RANGE']);
  });

  it('§2 NOT_STATED: budget stays 0/0, statedAmount null', () => {
    const d = normalizeCampaignBudget(draft({ budgetStatus: 'NOT_STATED' }));
    expect([d.budgetMin, d.budgetMax]).toEqual([0, 0]);
    expect(d.statedAmount).toBeNull();
  });

  it('§3 AMBIGUOUS: budget 0/0 but the stated figure is preserved for the chooser', () => {
    const d = normalizeCampaignBudget(draft({ budgetStatus: 'AMBIGUOUS', statedAmount: 8000, creatorsNeeded: 2 }));
    expect([d.budgetMin, d.budgetMax]).toEqual([0, 0]);
    expect(d.statedAmount).toBe(8000);
  });

  it('STATED_TOTAL: divides evenly across creators (floored)', () => {
    const d = normalizeCampaignBudget(draft({ budgetStatus: 'STATED_TOTAL', statedAmount: 8000, creatorsNeeded: 3 }));
    expect([d.budgetMin, d.budgetMax]).toEqual([2666, 2666]);
  });

  it('ignores a degenerate range (max <= min) and falls back to FIXED', () => {
    const d = normalizeCampaignBudget(draft({ budgetStatus: 'STATED_PER_CREATOR', budgetRateType: 'RANGE', statedAmount: 8000, statedAmountMax: 8000 }));
    expect([d.budgetMin, d.budgetMax, d.budgetRateType]).toEqual([8000, 8000, 'FIXED']);
  });

  it('never trusts a stray budgetMin/budgetMax from the model', () => {
    const d = normalizeCampaignBudget(draft({ budgetStatus: 'NOT_STATED', budgetMin: 99999, budgetMax: 99999 } as Partial<AiCampaignDraft>));
    expect([d.budgetMin, d.budgetMax]).toEqual([0, 0]);
  });
});

describe('CampaignAiService.generateDraft — budget wiring', () => {
  let svc: CampaignAiService;

  beforeEach(() => {
    svc = new CampaignAiService();
    const s = svc as unknown as {
      categoryRepo: { findManyPublic: () => Promise<unknown> };
      platformRepo: { findManyPublic: () => Promise<unknown> };
    };
    vi.spyOn(s.categoryRepo, 'findManyPublic').mockResolvedValue([{ name: 'Food & Drink' }] as never);
    vi.spyOn(s.platformRepo, 'findManyPublic').mockResolvedValue([{ name: 'Instagram' }] as never);
  });

  function modelJson(budget: Record<string, unknown>): string {
    return JSON.stringify({
      campaignIntentDetected: true,
      clarifyingMessage: '',
      title: 'Cover our launch night',
      description: 'Two creators shoot stories and one recap reel each at the launch.',
      category: 'Food & Drink',
      secondaryCategories: [],
      platform: 'Instagram',
      goal: 'Brand Awareness',
      suggestedDurationDays: 7,
      creatorsNeeded: 2,
      paymentType: 'Fixed Fee',
      deliverables: { REEL: 1, STORY: 2, PHOTO_POST: 0, VISIT_STORE: 0, PRODUCT_REVIEW_VIDEO: 0, EVENT_COVERAGE_VIDEO: 0, MENTION_IN_CAPTION: 0, TAG_BUSINESS: 0, GOOGLE_REVIEW: 0 },
      hashtags: ['launch'],
      sampleCaption: 'Had the best time at the launch!',
      location: 'Kathmandu',
      imageQuery: 'restaurant launch party',
      needsInput: [],
      ...budget,
    });
  }

  it('derives a per-creator fee from a stated amount', async () => {
    vi.spyOn(svc as unknown as { callModel: () => Promise<string> }, 'callModel')
      .mockResolvedValue(modelJson({ budgetStatus: 'STATED_PER_CREATOR', statedAmount: 8000, statedAmountMax: null, budgetRateType: 'FIXED' }));
    const res = await svc.generateDraft('2 creators, Rs 8000 per creator', 'en');
    expect(res.budgetStatus).toBe('STATED_PER_CREATOR');
    expect(res.budgetMin).toBe(8000);
    expect(res.budgetMax).toBe(8000);
    expect(res.aiFallback).toBe(false);
  });

  it('leaves budget unset when the prompt names no amount', async () => {
    vi.spyOn(svc as unknown as { callModel: () => Promise<string> }, 'callModel')
      .mockResolvedValue(modelJson({ budgetStatus: 'NOT_STATED', statedAmount: null, statedAmountMax: null, budgetRateType: 'FIXED' }));
    const res = await svc.generateDraft('need 2 creators to cover our event', 'en');
    expect(res.budgetStatus).toBe('NOT_STATED');
    expect(res.budgetMin).toBe(0);
    expect(res.budgetMax).toBe(0);
  });

  it('keeps the stated figure on an ambiguous budget for the review chooser', async () => {
    vi.spyOn(svc as unknown as { callModel: () => Promise<string> }, 'callModel')
      .mockResolvedValue(modelJson({ budgetStatus: 'AMBIGUOUS', statedAmount: 8000, statedAmountMax: null, budgetRateType: 'FIXED' }));
    const res = await svc.generateDraft('Need 2 creators. Budget is Rs. 8,000.', 'en');
    expect(res.budgetStatus).toBe('AMBIGUOUS');
    expect(res.statedAmount).toBe(8000);
    expect(res.budgetMax).toBe(0);
  });
});
