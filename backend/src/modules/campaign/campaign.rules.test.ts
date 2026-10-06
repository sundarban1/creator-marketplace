import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { getCampaignIssues, blockingIssues, isPublishable, computeComplexity, type CampaignRulesInput } from './campaign.rules';
import { summarizeDeliverables, countFilledBriefSections, campaignBriefSchema, deliverableItemSchema } from './campaign.brief';

const NOW = Date.parse('2026-10-05T00:00:00Z');
const future = '2026-11-01T00:00:00.000Z';

// A small-business campaign that should publish as-is.
const quick: CampaignRulesInput = {
  title: 'New café launch in Itahari',
  description: 'Visit our new café and make a short video about the menu.',
  category: 'Food',
  platforms: ['TikTok'],
  creatorsNeeded: 3,
  deliverableItems: [{ type: 'TIKTOK_VIDEO', platform: 'TikTok', quantity: 1 }],
  budgetMin: 5000,
  budgetMax: 5000,
  deadline: future,
  locationType: 'ONSITE',
  locations: [{ name: 'Itahari' }],
};

const codes = (d: CampaignRulesInput) => getCampaignIssues(d, NOW).map((i) => i.code);
const blocking = (d: CampaignRulesInput) => blockingIssues(getCampaignIssues(d, NOW)).map((i) => i.code);

describe('campaign rules — what blocks publishing', () => {
  it('a complete quick campaign is publishable with no suggestions', () => {
    expect(getCampaignIssues(quick, NOW)).toEqual([]);
    expect(isPublishable(quick, NOW)).toBe(true);
  });

  it('missing title, category, creators, budget and a past deadline all block', () => {
    expect(blocking({ ...quick, title: ' ', category: '', creatorsNeeded: 0, budgetMax: 0, budgetMin: 0, deadline: '2026-01-01T00:00:00Z' }))
      .toEqual(expect.arrayContaining(['TITLE_MISSING', 'CATEGORY_MISSING', 'CREATORS_MISSING', 'BUDGET_MISSING', 'DEADLINE_PAST']));
  });

  it('budget below the per-creator minimum blocks, except product exchange or multi-role', () => {
    expect(blocking({ ...quick, budgetMin: 100, budgetMax: 100 })).toContain('BUDGET_MISSING');
    expect(blocking({ ...quick, budgetMin: 0, budgetMax: 0, paymentType: 'Product Exchange' })).toEqual([]);
    expect(blocking({ ...quick, budgetMin: 0, budgetMax: 0, hasRequirements: true })).toEqual([]);
  });

  it('range with max below min blocks', () => {
    expect(blocking({ ...quick, budgetMin: 9000, budgetMax: 6000 })).toContain('BUDGET_RANGE');
  });

  it('location is only required when creators must visit', () => {
    expect(blocking({ ...quick, locations: [], location: null })).toContain('LOCATION_MISSING');
    // remote / "location isn't important" / anywhere in Nepal never block (§11)
    expect(blocking({ ...quick, locationType: 'REMOTE', locations: [] })).toEqual([]);
    expect(blocking({ ...quick, locationType: 'REMOTE', locationScope: 'NATIONWIDE', locations: [] })).toEqual([]);
    // the legacy single `location` column still counts
    expect(blocking({ ...quick, locations: [], location: 'Dharan' })).toEqual([]);
  });

  it('dates must be in order', () => {
    expect(blocking({ ...quick, startDate: '2026-12-01T00:00:00Z' })).toContain('START_AFTER_DEADLINE');
    expect(blocking({ ...quick, applicationDeadline: '2026-12-01T00:00:00Z' })).toContain('APPLY_AFTER_DEADLINE');
  });

  it('too many platforms or creators, and bad deliverable quantities, block', () => {
    expect(blocking({ ...quick, platforms: ['A', 'B', 'C', 'D'] })).toContain('PLATFORMS_TOO_MANY');
    expect(blocking({ ...quick, creatorsNeeded: 51 })).toContain('CREATORS_TOO_MANY');
    expect(blocking({ ...quick, deliverableItems: [{ type: 'REEL', quantity: 0 }] })).toContain('DELIVERABLE_QUANTITY');
  });
});

describe('campaign rules — suggestions never block (§26)', () => {
  it('short description, no platform and no deliverables are recommended, not required', () => {
    const d = { ...quick, description: 'Hi', platforms: [], deliverableItems: [], deliverables: '' };
    expect(codes(d)).toEqual(expect.arrayContaining(['DESCRIPTION_SHORT', 'PLATFORMS_MISSING', 'DELIVERABLES_MISSING']));
    expect(isPublishable(d, NOW)).toBe(true);
  });

  it('legacy free-text deliverables satisfy the deliverables suggestion', () => {
    expect(codes({ ...quick, deliverableItems: [], deliverables: '1 reel' })).not.toContain('DELIVERABLES_MISSING');
  });

  it('every issue carries a friendly question, a field and the step to jump to', () => {
    for (const i of getCampaignIssues({}, NOW)) {
      expect(i.message.length).toBeGreaterThan(10);
      expect(i.field).toBeTruthy();
      expect(['basics', 'creators', 'content', 'budget', 'requirements']).toContain(i.step);
      expect(i.message).not.toMatch(/^Error|is required$/);
    }
  });
});

describe('internal complexity (§10)', () => {
  it('simple campaign → QUICK, more structure → STANDARD, rich brief → ADVANCED', () => {
    expect(computeComplexity(quick)).toBe('QUICK');
    expect(computeComplexity({ ...quick, deliverableItems: [{ type: 'REEL', quantity: 2 }, { type: 'STORY', quantity: 3 }] })).toBe('STANDARD');
    expect(computeComplexity({ ...quick, briefSectionsFilled: 3 })).toBe('ADVANCED');
    expect(computeComplexity({ ...quick, locations: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] })).toBe('ADVANCED');
  });
});

describe('brief helpers', () => {
  it('summarises structured deliverables for the legacy text column', () => {
    expect(summarizeDeliverables([
      { type: 'REEL', platform: 'Instagram', quantity: 2 },
      { type: 'TIKTOK_VIDEO', platform: null, quantity: 3 },
    ])).toBe('2× Reel (Instagram), 3× TikTok video');
  });

  it('counts only brief sections with real content', () => {
    expect(countFilledBriefSections({})).toBe(0);
    expect(countFilledBriefSections({ audience: { interests: [] }, content: { dos: ['Smile'] } })).toBe(1);
    expect(countFilledBriefSections({ commercial: { exclusivity: false }, approval: { revisionRounds: 2 } })).toBe(2);
  });

  it('rejects junk in structured fields', () => {
    expect(deliverableItemSchema.safeParse({ type: 'REEL', quantity: 0 }).success).toBe(false);
    expect(campaignBriefSchema.safeParse({ audience: { ageMin: 30, ageMax: 20 } }).success).toBe(false);
    expect(campaignBriefSchema.safeParse({ creatorRequirements: { tiers: ['GIANT'] } }).success).toBe(false);
  });
});

// Front-end and back-end validation must be the same function (UX spec: validate
// both front end and backend). The apps carry byte-identical copies.
describe('shared rules copies stay in sync', () => {
  const source = fs.readFileSync(path.join(__dirname, 'campaign.rules.ts'), 'utf8');
  const root = path.resolve(__dirname, '../../../..');
  for (const rel of ['web/src/app/business/campaignRules.ts', 'mobile/src/features/business/utils/campaignRules.ts']) {
    const file = path.join(root, rel);
    it(`${rel} matches backend campaign.rules.ts`, () => {
      if (!fs.existsSync(file)) return; // backend-only checkout (e.g. the Docker build)
      expect(fs.readFileSync(file, 'utf8')).toBe(source);
    });
  }
});
