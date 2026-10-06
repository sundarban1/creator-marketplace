import { getDict } from '../../i18n';
import type { AiCampaignDraft, RecommendInput, StatedField } from './campaign-ai.schema';

// Deterministic half of the guided creator's AI: everything here is computed
// in code from the model's structured output (or the current draft), never
// generated — so provenance, "what's missing", the clarifying questions and
// recommendations are predictable, testable, and can't be invented by the model
// (UX spec §5, §13, §14, §29, §30).

export type Provenance = 'USER' | 'AI_EXTRACTED' | 'AI_SUGGESTED';
export type DeliverableItem = { type: string; platform: string | null; quantity: number };

export type ClarifyingQuestion = {
  id: 'CREATORS_VISIT' | 'LOCATION';
  field: 'locationType' | 'locationScope';
  question: string;
  options: { value: string; label: string }[];
  // Kolab's guess, pre-selected but not assumed — the business confirms.
  suggested: string | null;
};

export type GuidedSuggestion = { field: string; value: unknown; reason: string };

export type GuidedExtras = {
  locations: { name: string }[];
  locationScope: 'SPECIFIC' | 'NATIONWIDE' | 'ANYWHERE' | null;
  locationType: 'ONSITE' | 'REMOTE' | null;
  deliverableItems: DeliverableItem[];
  startDate: string | null;
  deadline: string;
  minFollowers: number;
  brief: {
    creatorRequirements?: { tiers?: string[]; languages?: string[]; notes?: string };
    content?: { creatorsVisit: boolean | null };
  };
  aiProvenance: Record<string, Provenance>;
  missingInformation: string[];
  clarifyingQuestions: ClarifyingQuestion[];
  suggestions: GuidedSuggestion[];
};

// Legacy per-creator deliverable counts → structured items, for when the model
// fills the old object but not deliverableItems (and for dummy templates).
const LEGACY_TO_ITEM: Record<string, { type: string; platform: string | null } | null> = {
  REEL:                 { type: 'REEL', platform: 'Instagram' },
  STORY:                { type: 'STORY', platform: 'Instagram' },
  PHOTO_POST:           { type: 'PHOTO_POST', platform: null },
  PRODUCT_REVIEW_VIDEO: { type: 'PRODUCT_REVIEW', platform: null },
  EVENT_COVERAGE_VIDEO: { type: 'EVENT_COVERAGE', platform: null },
  GOOGLE_REVIEW:        { type: 'GOOGLE_REVIEW', platform: 'Google' },
  // Actions, not content pieces — VISIT_STORE instead signals creatorsVisit.
  VISIT_STORE: null, MENTION_IN_CAPTION: null, TAG_BUSINESS: null,
};

export function legacyDeliverablesToItems(d: Record<string, number>, platform: string | null): DeliverableItem[] {
  return Object.entries(d)
    .filter(([k, n]) => n > 0 && LEGACY_TO_ITEM[k])
    .map(([k, n]) => {
      const m = LEGACY_TO_ITEM[k]!;
      return { type: m.type, platform: m.platform ?? platform, quantity: n };
    });
}

// Calendar date "YYYY-MM-DD" (Nepal) → end of that day in Nepal, as ISO.
function endOfNepalDay(date: string): string {
  return new Date(`${date}T23:59:00+05:45`).toISOString();
}
function startOfNepalDay(date: string): string {
  return new Date(`${date}T00:00:00+05:45`).toISOString();
}

export function buildGuidedExtras(draft: AiCampaignDraft, now: number = Date.now()): GuidedExtras {
  const dict = getDict().guidedAi;
  const stated = new Set<StatedField>(draft.statedFields);
  const isStated = (f: StatedField) => stated.has(f);

  // ── Location (§11) ──────────────────────────────────────────────────────
  const names = draft.locations.length ? draft.locations : draft.location ? [draft.location] : [];
  const visitsFromLegacy = (draft.deliverables as Record<string, number>).VISIT_STORE > 0;
  // The model's guess pre-fills the answer, but unless the business actually
  // said it, it's still asked (§14 "Should creators visit your café?").
  const creatorsVisit = draft.creatorsVisit ?? (visitsFromLegacy ? true : null);
  const visitConfirmed = creatorsVisit != null && isStated('creatorsVisit');
  let locationScope: GuidedExtras['locationScope'] =
    draft.locationScope === 'UNSURE' ? (names.length ? 'SPECIFIC' : null) : draft.locationScope;
  if (locationScope !== 'SPECIFIC' && creatorsVisit === true && names.length) locationScope = 'SPECIFIC';
  const locationType: GuidedExtras['locationType'] =
    creatorsVisit === true ? 'ONSITE' : creatorsVisit === false ? 'REMOTE' : names.length ? 'ONSITE' : null;
  const keepNames = locationScope === 'SPECIFIC' || locationType === 'ONSITE';

  // ── Deliverables ────────────────────────────────────────────────────────
  const items: DeliverableItem[] = draft.deliverableItems.length
    ? draft.deliverableItems.map((i) => ({ type: i.type, platform: i.platform ?? draft.platform ?? null, quantity: i.quantity }))
    : legacyDeliverablesToItems(draft.deliverables as Record<string, number>, draft.platform ?? null);

  // ── Timeline ────────────────────────────────────────────────────────────
  const fallbackDeadline = new Date(now + Math.max(1, draft.suggestedDurationDays) * 86_400_000).toISOString();
  let deadline = draft.endDate ? endOfNepalDay(draft.endDate) : fallbackDeadline;
  if (Date.parse(deadline) <= now) deadline = fallbackDeadline;
  let startDate = draft.startDate ? startOfNepalDay(draft.startDate) : null;
  if (startDate && Date.parse(startDate) > Date.parse(deadline)) startDate = null;

  // ── Stated requirements only (§30) ──────────────────────────────────────
  const req = draft.statedRequirements;
  const reqStated = isStated('creatorRequirements');
  const creatorRequirements = reqStated && (req.tiers.length || req.languages.length || req.notes)
    ? { ...(req.tiers.length ? { tiers: req.tiers } : {}), ...(req.languages.length ? { languages: req.languages } : {}), ...(req.notes ? { notes: req.notes } : {}) }
    : undefined;
  const minFollowers = reqStated && req.minFollowers ? req.minFollowers : 0;

  // ── Provenance: said by the business vs filled in by Kolab ──────────────
  const from = (f: StatedField): Provenance => (isStated(f) ? 'AI_EXTRACTED' : 'AI_SUGGESTED');
  const aiProvenance: Record<string, Provenance> = {
    title: from('title'),
    description: 'AI_SUGGESTED',
    hashtags: 'AI_SUGGESTED',
    category: from('category'),
    goal: from('goal'),
    platforms: from('platforms'),
    creatorsNeeded: from('creatorsNeeded'),
    deliverableItems: from('deliverables'),
    deadline: from('timeline'),
  };
  if (startDate) aiProvenance.startDate = from('timeline');
  if (draft.budgetStatus === 'STATED_PER_CREATOR' || draft.budgetStatus === 'STATED_TOTAL') aiProvenance.budget = 'AI_EXTRACTED';
  if (names.length && keepNames) aiProvenance.locations = from('locations');
  if (locationType) aiProvenance.locationType = creatorsVisit != null && isStated('creatorsVisit') ? 'AI_EXTRACTED' : 'AI_SUGGESTED';
  if (creatorRequirements || minFollowers) aiProvenance.creatorRequirements = 'AI_EXTRACTED';

  // ── What's still missing / worth confirming (§5) ────────────────────────
  const missing: string[] = [];
  if (draft.budgetStatus === 'NOT_STATED' || draft.budgetStatus === 'AMBIGUOUS') missing.push('budget');
  if (!visitConfirmed) missing.push('creatorsVisit');
  if (!(visitConfirmed && creatorsVisit === false) && !(keepNames && names.length) && locationScope !== 'NATIONWIDE' && locationScope !== 'ANYWHERE') missing.push('location');
  if (!isStated('creatorsNeeded')) missing.push('creatorsNeeded');
  if (!isStated('deliverables')) missing.push('deliverables');
  if (!isStated('platforms')) missing.push('platforms');
  if (!isStated('timeline')) missing.push('timeline');

  // ── "One thing to clarify" (§14) — assistance, max 2, fixed options ─────
  const clarifyingQuestions: ClarifyingQuestion[] = [];
  if (missing.includes('creatorsVisit')) {
    const c = dict.clarify.CREATORS_VISIT;
    clarifyingQuestions.push({
      id: 'CREATORS_VISIT', field: 'locationType', question: c.question,
      suggested: creatorsVisit === true ? 'YES' : creatorsVisit === false ? 'NO' : null,
      options: [{ value: 'YES', label: c.YES }, { value: 'NO', label: c.NO }, { value: 'NOT_SURE', label: c.NOT_SURE }],
    });
  }
  if (missing.includes('location')) {
    const c = dict.clarify.LOCATION;
    clarifyingQuestions.push({
      id: 'LOCATION', field: 'locationScope', question: c.question, suggested: null,
      options: [{ value: 'SPECIFIC', label: c.SPECIFIC }, { value: 'NATIONWIDE', label: c.NATIONWIDE }, { value: 'ANYWHERE', label: c.ANYWHERE }],
    });
  }

  // ── Suggestions: values Kolab filled in, with a short why (§14, §30) ────
  const noteFor = (field: string) =>
    draft.suggestionNotes.find((n) => n.field === field)?.note
    ?? dict.suggestionReason[field as keyof typeof dict.suggestionReason];
  const suggestions: GuidedSuggestion[] = [];
  if (!isStated('creatorsNeeded')) suggestions.push({ field: 'creatorsNeeded', value: draft.creatorsNeeded, reason: noteFor('creatorsNeeded') });
  if (!isStated('deliverables') && items.length) suggestions.push({ field: 'deliverableItems', value: items, reason: noteFor('deliverables') });
  if (!isStated('platforms')) suggestions.push({ field: 'platforms', value: [draft.platform], reason: noteFor('platforms') });
  if (!isStated('timeline')) suggestions.push({ field: 'deadline', value: deadline, reason: noteFor('timeline') });

  return {
    locations: keepNames ? names.map((name) => ({ name })) : [],
    locationScope,
    locationType,
    deliverableItems: items,
    startDate,
    deadline,
    minFollowers,
    brief: {
      ...(creatorRequirements ? { creatorRequirements } : {}),
      content: { creatorsVisit },
    },
    aiProvenance,
    missingInformation: missing,
    clarifyingQuestions,
    suggestions,
  };
}

// ── "Let Kolab recommend" (§13–14) ──────────────────────────────────────────
// Deterministic so a recommendation is explainable and never a hallucination.
// A budget figure is only ever produced here on explicit request, and labelled
// an estimate — the never-invent-a-budget rule still holds for extraction.

// Typical per-piece creator rates in Nepal (NPR), small/mid creators.
const RATE_NPR: Record<string, number> = {
  REEL: 3000, TIKTOK_VIDEO: 3000, YOUTUBE_SHORT: 2500, STORY: 800, PHOTO_POST: 1500,
  YOUTUBE_VIDEO: 8000, UGC_VIDEO: 2500, PRODUCT_REVIEW: 3000, EVENT_COVERAGE: 4000,
  GOOGLE_REVIEW: 500, BLOG_POST: 3000, LIVE_STREAM: 5000,
};
const DEFAULT_RATE = 2000;
const VISIT_EXTRA = 1500;

const round500 = (n: number) => Math.max(500, Math.round(n / 500) * 500);
const npr = (n: number) => `Rs. ${n.toLocaleString('en-IN')}`;

export function recommendDeliverables(draft: RecommendInput['draft']): DeliverableItem[] {
  const platforms = (draft.platforms ?? []).map((p) => p.toLowerCase());
  const items: DeliverableItem[] = [];
  for (const p of platforms.slice(0, 2)) {
    if (p.includes('tiktok')) items.push({ type: 'TIKTOK_VIDEO', platform: 'TikTok', quantity: 1 });
    else if (p.includes('youtube')) items.push({ type: 'YOUTUBE_SHORT', platform: 'YouTube', quantity: 1 });
    else if (p.includes('instagram')) items.push({ type: 'REEL', platform: 'Instagram', quantity: 1 });
    else if (p.includes('facebook')) items.push({ type: 'REEL', platform: 'Facebook', quantity: 1 });
  }
  return items.length ? items : [{ type: 'REEL', platform: 'Instagram', quantity: 1 }];
}

export function recommendBudget(draft: RecommendInput['draft']): { budgetMin: number; budgetMax: number; reason: string } {
  const dict = getDict().guidedAi.recommend;
  const items = draft.deliverableItems?.length ? draft.deliverableItems : recommendDeliverables(draft);
  const visits = draft.locationType === 'ONSITE';
  const estimate = items.reduce((sum, i) => sum + (RATE_NPR[i.type] ?? DEFAULT_RATE) * i.quantity, 0) + (visits ? VISIT_EXTRA : 0);
  const budgetMin = round500(estimate * 0.8);
  const budgetMax = Math.max(budgetMin, round500(estimate * 1.3));
  return { budgetMin, budgetMax, reason: `${dict.budget(npr(budgetMin), npr(budgetMax))}${visits ? ` ${dict.budgetVisit}` : ''}` };
}

export function recommendCreatorCount(draft: RecommendInput['draft'], supply: { count: number; place: string } | null): { creatorsNeeded: number; reason: string } {
  const dict = getDict().guidedAi.recommend;
  const goal = (draft.goal ?? '').toLowerCase();
  let n = goal.includes('awareness') ? 5 : goal.includes('follower') ? 4 : 3;
  const extraPlaces = Math.max(0, (draft.locations?.length ?? 0) - 1);
  n = Math.min(10, n + extraPlaces * 2);
  // Never recommend more creators than Kolab actually has there.
  if (supply && supply.count > 0) n = Math.max(1, Math.min(n, supply.count));
  const reason = supply && supply.count > 0
    ? `${dict.creators(n)} ${dict.creatorsSupply(supply.count, supply.place)}`
    : dict.creators(n);
  return { creatorsNeeded: n, reason };
}

// Keyword FAQ answers for Ask Kolab when the model is unavailable — better a
// short accurate answer than an error for the questions businesses ask most.
export function askKolabFallback(question: string): string | null {
  const q = question.toLowerCase();
  const faq = getDict().guidedAi.askFaq;
  if (/(reel|tiktok).*(reel|tiktok)|difference/.test(q)) return faq.reelVsTiktok;
  if (/how many|creators? should|number of creator|कति जना/.test(q)) return faq.creators;
  if (/budget|price|cost|pay|charge|rate|बजेट|पैसा/.test(q)) return faq.budget;
  if (/deliverable|what should .*(post|deliver)|content/.test(q)) return faq.deliverables;
  if (/write|description|don'?t know what/.test(q)) return faq.description;
  return null;
}

// Plain, labelled summary of the current draft for the AI helpers. Raw JSON
// made the model misread per-creator budget as a total; explicit labels don't.
export function describeDraftForAi(d: RecommendInput['draft']): string {
  const lines = [
    d.title && `Campaign title: ${d.title}`,
    d.goal && `Goal: ${d.goal}`,
    d.category && `Creator type: ${d.category}`,
    d.platforms?.length && `Platforms: ${d.platforms.join(', ')}`,
    d.creatorsNeeded && `Number of creators: ${d.creatorsNeeded}`,
    d.budgetMax ? `Budget PER CREATOR (each creator is paid this): Rs. ${d.budgetMin && d.budgetMin !== d.budgetMax ? `${d.budgetMin}–${d.budgetMax}` : d.budgetMax}` : null,
    d.budgetMax && d.creatorsNeeded ? `Total budget (all creators): about Rs. ${d.budgetMax * d.creatorsNeeded}` : null,
    d.locations?.length && `Locations: ${d.locations.map((l) => l.name).join(', ')}`,
    d.locationType && `Creators ${d.locationType === 'ONSITE' ? 'must visit the business' : 'can create content remotely'}`,
    d.deliverableItems?.length && `Deliverables per creator: ${d.deliverableItems.map((i) => `${i.quantity}× ${i.type}${i.platform ? ` on ${i.platform}` : ''}`).join(', ')}`,
    d.deadline && `Finish by: ${d.deadline.slice(0, 10)}`,
    d.description && `Description: ${d.description}`,
  ].filter(Boolean);
  return lines.length ? lines.join('\n') : 'Nothing filled in yet.';
}
