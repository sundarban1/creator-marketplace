// ─────────────────────────────────────────────────────────────────────────────
// Campaign publish rules — SHARED, byte-identical copies live in:
//   backend/src/modules/campaign/campaign.rules.ts   (source of truth)
//   web/src/app/business/campaignRules.ts
//   mobile/src/features/business/utils/campaignRules.ts
// Edit the backend copy, then copy it over both others; campaign.rules.test.ts
// fails if they drift. No imports, so it runs unchanged in all three.
//
// The backend enforces these on publish (and via POST /campaigns/validate);
// the apps run the same function for instant feedback. Messages are friendly
// questions, not errors (UX spec §26) — apps may localise them by `code`.
// ─────────────────────────────────────────────────────────────────────────────

export const MIN_BUDGET_PER_CREATOR = 500;
export const MAX_PLATFORMS = 3;
export const MAX_CREATORS = 50;

export type CampaignStep = 'basics' | 'creators' | 'content' | 'budget' | 'requirements';

export type RuleSeverity =
  // Blocks publishing — genuinely required or genuinely wrong.
  | 'required'
  // Never blocks; shown as a Kolab suggestion on the review screen.
  | 'recommended';

export interface CampaignRuleIssue {
  code: string;
  field: string;
  step: CampaignStep;
  severity: RuleSeverity;
  message: string;
}

export interface CampaignRulesInput {
  title?: string | null;
  description?: string | null;
  category?: string | null;
  platforms?: string[] | null;
  creatorsNeeded?: number | null;
  deliverables?: string | null;
  deliverableItems?: { type: string; platform?: string | null; quantity: number }[] | null;
  paymentType?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  // Multi-role campaigns carry budgets per requirement instead.
  hasRequirements?: boolean | null;
  deadline?: string | Date | null;
  startDate?: string | Date | null;
  applicationDeadline?: string | Date | null;
  // ONSITE = creators visit a place; REMOTE = content can be made anywhere.
  locationType?: 'ONSITE' | 'REMOTE' | null;
  locationScope?: 'SPECIFIC' | 'NATIONWIDE' | 'ANYWHERE' | null;
  locations?: { name: string }[] | null;
  location?: string | null;
  minFollowers?: number | null;
  briefSectionsFilled?: number | null;
}

function toTime(v: string | Date | null | undefined): number | null {
  if (v == null || v === '') return null;
  const t = v instanceof Date ? v.getTime() : Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

function text(v: string | null | undefined): string {
  return (v ?? '').trim();
}

export function campaignLocationNames(d: CampaignRulesInput): string[] {
  const fromList = (d.locations ?? []).map((l) => text(l.name)).filter(Boolean);
  if (fromList.length) return fromList;
  return text(d.location) ? [text(d.location)] : [];
}

export function getCampaignIssues(d: CampaignRulesInput, now: number = Date.now()): CampaignRuleIssue[] {
  const issues: CampaignRuleIssue[] = [];
  const add = (code: string, field: string, step: CampaignStep, severity: RuleSeverity, message: string) =>
    issues.push({ code, field, step, severity, message });

  // ── Basics ────────────────────────────────────────────────────────────────
  if (text(d.title).length < 3) {
    add('TITLE_MISSING', 'title', 'basics', 'required', 'What should we call this campaign?');
  }
  if (text(d.description).length < 10) {
    add('DESCRIPTION_SHORT', 'description', 'basics', 'recommended', 'A sentence or two about the campaign helps creators decide to apply.');
  }

  const deadline = toTime(d.deadline);
  if (deadline == null) {
    add('DEADLINE_MISSING', 'deadline', 'budget', 'required', 'When should the content be finished?');
  } else if (deadline <= now) {
    add('DEADLINE_PAST', 'deadline', 'budget', 'required', 'The finish date has already passed — pick a date in the future.');
  }
  const start = toTime(d.startDate);
  if (start != null && deadline != null && start > deadline) {
    add('START_AFTER_DEADLINE', 'startDate', 'budget', 'required', 'The campaign should start before it finishes.');
  }
  const applyBy = toTime(d.applicationDeadline);
  if (applyBy != null && deadline != null && applyBy > deadline) {
    add('APPLY_AFTER_DEADLINE', 'applicationDeadline', 'budget', 'required', 'Applications should close before the campaign finishes.');
  }

  // ── Location ──────────────────────────────────────────────────────────────
  // Only creators who must visit a place need one; remote / nationwide /
  // "location isn't important" campaigns never get blocked on it (§11).
  if (d.locationType === 'ONSITE' && campaignLocationNames(d).length === 0) {
    add('LOCATION_MISSING', 'locations', 'basics', 'required', 'Where should creators visit you?');
  }

  // ── Creators ──────────────────────────────────────────────────────────────
  if (text(d.category).length === 0) {
    add('CATEGORY_MISSING', 'category', 'creators', 'required', 'What kind of creators are you looking for?');
  }
  const creators = d.creatorsNeeded ?? 0;
  if (!Number.isInteger(creators) || creators < 1) {
    add('CREATORS_MISSING', 'creatorsNeeded', 'creators', 'required', 'How many creators do you need?');
  } else if (creators > MAX_CREATORS) {
    add('CREATORS_TOO_MANY', 'creatorsNeeded', 'creators', 'required', `You can invite up to ${MAX_CREATORS} creators per campaign.`);
  }
  const platforms = d.platforms ?? [];
  if (platforms.length > MAX_PLATFORMS) {
    add('PLATFORMS_TOO_MANY', 'platforms', 'creators', 'required', `Pick up to ${MAX_PLATFORMS} platforms.`);
  } else if (platforms.length === 0) {
    add('PLATFORMS_MISSING', 'platforms', 'creators', 'recommended', 'Where should creators post? Picking a platform helps us match the right creators.');
  }

  // ── Content ───────────────────────────────────────────────────────────────
  const items = d.deliverableItems ?? [];
  if (items.some((i) => !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 50)) {
    add('DELIVERABLE_QUANTITY', 'deliverableItems', 'content', 'required', 'Each deliverable needs a quantity between 1 and 50.');
  }
  if (items.length === 0 && text(d.deliverables).length === 0) {
    add('DELIVERABLES_MISSING', 'deliverableItems', 'content', 'recommended', 'What should creators deliver? For example, 1 short video each.');
  }

  // ── Budget ────────────────────────────────────────────────────────────────
  const min = d.budgetMin ?? 0;
  const max = d.budgetMax ?? 0;
  if (max < min) {
    add('BUDGET_RANGE', 'budgetMax', 'budget', 'required', 'The highest amount should be at least the lowest amount.');
  }
  const cashPaid = !d.hasRequirements && d.paymentType !== 'Product Exchange';
  if (cashPaid && max < MIN_BUDGET_PER_CREATOR) {
    add('BUDGET_MISSING', 'budgetMax', 'budget', 'required', `How much will you pay each creator? (at least Rs. ${MIN_BUDGET_PER_CREATOR})`);
  }

  return issues;
}

export function blockingIssues(issues: CampaignRuleIssue[]): CampaignRuleIssue[] {
  return issues.filter((i) => i.severity === 'required');
}

export function isPublishable(d: CampaignRulesInput, now?: number): boolean {
  return blockingIssues(getCampaignIssues(d, now)).length === 0;
}

// Internal campaign complexity (§10) — never shown or asked; drives how much
// of the creator the apps reveal by default.
export type CampaignComplexityLevel = 'QUICK' | 'STANDARD' | 'ADVANCED';

export function computeComplexity(d: CampaignRulesInput): CampaignComplexityLevel {
  const items = d.deliverableItems?.length ?? 0;
  const locations = campaignLocationNames(d).length;
  const sections = d.briefSectionsFilled ?? 0;
  const creators = d.creatorsNeeded ?? 1;
  if (sections >= 2 || items > 3 || creators > 10 || locations > 2) return 'ADVANCED';
  if (sections >= 1 || items > 1 || locations > 1 || (d.minFollowers ?? 0) > 0 || (d.platforms?.length ?? 0) > 1) return 'STANDARD';
  return 'QUICK';
}
