// Pure competition rules — no DB, no I/O — so every validation and status
// derivation the service relies on is unit-testable on its own
// (competition.rules.test.ts). The service turns returned problems into
// AppErrors; the web client mirrors the same checks for inline feedback.

export const MAX_STAGES = 10;
export const MAX_PRIZES = 50;
export const MAX_PRIZE_RECIPIENTS = 100;
export const MAX_CRITERIA = 10;
export const SCORE_MAX = 10;

export type SubmissionMethod = 'VIDEO_UPLOAD' | 'EXTERNAL_LINK';
export type PrizeKind = 'PLACEMENT' | 'SPECIAL';

export interface ScheduleInput {
  publishAt?: Date | null;
  registrationOpensAt: Date;
  registrationDeadline: Date;
  startsAt: Date;
  endsAt: Date;
}

export interface StageScheduleInput {
  name: string;
  opensAt: Date;
  deadline: Date;
  advanceLimit?: number | null;
  allowedMethods: SubmissionMethod[];
  videoMinSec?: number | null;
  videoMaxSec?: number | null;
}

export interface Problem {
  field: string;
  message: string;
}

/**
 * Validates the competition's dates and the stage sequence together. Stages
 * are given in order; each must open after the previous one's deadline (so the
 * organizer has a review window) and sit inside the competition's start/end.
 */
export function validateSchedule(c: ScheduleInput, stages: StageScheduleInput[]): Problem[] {
  const p: Problem[] = [];
  const t = (d: Date) => d.getTime();

  if (t(c.registrationDeadline) <= t(c.registrationOpensAt)) {
    p.push({ field: 'registrationDeadline', message: 'Registration deadline must be after registration opens' });
  }
  if (t(c.endsAt) <= t(c.startsAt)) {
    p.push({ field: 'endsAt', message: 'Competition end must be after its start' });
  }
  if (t(c.registrationDeadline) > t(c.endsAt)) {
    p.push({ field: 'registrationDeadline', message: 'Registration must close before the competition ends' });
  }
  if (c.publishAt && t(c.publishAt) > t(c.registrationDeadline)) {
    p.push({ field: 'publishAt', message: 'Publication must happen before registration closes' });
  }

  if (stages.length === 0) {
    p.push({ field: 'stages', message: 'Add at least one stage' });
  }
  if (stages.length > MAX_STAGES) {
    p.push({ field: 'stages', message: `A competition can have at most ${MAX_STAGES} stages` });
  }

  stages.forEach((s, i) => {
    const f = `stages.${i}`;
    if (!s.name.trim()) p.push({ field: `${f}.name`, message: `Stage ${i + 1} needs a name` });
    if (t(s.deadline) <= t(s.opensAt)) {
      p.push({ field: `${f}.deadline`, message: `${s.name || `Stage ${i + 1}`}: deadline must be after submissions open` });
    }
    if (t(s.opensAt) < t(c.startsAt)) {
      p.push({ field: `${f}.opensAt`, message: `${s.name || `Stage ${i + 1}`}: cannot open before the competition starts` });
    }
    if (i === 0 && t(s.opensAt) < t(c.registrationOpensAt)) {
      p.push({ field: `${f}.opensAt`, message: 'The first stage cannot open before registration opens' });
    }
    if (t(s.deadline) > t(c.endsAt)) {
      p.push({ field: `${f}.deadline`, message: `${s.name || `Stage ${i + 1}`}: deadline must be on or before the competition end` });
    }
    if (i > 0 && t(s.opensAt) < t(stages[i - 1].deadline)) {
      p.push({ field: `${f}.opensAt`, message: `${s.name || `Stage ${i + 1}`}: must open after the previous stage's deadline` });
    }
    if (!s.allowedMethods.length) {
      p.push({ field: `${f}.allowedMethods`, message: `${s.name || `Stage ${i + 1}`}: allow at least one submission method` });
    }
    if (s.videoMinSec != null && s.videoMaxSec != null && s.videoMinSec > s.videoMaxSec) {
      p.push({ field: `${f}.videoMaxSec`, message: `${s.name || `Stage ${i + 1}`}: maximum duration must be at least the minimum` });
    }
    const isFinal = i === stages.length - 1;
    if (!isFinal && s.advanceLimit != null) {
      if (!Number.isInteger(s.advanceLimit) || s.advanceLimit < 1) {
        p.push({ field: `${f}.advanceLimit`, message: `${s.name || `Stage ${i + 1}`}: advancement limit must be a whole number of at least 1` });
      }
      const prevLimit = i > 0 ? stages[i - 1].advanceLimit : null;
      if (prevLimit != null && s.advanceLimit > prevLimit) {
        p.push({ field: `${f}.advanceLimit`, message: `${s.name || `Stage ${i + 1}`}: cannot advance more creators than the previous stage let in` });
      }
    }
  });

  return p;
}

export interface PrizeInput {
  kind: PrizeKind;
  title: string;
  amount?: number | null;
  recipientCount: number;
}

export function validatePrizes(prizes: PrizeInput[]): Problem[] {
  const p: Problem[] = [];
  if (prizes.length > MAX_PRIZES) p.push({ field: 'prizes', message: `At most ${MAX_PRIZES} prize categories` });
  prizes.forEach((z, i) => {
    if (!z.title.trim()) p.push({ field: `prizes.${i}.title`, message: `Prize ${i + 1} needs a title` });
    if (!Number.isInteger(z.recipientCount) || z.recipientCount < 1 || z.recipientCount > MAX_PRIZE_RECIPIENTS) {
      p.push({ field: `prizes.${i}.recipientCount`, message: `${z.title || `Prize ${i + 1}`}: recipients must be between 1 and ${MAX_PRIZE_RECIPIENTS}` });
    }
    if (z.amount != null && (!Number.isFinite(z.amount) || z.amount < 0)) {
      p.push({ field: `prizes.${i}.amount`, message: `${z.title || `Prize ${i + 1}`}: amount cannot be negative` });
    }
  });
  return p;
}

export interface Criterion {
  key: string;
  label: string;
  weight: number;
}

export function validateCriteria(scoringEnabled: boolean, criteria: Criterion[]): Problem[] {
  if (!scoringEnabled) return [];
  const p: Problem[] = [];
  if (criteria.length === 0) p.push({ field: 'judgingCriteria', message: 'Add at least one judging criterion, or turn scoring off' });
  if (criteria.length > MAX_CRITERIA) p.push({ field: 'judgingCriteria', message: `At most ${MAX_CRITERIA} criteria` });
  const keys = new Set<string>();
  criteria.forEach((c, i) => {
    if (!c.label.trim()) p.push({ field: `judgingCriteria.${i}.label`, message: `Criterion ${i + 1} needs a name` });
    if (!Number.isInteger(c.weight) || c.weight < 1) p.push({ field: `judgingCriteria.${i}.weight`, message: `${c.label || `Criterion ${i + 1}`}: weight must be a whole number of at least 1` });
    if (keys.has(c.key)) p.push({ field: `judgingCriteria.${i}.key`, message: 'Criteria must be unique' });
    keys.add(c.key);
  });
  const total = criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  if (criteria.length && total !== 100) p.push({ field: 'judgingCriteria', message: `Criterion weights must total 100 (currently ${total})` });
  return p;
}

/**
 * Weighted total on a 0–100 scale: each criterion is scored 0–SCORE_MAX and
 * contributes weight × score/SCORE_MAX. Returns null unless every criterion has
 * a valid score — a half-scored entry has no meaningful total.
 */
export function computeTotalScore(criteria: Criterion[], scores: Record<string, number> | null | undefined): number | null {
  if (!scores || criteria.length === 0) return null;
  let total = 0;
  for (const c of criteria) {
    const v = scores[c.key];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > SCORE_MAX) return null;
    total += (c.weight * v) / SCORE_MAX;
  }
  return Math.round(total * 100) / 100;
}

/** Checks a scores object only uses known keys and in-range values. */
export function validateScores(criteria: Criterion[], scores: Record<string, number>): string | null {
  const known = new Set(criteria.map((c) => c.key));
  for (const [k, v] of Object.entries(scores)) {
    if (!known.has(k)) return 'Unknown judging criterion';
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > SCORE_MAX) return `Scores must be between 0 and ${SCORE_MAX}`;
  }
  return null;
}

/**
 * Advancement publish check. A fixed limit caps the selection (fewer is
 * allowed — e.g. not enough strong entries — and the UI warns); at least one
 * creator must advance, otherwise the organizer should close the competition.
 */
export function validateAdvanceSelection(selected: number, advanceLimit: number | null | undefined): string | null {
  if (selected < 1) return 'Select at least one creator to advance';
  if (advanceLimit != null && selected > advanceLimit) return `This stage advances at most ${advanceLimit} creators — you selected ${selected}`;
  return null;
}

export interface AwardPrize {
  id: string;
  kind: PrizeKind;
  title: string;
  recipientCount: number;
}

export interface AwardAssignment {
  prizeId: string;
  participantId: string;
}

/**
 * Final award validation:
 *  - only eligible finalists can receive a prize;
 *  - a prize can't exceed its advertised recipient count;
 *  - the same prize can't go to the same creator twice;
 *  - a creator can hold at most one PLACEMENT prize (no "Winner + 1st runner-up");
 *  - with onePrizePerCreator, a creator can hold at most one prize of any kind.
 */
export function validateAwards(
  prizes: AwardPrize[],
  assignments: AwardAssignment[],
  eligibleParticipantIds: Set<string>,
  onePrizePerCreator: boolean,
): string[] {
  const errors: string[] = [];
  const byId = new Map(prizes.map((z) => [z.id, z]));
  const perPrize = new Map<string, number>();
  const pairs = new Set<string>();
  const perCreator = new Map<string, number>();
  const placementPerCreator = new Map<string, number>();

  for (const a of assignments) {
    const prize = byId.get(a.prizeId);
    if (!prize) { errors.push('Unknown prize'); continue; }
    if (!eligibleParticipantIds.has(a.participantId)) { errors.push(`${prize.title}: only finalists can receive a prize`); continue; }
    const pair = `${a.prizeId}:${a.participantId}`;
    if (pairs.has(pair)) { errors.push(`${prize.title}: the same creator is assigned twice`); continue; }
    pairs.add(pair);
    perPrize.set(a.prizeId, (perPrize.get(a.prizeId) ?? 0) + 1);
    perCreator.set(a.participantId, (perCreator.get(a.participantId) ?? 0) + 1);
    if (prize.kind === 'PLACEMENT') placementPerCreator.set(a.participantId, (placementPerCreator.get(a.participantId) ?? 0) + 1);
  }

  for (const [prizeId, n] of perPrize) {
    const prize = byId.get(prizeId)!;
    if (n > prize.recipientCount) errors.push(`${prize.title}: at most ${prize.recipientCount} recipient${prize.recipientCount === 1 ? '' : 's'}`);
  }
  if ([...placementPerCreator.values()].some((n) => n > 1)) errors.push('A creator cannot hold more than one ranking');
  if (onePrizePerCreator && [...perCreator.values()].some((n) => n > 1)) errors.push('This competition allows only one prize per creator');

  return Array.from(new Set(errors));
}

// ── Creator-facing status ────────────────────────────────────────────────────

export type CreatorCompetitionStatus =
  | 'JOINED'
  | 'SUBMISSION_REQUIRED'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'NO_SUBMISSION'
  | 'ADVANCED'
  | 'FINALIST'
  | 'NOT_SELECTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'WITHDRAWN';

export interface StatusInput {
  competitionStatus: string;
  participantStatus: 'ACTIVE' | 'NOT_SELECTED' | 'WITHDRAWN';
  currentStageOrder: number;
  stageCount: number;
  /** Status of the stage at currentStageOrder (undefined if missing). */
  currentStageStatus?: string;
  submittedToCurrentStage: boolean;
}

/**
 * The single label a creator sees for their place in a competition. Never
 * reads draft decisions — callers pass only published progression (the
 * participant row only changes on publish).
 */
export function creatorStatus(s: StatusInput): CreatorCompetitionStatus {
  if (s.participantStatus === 'WITHDRAWN') return 'WITHDRAWN';
  if (s.competitionStatus === 'CANCELLED') return 'CANCELLED';
  if (s.participantStatus === 'NOT_SELECTED') return 'NOT_SELECTED';
  if (s.competitionStatus === 'COMPLETED') return 'COMPLETED';

  const isFinalStage = s.currentStageOrder >= s.stageCount;
  const advanced = s.currentStageOrder > 1;

  switch (s.currentStageStatus) {
    case 'OPEN':
      return s.submittedToCurrentStage ? 'SUBMITTED' : 'SUBMISSION_REQUIRED';
    case 'UNDER_REVIEW':
    case 'SELECTION_PENDING':
    case 'RESULTS_PUBLISHED':
    case 'CLOSED':
      if (!s.submittedToCurrentStage) return 'NO_SUBMISSION';
      return isFinalStage && s.stageCount > 1 ? 'FINALIST' : 'UNDER_REVIEW';
    case 'UPCOMING':
    default:
      if (!advanced) return 'JOINED';
      return isFinalStage ? 'FINALIST' : 'ADVANCED';
  }
}

/** Is registration open right now, ignoring participant-specific checks? */
export function registrationOpen(c: { status: string; suspendedAt: Date | null; registrationOpensAt: Date; registrationDeadline: Date }, now = new Date()): boolean {
  return c.status === 'ACTIVE' && !c.suspendedAt && c.registrationOpensAt <= now && now < c.registrationDeadline;
}

// ── Lifecycle transition tables ─────────────────────────────────────────────
// Backend-enforced; the service checks every organizer action against these.

export const COMPETITION_TRANSITIONS: Record<string, string[]> = {
  // Organizer submits; only an admin decision moves it past PENDING_REVIEW.
  DRAFT:             ['PENDING_REVIEW', 'CANCELLED'],
  PENDING_REVIEW:    ['DRAFT', 'SCHEDULED', 'ACTIVE', 'CHANGES_REQUESTED', 'REJECTED', 'CANCELLED'],
  CHANGES_REQUESTED: ['PENDING_REVIEW', 'CANCELLED'],
  REJECTED:          ['PENDING_REVIEW', 'CANCELLED'],
  // Approved but not yet live: a material edit sends it back to review.
  SCHEDULED:         ['PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'CANCELLED'],
  ACTIVE:            ['PAUSED', 'AWAITING_RESULTS', 'CANCELLED'],
  PAUSED:            ['ACTIVE', 'SCHEDULED', 'CANCELLED'],
  AWAITING_RESULTS:  ['ACTIVE', 'COMPLETED', 'CANCELLED'],
  // Reopening a completed competition is a separate audited action (reopenResults).
  COMPLETED:         ['AWAITING_RESULTS'],
  CANCELLED:         [],
};

/** Never shown to creators or the public (owner and admins only). */
export const UNPUBLISHED_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'SCHEDULED'];

/** Statuses where the organizer edits the whole configuration freely (nobody can have joined). */
export const PRE_LAUNCH_EDITABLE = ['DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED'];

/**
 * Edits to these on an approved competition need admin re-approval; the
 * approved version stays in effect meanwhile. Everything else (cover, brief,
 * contact info, documents…) applies immediately.
 */
export const REVIEWED_FIELDS = ['rules', 'eligibility', 'prizes'] as const;
export type ReviewedField = (typeof REVIEWED_FIELDS)[number];

export const MIN_REVIEW_FEEDBACK = 10;

/** Comparable form of a prize list — ignores ids/positions/whitespace so a no-op save isn't a "change". */
export function prizeSignature(prizes: Array<{ kind: string; title: string; description?: string | null; amount?: number | null; currency?: string; recipientCount: number; notes?: string | null }>): string {
  return JSON.stringify(prizes.map((p) => [p.kind, p.title.trim(), (p.description ?? '').trim(), p.amount ?? null, p.currency ?? 'NPR', p.recipientCount, (p.notes ?? '').trim()]));
}

export function canTransition(from: string, to: string): boolean {
  return (COMPETITION_TRANSITIONS[from] ?? []).includes(to);
}

/** Statuses in which creators/organizers can run ordinary workflow actions. */
export function isWorkflowOpen(status: string): boolean {
  return status === 'ACTIVE' || status === 'AWAITING_RESULTS';
}
