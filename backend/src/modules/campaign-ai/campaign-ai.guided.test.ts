import { describe, it, expect } from 'vitest';
import { aiCampaignDraftSchema, type AiCampaignDraft } from './campaign-ai.schema';
import {
  buildGuidedExtras, legacyDeliverablesToItems, recommendBudget, recommendCreatorCount,
  recommendDeliverables, askKolabFallback,
} from './campaign-ai.guided';

const NOW = Date.parse('2026-10-05T06:00:00Z');

// The shape the model returns for "We're opening a new café in Itahari and need
// 3 TikTok creators to visit and create short videos. Budget around Rs 15,000."
function draft(over: Record<string, unknown> = {}): AiCampaignDraft {
  return aiCampaignDraftSchema.parse({
    title: 'New Café Launch', description: 'Visit our new café in Itahari and film a short TikTok video.',
    category: 'Food', secondaryCategories: [], platform: 'TikTok', goal: 'More Customers',
    suggestedDurationDays: 14, creatorsNeeded: 3, budgetStatus: 'STATED_TOTAL', statedAmount: 15000,
    deliverables: { REEL: 0, STORY: 0, PHOTO_POST: 0, VISIT_STORE: 1, PRODUCT_REVIEW_VIDEO: 0, EVENT_COVERAGE_VIDEO: 0, MENTION_IN_CAPTION: 0, TAG_BUSINESS: 0, GOOGLE_REVIEW: 0 },
    hashtags: ['#itahari'], sampleCaption: 'Come try it!', location: 'Itahari',
    locations: ['Itahari'], locationScope: 'SPECIFIC', creatorsVisit: true,
    deliverableItems: [{ type: 'TIKTOK_VIDEO', platform: 'TikTok', quantity: 1 }],
    statedFields: ['creatorsNeeded', 'platforms', 'locations', 'creatorsVisit', 'budget', 'deliverables'],
    ...over,
  });
}

describe('buildGuidedExtras — extraction', () => {
  it('uses what the business said and asks nothing it already answered (§5)', () => {
    const g = buildGuidedExtras(draft(), NOW);
    expect(g.locations).toEqual([{ name: 'Itahari' }]);
    expect(g.locationType).toBe('ONSITE');
    expect(g.locationScope).toBe('SPECIFIC');
    expect(g.deliverableItems).toEqual([{ type: 'TIKTOK_VIDEO', platform: 'TikTok', quantity: 1 }]);
    expect(g.missingInformation).not.toContain('location');
    expect(g.missingInformation).not.toContain('creatorsVisit');
    expect(g.missingInformation).not.toContain('creatorsNeeded');
    expect(g.clarifyingQuestions).toEqual([]);
  });

  it('labels stated fields AI_EXTRACTED and everything Kolab filled AI_SUGGESTED (§30)', () => {
    const g = buildGuidedExtras(draft(), NOW);
    expect(g.aiProvenance.creatorsNeeded).toBe('AI_EXTRACTED');
    expect(g.aiProvenance.locations).toBe('AI_EXTRACTED');
    expect(g.aiProvenance.budget).toBe('AI_EXTRACTED');
    expect(g.aiProvenance.description).toBe('AI_SUGGESTED');
    expect(g.aiProvenance.category).toBe('AI_SUGGESTED');
    expect(g.aiProvenance.deadline).toBe('AI_SUGGESTED');
  });

  it('a vague prompt gets missing info, a visit question and labelled suggestions', () => {
    const g = buildGuidedExtras(draft({
      statedFields: [], locations: [], location: null, locationScope: 'UNSURE', creatorsVisit: null,
      deliverableItems: [], budgetStatus: 'NOT_STATED', statedAmount: null,
      deliverables: { REEL: 1, STORY: 0, PHOTO_POST: 0, VISIT_STORE: 0, PRODUCT_REVIEW_VIDEO: 0, EVENT_COVERAGE_VIDEO: 0, MENTION_IN_CAPTION: 0, TAG_BUSINESS: 0, GOOGLE_REVIEW: 0 },
    }), NOW);
    expect(g.missingInformation).toEqual(expect.arrayContaining(['budget', 'creatorsVisit', 'location', 'creatorsNeeded', 'deliverables', 'timeline']));
    expect(g.clarifyingQuestions.map((q) => q.id)).toEqual(['CREATORS_VISIT', 'LOCATION']);
    expect(g.clarifyingQuestions[0].options.map((o) => o.value)).toEqual(['YES', 'NO', 'NOT_SURE']);
    // Legacy counts still become structured items, marked as a suggestion
    expect(g.deliverableItems).toEqual([{ type: 'REEL', platform: 'Instagram', quantity: 1 }]);
    expect(g.suggestions.map((s) => s.field)).toEqual(expect.arrayContaining(['creatorsNeeded', 'deliverableItems', 'platforms', 'deadline']));
    expect(g.suggestions.every((s) => s.reason.length > 5)).toBe(true);
    expect(g.locationType).toBeNull();
  });

  it("a guessed visit is pre-selected but still asked when the business didn't say it (§14)", () => {
    const g = buildGuidedExtras(draft({ statedFields: ['platforms'], creatorsVisit: true }), NOW);
    const q = g.clarifyingQuestions.find((c) => c.id === 'CREATORS_VISIT');
    expect(q?.suggested).toBe('YES');
    expect(g.locationType).toBe('ONSITE');
    expect(g.aiProvenance.locationType).toBe('AI_SUGGESTED');
  });

  it('nationwide and remote campaigns are never asked for a place (§11)', () => {
    const nationwide = buildGuidedExtras(draft({ locations: [], location: null, locationScope: 'NATIONWIDE', creatorsVisit: false }), NOW);
    expect(nationwide.locationScope).toBe('NATIONWIDE');
    expect(nationwide.locationType).toBe('REMOTE');
    expect(nationwide.missingInformation).not.toContain('location');
    const remote = buildGuidedExtras(draft({ locations: [], location: 'Kathmandu', locationScope: 'ANYWHERE', creatorsVisit: false }), NOW);
    expect(remote.locations).toEqual([]);
    expect(remote.clarifyingQuestions).toEqual([]);
  });

  it('never invents creator requirements the business did not state (§30)', () => {
    const invented = buildGuidedExtras(draft({ statedRequirements: { minFollowers: 50000, languages: ['Nepali'], tiers: ['MACRO'], notes: 'x' } }), NOW);
    expect(invented.minFollowers).toBe(0);
    expect(invented.brief.creatorRequirements).toBeUndefined();
    const stated = buildGuidedExtras(draft({
      statedFields: ['creatorRequirements'],
      statedRequirements: { minFollowers: 10000, languages: ['Nepali'], tiers: [], notes: '' },
    }), NOW);
    expect(stated.minFollowers).toBe(10000);
    expect(stated.brief.creatorRequirements).toEqual({ languages: ['Nepali'] });
  });

  it('turns stated dates into a valid timeline, ignoring past or reversed ones', () => {
    const g = buildGuidedExtras(draft({ startDate: '2026-10-10', endDate: '2026-10-20' }), NOW);
    expect(g.startDate).toBe('2026-10-09T18:15:00.000Z'); // midnight Nepal time
    expect(g.deadline).toBe('2026-10-20T18:14:00.000Z');  // 23:59 Nepal time
    const past = buildGuidedExtras(draft({ endDate: '2026-01-01', suggestedDurationDays: 10 }), NOW);
    expect(Date.parse(past.deadline)).toBe(NOW + 10 * 86_400_000);
  });

  it('a malformed extra field from the model never discards the draft', () => {
    const d = draft({ locations: 'Itahari', deliverableItems: [{ type: 'HOLOGRAM', quantity: 99 }], statedFields: ['nonsense', 'budget'] });
    expect(d.locations).toEqual([]);
    expect(d.deliverableItems).toEqual([]);
    expect(d.statedFields).toEqual(['budget']);
  });
});

describe('Let Kolab recommend (§13–14)', () => {
  it('deliverables follow the chosen platforms, defaulting to one short video', () => {
    expect(recommendDeliverables({ platforms: ['TikTok', 'Instagram'] })).toEqual([
      { type: 'TIKTOK_VIDEO', platform: 'TikTok', quantity: 1 },
      { type: 'REEL', platform: 'Instagram', quantity: 1 },
    ]);
    expect(recommendDeliverables({})).toEqual([{ type: 'REEL', platform: 'Instagram', quantity: 1 }]);
  });

  it('budget is a per-creator estimate range, higher when creators must visit', () => {
    const remote = recommendBudget({ deliverableItems: [{ type: 'REEL', quantity: 1 }] });
    expect(remote).toMatchObject({ budgetMin: 2500, budgetMax: 4000 });
    expect(remote.reason).toMatch(/estimate/i);
    const visit = recommendBudget({ deliverableItems: [{ type: 'REEL', quantity: 1 }], locationType: 'ONSITE' });
    expect(visit.budgetMin).toBeGreaterThan(remote.budgetMin);
    expect(visit.budgetMin % 500).toBe(0);
  });

  it('creator count follows the goal and never exceeds real supply', () => {
    expect(recommendCreatorCount({ goal: 'Brand Awareness' }, null).creatorsNeeded).toBe(5);
    expect(recommendCreatorCount({ goal: 'Sales' }, null).creatorsNeeded).toBe(3);
    const scarce = recommendCreatorCount({ goal: 'Brand Awareness' }, { count: 2, place: 'Dharan' });
    expect(scarce.creatorsNeeded).toBe(2);
    expect(scarce.reason).toMatch(/2 creators on Kolab around Dharan/);
  });

  it('legacy deliverable counts map to structured items (actions dropped)', () => {
    expect(legacyDeliverablesToItems({ REEL: 2, VISIT_STORE: 1, TAG_BUSINESS: 1, GOOGLE_REVIEW: 1 }, 'TikTok')).toEqual([
      { type: 'REEL', platform: 'Instagram', quantity: 2 },
      { type: 'GOOGLE_REVIEW', platform: 'Google', quantity: 1 },
    ]);
  });
});

describe('Ask Kolab fallback FAQ', () => {
  it('answers the common questions without AI, and admits when it cannot', () => {
    expect(askKolabFallback('How many creators should I hire?')).toMatch(/2–5 creators/);
    expect(askKolabFallback("What's a good budget?")).toMatch(/Rs\./);
    expect(askKolabFallback("What's the difference between Reel and TikTok?")).toMatch(/Instagram/);
    expect(askKolabFallback('What is the capital of France?')).toBeNull();
  });
});
