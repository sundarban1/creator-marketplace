import type {
  GuidedAiDraft as AiDraft, CampaignBrief, CampaignLocation, DeliverableItem, GuidedDraftPayload, GuidedAiContext,
  LocationScope, GuidedCampaign as MyCampaign, Provenance,
} from '@/services/guidedCampaign';
import type { CampaignRulesInput, CampaignStep } from '../utils/campaignRules';
import { countFilledSections } from './briefSections';

type UpdateCampaignInput = Record<string, unknown>;

// The guided creator's form state and every conversion it needs — pure, no
// React, so create / resume / edit / autosave all agree on one shape.
// Same logic as web/src/app/business/guided/guidedModel.ts (keep in step).

export type GuidedStep = 'idea' | 'clarify' | 'basics' | 'creators' | 'content' | 'budget' | 'requirements' | 'review';
export const FLOW_STEPS: CampaignStep[] = ['basics', 'creators', 'content', 'budget'];

export interface GuidedForm {
  aiPrompt: string;
  aiGenerated: boolean;
  title: string;
  description: string;
  goal: string;
  category: string;
  platforms: string[];
  creatorsNeeded: number | null;
  // null = not answered yet ("Should creators visit you?")
  locationType: 'ONSITE' | 'REMOTE' | null;
  locationScope: LocationScope | null;
  locations: CampaignLocation[];
  deliverableItems: DeliverableItem[];
  budgetMin: number;
  budgetMax: number;
  budgetRateType: 'FIXED' | 'RANGE';
  budgetInputType: 'PER_CREATOR' | 'TOTAL';
  paymentType: string;
  // yyyy-mm-dd (date inputs); '' = not set
  deadline: string;
  startDate: string;
  applicationDeadline: string;
  minFollowers: number;
  hashtags: string[];
  brief: CampaignBrief;
  featureImageUrl: string;
  aiProvenance: Record<string, Provenance>;
}

export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export const inDays = (n: number) => isoDate(new Date(Date.now() + n * 86_400_000));
const toDateInput = (iso?: string | null) => (iso ? isoDate(new Date(iso)) : '');
// End of the chosen local day, so "finish by Oct 20" includes the 20th.
const endOfDayIso = (d: string) => (d ? new Date(`${d}T23:59:00`).toISOString() : undefined);
const startOfDayIso = (d: string) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);

export function emptyForm(): GuidedForm {
  return {
    aiPrompt: '', aiGenerated: false, title: '', description: '', goal: '', category: '', platforms: [],
    creatorsNeeded: null, locationType: null, locationScope: null, locations: [], deliverableItems: [],
    budgetMin: 0, budgetMax: 0, budgetRateType: 'FIXED', budgetInputType: 'PER_CREATOR', paymentType: 'Fixed Fee',
    deadline: inDays(14), startDate: '', applicationDeadline: '', minFollowers: 0, hashtags: [], brief: {},
    featureImageUrl: '', aiProvenance: {},
  };
}

// True once the business has entered anything at all — an untouched form is
// never worth a server draft.
export function hasAnyInput(form: GuidedForm): boolean {
  return JSON.stringify(form) !== JSON.stringify(emptyForm());
}

export function formFromCampaign(c: MyCampaign): GuidedForm {
  const base = emptyForm();
  return {
    ...base,
    aiPrompt: c.aiPrompt ?? '',
    aiGenerated: !!c.aiGenerated,
    title: c.title === 'Untitled campaign' ? '' : c.title,
    description: c.description ?? '',
    goal: c.goals?.[0] ?? '',
    category: c.category ?? '',
    platforms: c.platforms ?? [],
    creatorsNeeded: c.creatorsNeeded ?? null,
    // A brand-new autosaved draft defaults ONSITE server-side; "not answered"
    // is recovered from the brief when the business never chose.
    locationType: c.brief?.content?.creatorsVisit === null && !(c.locations?.length) ? null : (c.locationType ?? null),
    locationScope: c.locationScope ?? null,
    locations: c.locations?.length ? c.locations : c.location ? [{ name: c.location }] : [],
    deliverableItems: c.deliverableItems ?? [],
    budgetMin: c.budgetMin ?? 0,
    budgetMax: c.budgetMax ?? 0,
    budgetRateType: c.budgetRateType ?? 'FIXED',
    budgetInputType: c.budgetInputType ?? 'PER_CREATOR',
    paymentType: c.paymentType ?? 'Fixed Fee',
    deadline: toDateInput(c.deadline) || base.deadline,
    startDate: toDateInput(c.startDate),
    applicationDeadline: toDateInput(c.applicationDeadline),
    minFollowers: c.minFollowers ?? 0,
    hashtags: c.hashtags ?? [],
    brief: c.brief ?? {},
    featureImageUrl: c.featureImageUrl ?? '',
    aiProvenance: c.aiProvenance ?? {},
  };
}

// Applies an AI draft onto the form. Never overwrites anything the business
// already typed themselves (provenance USER) — "never ask twice / never lose
// what they entered" (§27).
export function applyAiDraft(prev: GuidedForm, d: AiDraft, prompt: string): GuidedForm {
  const g = d.guided;
  const userSet = (k: string) => prev.aiProvenance[k] === 'USER';
  const pick = <T,>(k: string, aiValue: T, current: T): T => (userSet(k) ? current : aiValue);
  const budgetKnown = d.budgetMax > 0 && d.budgetStatus !== 'AMBIGUOUS';
  return {
    ...prev,
    aiPrompt: prompt,
    aiGenerated: true,
    title: pick('title', d.title, prev.title),
    description: pick('description', d.description, prev.description),
    goal: pick('goal', d.goal ?? prev.goal, prev.goal),
    category: pick('category', d.category, prev.category),
    platforms: pick('platforms', d.platform ? [d.platform] : prev.platforms, prev.platforms),
    creatorsNeeded: pick('creatorsNeeded', d.creatorsNeeded || prev.creatorsNeeded, prev.creatorsNeeded),
    locationType: pick('locationType', g?.locationType ?? prev.locationType, prev.locationType),
    locationScope: pick('locations', g?.locationScope ?? prev.locationScope, prev.locationScope),
    locations: pick('locations', g?.locations ?? prev.locations, prev.locations),
    deliverableItems: pick('deliverableItems', g?.deliverableItems ?? prev.deliverableItems, prev.deliverableItems),
    budgetMin: userSet('budget') ? prev.budgetMin : budgetKnown ? d.budgetMin : prev.budgetMin,
    budgetMax: userSet('budget') ? prev.budgetMax : budgetKnown ? d.budgetMax : prev.budgetMax,
    budgetRateType: userSet('budget') ? prev.budgetRateType : budgetKnown ? (d.budgetRateType || 'FIXED') : prev.budgetRateType,
    budgetInputType: userSet('budget') ? prev.budgetInputType : budgetKnown ? 'PER_CREATOR' : prev.budgetInputType,
    deadline: pick('deadline', g?.deadline ? toDateInput(g.deadline) : prev.deadline, prev.deadline),
    startDate: pick('startDate', g?.startDate ? toDateInput(g.startDate) : prev.startDate, prev.startDate),
    minFollowers: pick('minFollowers', g?.minFollowers ?? prev.minFollowers, prev.minFollowers),
    hashtags: pick('hashtags', d.hashtags?.length ? d.hashtags : prev.hashtags, prev.hashtags),
    brief: mergeBrief(g?.brief ?? {}, prev.brief),
    featureImageUrl: prev.featureImageUrl || d.featureImageUrl || '',
    aiProvenance: { ...(g?.aiProvenance ?? {}), ...Object.fromEntries(Object.entries(prev.aiProvenance).filter(([, v]) => v === 'USER')) },
  };
}

// Business-entered brief values win over AI ones, section by section.
function mergeBrief(ai: CampaignBrief, mine: CampaignBrief): CampaignBrief {
  const out: CampaignBrief = { ...ai };
  for (const [k, v] of Object.entries(mine) as [keyof CampaignBrief, unknown][]) {
    if (v && typeof v === 'object' && !Array.isArray(v)) (out as Record<string, unknown>)[k] = { ...(ai[k] as object ?? {}), ...(v as object) };
    else if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

export function toPayload(f: GuidedForm, step: GuidedStep | null): GuidedDraftPayload {
  const visitUnknown = f.locationType == null;
  return {
    title: f.title.trim() || undefined,
    description: f.description,
    category: f.category || undefined,
    goals: f.goal ? [f.goal] : [],
    platforms: f.platforms.slice(0, 3),
    creatorsNeeded: f.creatorsNeeded ?? undefined,
    // Unanswered visit is stored as REMOTE + brief.content.creatorsVisit=null
    // so a draft never trips the "where should creators visit?" rule early.
    locationType: f.locationType ?? 'REMOTE',
    locationScope: f.locationScope ?? (f.locations.length ? 'SPECIFIC' : undefined),
    locations: f.locationScope === 'SPECIFIC' || f.locationType === 'ONSITE' ? f.locations : [],
    deliverableItems: f.deliverableItems,
    budgetMin: f.budgetMin,
    budgetMax: f.budgetMax,
    budgetRateType: f.budgetRateType,
    budgetInputType: f.budgetInputType,
    paymentType: f.paymentType,
    deadline: endOfDayIso(f.deadline),
    startDate: startOfDayIso(f.startDate),
    applicationDeadline: f.applicationDeadline ? endOfDayIso(f.applicationDeadline)! : null,
    minFollowers: f.minFollowers,
    hashtags: f.hashtags,
    brief: { ...f.brief, content: { ...(f.brief.content ?? {}), creatorsVisit: visitUnknown ? null : f.locationType === 'ONSITE' } },
    featureImageUrl: f.featureImageUrl || null,
    aiGenerated: f.aiGenerated,
    aiPrompt: f.aiPrompt || undefined,
    aiProvenance: f.aiProvenance,
    draftStep: step,
  };
}

export function toRulesInput(f: GuidedForm): CampaignRulesInput {
  return {
    title: f.title, description: f.description, category: f.category, platforms: f.platforms,
    creatorsNeeded: f.creatorsNeeded, deliverableItems: f.deliverableItems, paymentType: f.paymentType,
    budgetMin: f.budgetMin, budgetMax: f.budgetMax, deadline: endOfDayIso(f.deadline) ?? null,
    startDate: startOfDayIso(f.startDate), applicationDeadline: endOfDayIso(f.applicationDeadline) ?? null,
    locationType: f.locationType ?? 'REMOTE', locationScope: f.locationScope, locations: f.locations,
    minFollowers: f.minFollowers, briefSectionsFilled: countFilledSections(f.brief),
  };
}

export function toAiContext(f: GuidedForm): GuidedAiContext {
  return {
    title: f.title || undefined, description: f.description || undefined, category: f.category || undefined,
    goal: f.goal || undefined, platforms: f.platforms, creatorsNeeded: f.creatorsNeeded ?? undefined,
    budgetMin: f.budgetMin || undefined, budgetMax: f.budgetMax || undefined,
    locations: f.locations.map((l) => ({ name: l.name })), locationType: f.locationType ?? undefined,
    deliverableItems: f.deliverableItems.map((i) => ({ type: i.type, platform: i.platform ?? null, quantity: i.quantity })),
    deadline: f.deadline || undefined,
  };
}

// Editing a live campaign: send only what changed. The backend rejects locked
// fields (budget, location, deliverables…) once creators have applied — even
// unchanged — so an untouched field must never be resent.
export function diffForUpdate(initial: GuidedForm, next: GuidedForm): UpdateCampaignInput {
  const a = toPayload(initial, null) as Record<string, unknown>;
  const b = toPayload(next, null) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const skip = new Set(['draftStep', 'aiGenerated', 'aiPrompt', 'goals']);
  for (const k of Object.keys(b)) {
    if (skip.has(k)) continue;
    if (JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null)) out[k] = b[k];
  }
  // Budget fields travel together so the server re-derives totals consistently.
  if (['budgetMin', 'budgetMax', 'budgetRateType', 'budgetInputType'].some((k) => k in out)) {
    for (const k of ['budgetMin', 'budgetMax', 'budgetRateType', 'budgetInputType']) out[k] = b[k];
  }
  if ('locations' in out || 'locationScope' in out) out.locationType = b.locationType;
  return out as UpdateCampaignInput;
}

// Which steps a business actually needs after the AI pass (§6 "don't force
// every campaign through every step"): a step appears only when something in
// it is missing, unclear, or blocking. Manual (no-AI) creation shows them all.
export function plannedSteps(missing: string[], blockingSteps: Set<CampaignStep>): CampaignStep[] {
  const need: Record<string, CampaignStep> = {
    location: 'basics', creatorsVisit: 'basics', creatorsNeeded: 'creators', platforms: 'creators',
    category: 'creators', deliverables: 'content', budget: 'budget', timeline: 'budget',
  };
  const wanted = new Set<CampaignStep>([...blockingSteps]);
  for (const m of missing) if (need[m]) wanted.add(need[m]);
  // Budget is always confirmed explicitly — it's money (AI never invents one).
  wanted.add('budget');
  return FLOW_STEPS.filter((s) => wanted.has(s));
}

// One-line "where" for the review summary.
export function locationSummary(f: GuidedForm, t: (k: string, v?: Record<string, string | number>) => string): string {
  if (f.locationType === 'ONSITE' || f.locationScope === 'SPECIFIC') {
    return f.locations.length ? f.locations.map((l) => l.name).join(' · ') : t('guided.locationNotSet');
  }
  if (f.locationScope === 'NATIONWIDE') return t('guided.scopeNationwide');
  return t('guided.scopeAnywhere');
}
