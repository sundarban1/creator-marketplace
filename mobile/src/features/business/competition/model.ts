import type { CompetitionInput, CompetitionStageInput } from '@/services/competition';

// Form model for the native competition builder — same defaults, steps and
// client-side checks as web/src/app/competitions/CompetitionFormPage.tsx.
// The server re-validates everything; these only stop "Continue" on the
// step that owns the problem.

export type FormStep = 'basics' | 'rules' | 'schedule' | 'stages' | 'prizes' | 'judging' | 'review';
export const FORM_STEPS: Exclude<FormStep, 'review'>[] = ['basics', 'rules', 'schedule', 'stages', 'prizes', 'judging'];
export const ALL_STEPS: FormStep[] = [...FORM_STEPS, 'review'];

export const MAX_STAGES = 10;
export const MAX_OBJECTIVES = 3;
export const MAX_TAGS = 10;

export const OBJECTIVE_OPTIONS = [
  'Brand Awareness', 'Product Promotion', 'Service Promotion', 'Social Awareness', 'Creative Content',
  'Audience Engagement', 'Sales & Conversions', 'Event Promotion', 'Talent Showcase', 'Community Engagement',
  'Social Impact', 'Environmental Awareness', 'Education & Awareness',
];
export const FORMAT_OPTIONS = [
  'Short-Form Video', 'Long-Form Video', 'Product Review', 'Promotional Video', 'Storytelling', 'Comedy / Skit',
  'Educational Content', 'Vlog', 'Tutorial / How-To', 'Unboxing', 'Before & After', 'Photography',
  'Graphic Design', 'Animation', 'User-Generated Content (UGC)',
];
export const SKILL_OPTIONS = [
  'Video Editing', 'Videography', 'Photography', 'Acting', 'Writing', 'Storytelling',
  'Graphic Design', 'Animation', 'Voiceover', 'Creativity', 'Presentation', 'Directing',
];
export const CRITERIA_SUGGESTIONS = ['Creativity', 'Storytelling', 'Production quality', 'Brand fit', 'Originality', 'Audience engagement'];

// Objectives are one text column on the server; each picked objective is a line.
export const parseObjectives = (s: string | null | undefined): string[] =>
  (s ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
export const serializeObjectives = (list: string[]): string | null => (list.length ? list.join('\n') : null);

// ── Nepal time ───────────────────────────────────────────────────────────────
// Competitions are scheduled in Nepal time (UTC+5:45) whatever the phone's
// timezone is, matching web. A "wall" date is the NPT clock reading stored in
// a Date's UTC fields.

const NPT_OFFSET_MS = (5 * 60 + 45) * 60_000;
export const toNptWall = (iso: string): Date => new Date(new Date(iso).getTime() + NPT_OFFSET_MS);
export const fromNptWall = (wall: Date): string => new Date(wall.getTime() - NPT_OFFSET_MS).toISOString();

/** ISO instant `hours` from now, rounded up to the next whole NPT hour. */
function isoIn(hours: number): string {
  const wall = toNptWall(new Date(Date.now() + hours * 3_600_000).toISOString());
  wall.setUTCMinutes(0, 0, 0);
  wall.setUTCHours(wall.getUTCHours() + 1);
  return fromNptWall(wall);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "18 Oct 2026, 3:00 pm" in Nepal time (no "NPT" label, same as web). */
export function formatNpt(iso: string | null | undefined, withTime = true): string {
  if (!iso) return '—';
  const w = toNptWall(iso);
  const date = `${w.getUTCDate()} ${MONTHS[w.getUTCMonth()]} ${w.getUTCFullYear()}`;
  if (!withTime) return date;
  const h = w.getUTCHours();
  const m = String(w.getUTCMinutes()).padStart(2, '0');
  return `${date}, ${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`;
}

// ── Defaults ─────────────────────────────────────────────────────────────────

export function emptyStage(opensH: number, deadlineH: number, name = ''): CompetitionStageInput {
  return {
    name, description: null, brief: null, requirements: null, opensAt: isoIn(opensH), deadline: isoIn(deadlineH), advanceLimit: null,
    // Google Drive links only for now (direct video upload is hidden on web too).
    allowedMethods: ['EXTERNAL_LINK'], videoMinSec: null, videoMaxSec: null,
  };
}

export function emptyForm(): CompetitionInput {
  return {
    title: '', description: '', objectives: null, coverImageUrl: null, rules: '', eligibility: null, contentFormats: [], skills: [],
    submissionInstructions: null, videoMinSec: null, videoMaxSec: null, contactInstructions: null,
    resultsVisibility: 'PUBLIC', submissionMode: 'PER_STAGE',
    registrationOpensAt: isoIn(1), registrationDeadline: isoIn(24 * 7), startsAt: isoIn(1), endsAt: isoIn(24 * 30),
    allowSubmissionEdits: true, onePrizePerCreator: true, scoringEnabled: false, judgingCriteria: [],
    stages: [emptyStage(1, 24 * 10, 'Round 1')],
    prizes: [],
    prizePaymentMethod: 'DIRECT', cashPrizePool: null, paymentTermsAccepted: false,
  };
}

/** SINGLE mode: stage 2+ only shortlists entries already submitted (mirrors the server). */
export const isReviewRound = (f: Pick<CompetitionInput, 'submissionMode'>, index: number) => f.submissionMode === 'SINGLE' && index > 0;

/** Review rounds get derived dates (entry deadline → competition end), as the server stores them. */
function withDerivedStageDates(f: CompetitionInput): CompetitionStageInput[] {
  if (f.submissionMode !== 'SINGLE' || f.stages.length < 2) return f.stages;
  const entryDeadline = f.stages[0].deadline;
  const end = new Date(f.endsAt) > new Date(entryDeadline) ? f.endsAt : entryDeadline;
  return f.stages.map((s, i) => (i === 0 ? s : { ...s, opensAt: entryDeadline, deadline: end }));
}

const keyFor = (label: string, i: number) =>
  (label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'criterion') + `_${i + 1}`;

/** Σ amount × recipients over cash prizes, in NPR (the pool the server expects). */
export const cashPrizeTotal = (prizes: CompetitionInput['prizes']): number =>
  prizes.reduce((sum, p) => sum + (Number(p.amount) || 0) * Math.max(1, Number(p.recipientCount) || 1), 0);

/** The body sent to the API: criteria keys filled in, numbers coerced, review-round dates derived. */
export function toPayload(f: CompetitionInput): CompetitionInput {
  // The pool is always the sum of the cash prizes; no cash prizes → no payment setup.
  const pool = cashPrizeTotal(f.prizes);
  return {
    ...f,
    cashPrizePool: pool > 0 ? pool : null,
    prizePaymentMethod: pool > 0 ? f.prizePaymentMethod ?? null : null,
    paymentTermsAccepted: pool > 0 ? !!f.paymentTermsAccepted : false,
    judgingCriteria: f.judgingCriteria.map((c, i) => ({ ...c, key: c.key || keyFor(c.label, i), weight: Number(c.weight) || 0 })),
    prizes: f.prizes.map((p) => ({ ...p, amount: p.amount == null || Number.isNaN(Number(p.amount)) ? null : Number(p.amount), recipientCount: Math.max(1, Number(p.recipientCount) || 1) })),
    stages: withDerivedStageDates(f).map((s, i) => ({ ...s, advanceLimit: i === f.stages.length - 1 ? null : s.advanceLimit ? Number(s.advanceLimit) : null })),
  };
}

// ── Validation ───────────────────────────────────────────────────────────────

type TFn = (key: string, vars?: Record<string, string | number>) => string;

export function validateStep(f: CompetitionInput, step: Exclude<FormStep, 'review'>, t: TFn): string[] {
  const e: string[] = [];
  const ts = (s: string) => new Date(s).getTime();
  switch (step) {
    case 'basics':
      if (f.title.trim().length < 3) e.push(t('competition.vTitle'));
      if (f.description.trim().length < 10) e.push(t('competition.vDescription'));
      break;
    case 'rules':
      if (f.rules.trim().length < 10) e.push(t('competition.vRules'));
      if (f.videoMinSec && f.videoMaxSec && f.videoMinSec > f.videoMaxSec) e.push(t('competition.vVideoRange'));
      break;
    case 'schedule':
      if (ts(f.registrationDeadline) <= ts(f.registrationOpensAt)) e.push(t('competition.vRegistration'));
      if (ts(f.endsAt) <= ts(f.startsAt)) e.push(t('competition.vEnd'));
      if (ts(f.registrationDeadline) > ts(f.endsAt)) e.push(t('competition.vRegBeforeEnd'));
      break;
    case 'stages':
      f.stages.forEach((s, i) => {
        const n = s.name || t('competition.stageN', { n: i + 1 });
        if (!s.name.trim()) e.push(t('competition.vStageName', { n: i + 1 }));
        if (isReviewRound(f, i)) return; // no dates of its own
        if (ts(s.deadline) <= ts(s.opensAt)) e.push(t('competition.vStageDeadline', { name: n }));
        if (ts(s.opensAt) < ts(f.startsAt)) e.push(t('competition.vStageStart', { name: n }));
        if (ts(s.deadline) > ts(f.endsAt)) e.push(t('competition.vStageEnd', { name: n }));
        if (i > 0 && ts(s.opensAt) < ts(f.stages[i - 1].deadline)) e.push(t('competition.vStageOrder', { name: n }));
      });
      break;
    case 'prizes':
      f.prizes.forEach((p, i) => { if (!p.title.trim()) e.push(t('competition.vPrizeTitle', { n: i + 1 })); });
      if (cashPrizeTotal(f.prizes) > 0) {
        if (!f.prizePaymentMethod) e.push(t('competition.vPayMethod'));
        else if (!f.paymentTermsAccepted) e.push(t('competition.vPayTerms'));
      }
      break;
    case 'judging':
      if (f.scoringEnabled) {
        const total = f.judgingCriteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
        if (!f.judgingCriteria.length || total !== 100) e.push(t('competition.vWeights', { total }));
      }
      break;
  }
  return Array.from(new Set(e));
}

export function validateAll(f: CompetitionInput, t: TFn): { step: Exclude<FormStep, 'review'>; message: string }[] {
  return FORM_STEPS.flatMap((step) => validateStep(f, step, t).map((message) => ({ step, message })));
}
