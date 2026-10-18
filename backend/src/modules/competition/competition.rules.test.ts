import { describe, it, expect } from 'vitest';
import {
  validateSchedule, validatePrizes, validateCriteria, computeTotalScore, validateAwards,
  validateAdvanceSelection, creatorStatus, canTransition, registrationOpen, prizeSignature, normalizeStageDates, isReviewRound, type StageScheduleInput,
} from './competition.rules';
import { validateSubmissionLink } from './competition.links';

const d = (day: number, hour = 12) => new Date(Date.UTC(2026, 10, day, hour));
const base = { registrationOpensAt: d(1), registrationDeadline: d(10), startsAt: d(1), endsAt: d(30) };
const stage = (opens: number, deadline: number, extra: Partial<StageScheduleInput> = {}): StageScheduleInput => ({
  name: `S${opens}`, opensAt: d(opens), deadline: d(deadline), allowedMethods: ['VIDEO_UPLOAD'], ...extra,
});

describe('validateSchedule', () => {
  it('accepts a single-round competition', () => {
    expect(validateSchedule(base, [stage(2, 12)])).toEqual([]);
  });

  it('accepts a configurable multi-stage progression', () => {
    expect(validateSchedule(base, [stage(2, 12, { advanceLimit: 20 }), stage(14, 18, { advanceLimit: 10 }), stage(20, 25)])).toEqual([]);
  });

  it('rejects deadlines before their opening dates', () => {
    const p = validateSchedule({ ...base, registrationDeadline: d(1, 6) }, [stage(5, 4)]);
    expect(p.map((x) => x.field)).toEqual(expect.arrayContaining(['registrationDeadline', 'stages.0.deadline']));
  });

  it('rejects overlapping stages and stages outside the competition window', () => {
    const p = validateSchedule(base, [stage(2, 12), stage(11, 31)]);
    expect(p.map((x) => x.field)).toEqual(expect.arrayContaining(['stages.1.opensAt', 'stages.1.deadline']));
  });

  it('rejects a later stage advancing more creators than the previous one', () => {
    const p = validateSchedule(base, [stage(2, 5, { advanceLimit: 10 }), stage(6, 8, { advanceLimit: 20 }), stage(9, 12)]);
    expect(p.some((x) => x.field === 'stages.1.advanceLimit')).toBe(true);
  });

  it('rejects having no stages', () => {
    expect(validateSchedule(base, []).some((x) => x.field === 'stages')).toBe(true);
  });
});

describe('single deadline (SINGLE mode)', () => {
  it('only treats stages after the first as review rounds', () => {
    expect([1, 2, 3].map((o) => isReviewRound('SINGLE', o))).toEqual([false, true, true]);
    expect(isReviewRound('PER_STAGE', 2)).toBe(false);
  });

  it('derives review-round dates from the entry deadline and competition end', () => {
    const out = normalizeStageDates('SINGLE', [stage(2, 12), stage(1, 1), stage(1, 1)], d(30));
    expect(out[0]).toEqual(stage(2, 12));
    expect(out.slice(1).map((s) => [s.opensAt, s.deadline])).toEqual([[d(12), d(30)], [d(12), d(30)]]);
  });

  it('leaves per-stage competitions untouched', () => {
    const stages = [stage(2, 12), stage(14, 18)];
    expect(normalizeStageDates('PER_STAGE', stages, d(30))).toBe(stages);
  });

  it('skips date checks for review rounds but still checks the entry stage and limits', () => {
    const stages = [stage(2, 12, { advanceLimit: 30 }), stage(1, 1, { advanceLimit: 10 }), stage(1, 1)];
    expect(validateSchedule(base, stages, 'SINGLE')).toEqual([]);
    expect(validateSchedule(base, stages, 'PER_STAGE').length).toBeGreaterThan(0);
    const bad = validateSchedule(base, [stage(2, 12, { advanceLimit: 10 }), stage(1, 1, { advanceLimit: 30 }), stage(1, 1)], 'SINGLE');
    expect(bad.map((x) => x.field)).toEqual(['stages.1.advanceLimit']);
  });
});

describe('prizes and judging', () => {
  it('validates prize recipients and amounts', () => {
    expect(validatePrizes([{ kind: 'PLACEMENT', title: 'Winner', amount: 10000, recipientCount: 1 }])).toEqual([]);
    expect(validatePrizes([{ kind: 'SPECIAL', title: '', amount: -1, recipientCount: 0 }])).toHaveLength(3);
  });

  it('requires criterion weights to total 100 when scoring is on', () => {
    const kolab = [
      { key: 'creativity', label: 'Creativity and originality', weight: 25 },
      { key: 'promotion', label: 'Kolab promotion', weight: 25 },
      { key: 'story', label: 'Storytelling', weight: 20 },
      { key: 'execution', label: 'Execution', weight: 15 },
      { key: 'cta', label: 'Call to action', weight: 15 },
    ];
    expect(validateCriteria(true, kolab)).toEqual([]);
    expect(validateCriteria(true, kolab.slice(1)).some((p) => /total 100/.test(p.message))).toBe(true);
    expect(validateCriteria(false, [])).toEqual([]);
  });

  it('computes a weighted 0–100 total only when every criterion is scored', () => {
    const c = [{ key: 'a', label: 'A', weight: 60 }, { key: 'b', label: 'B', weight: 40 }];
    expect(computeTotalScore(c, { a: 10, b: 5 })).toBe(80);
    expect(computeTotalScore(c, { a: 10 })).toBeNull();
    expect(computeTotalScore(c, { a: 11, b: 5 })).toBeNull();
  });
});

describe('advancement + awards', () => {
  it('caps the selection at the configured limit and requires at least one', () => {
    expect(validateAdvanceSelection(20, 20)).toBeNull();
    expect(validateAdvanceSelection(12, 20)).toBeNull();
    expect(validateAdvanceSelection(21, 20)).toMatch(/at most 20/);
    expect(validateAdvanceSelection(0, null)).toMatch(/at least one/);
    expect(validateAdvanceSelection(500, null)).toBeNull();
  });

  const prizes = [
    { id: 'win', kind: 'PLACEMENT' as const, title: 'Winner', recipientCount: 1 },
    { id: 'ru1', kind: 'PLACEMENT' as const, title: 'First runner-up', recipientCount: 1 },
    { id: 'con', kind: 'SPECIAL' as const, title: 'Consolation', recipientCount: 5 },
  ];
  const finalists = new Set(['p1', 'p2', 'p3']);

  it('accepts a valid assignment', () => {
    expect(validateAwards(prizes, [{ prizeId: 'win', participantId: 'p1' }, { prizeId: 'ru1', participantId: 'p2' }, { prizeId: 'con', participantId: 'p3' }], finalists, true)).toEqual([]);
  });

  it('rejects conflicting rankings even when stacking is allowed', () => {
    expect(validateAwards(prizes, [{ prizeId: 'win', participantId: 'p1' }, { prizeId: 'ru1', participantId: 'p1' }], finalists, false)).toContain('A creator cannot hold more than one ranking');
  });

  it('enforces one prize per creator when configured, but allows stacking a special prize otherwise', () => {
    const a = [{ prizeId: 'win', participantId: 'p1' }, { prizeId: 'con', participantId: 'p1' }];
    expect(validateAwards(prizes, a, finalists, true)).toContain('This competition allows only one prize per creator');
    expect(validateAwards(prizes, a, finalists, false)).toEqual([]);
  });

  it('rejects over-assigned prizes, duplicates and non-finalists', () => {
    expect(validateAwards(prizes, [{ prizeId: 'win', participantId: 'p1' }, { prizeId: 'win', participantId: 'p2' }], finalists, true).some((e) => /at most 1 recipient/.test(e))).toBe(true);
    expect(validateAwards(prizes, [{ prizeId: 'con', participantId: 'p1' }, { prizeId: 'con', participantId: 'p1' }], finalists, false).some((e) => /assigned twice/.test(e))).toBe(true);
    expect(validateAwards(prizes, [{ prizeId: 'win', participantId: 'zz' }], finalists, true).some((e) => /only finalists/.test(e))).toBe(true);
  });
});

describe('creatorStatus', () => {
  const s = (o: Partial<Parameters<typeof creatorStatus>[0]>) => creatorStatus({
    competitionStatus: 'ACTIVE', participantStatus: 'ACTIVE', currentStageOrder: 1, stageCount: 3,
    currentStageStatus: 'UPCOMING', submittedToCurrentStage: false, ...o,
  });

  it('walks a creator through the stages', () => {
    expect(s({})).toBe('JOINED');
    expect(s({ currentStageStatus: 'OPEN' })).toBe('SUBMISSION_REQUIRED');
    expect(s({ currentStageStatus: 'OPEN', submittedToCurrentStage: true })).toBe('SUBMITTED');
    expect(s({ currentStageStatus: 'SELECTION_PENDING', submittedToCurrentStage: true })).toBe('UNDER_REVIEW');
    expect(s({ currentStageOrder: 2 })).toBe('ADVANCED');
    expect(s({ currentStageOrder: 3 })).toBe('FINALIST');
    expect(s({ participantStatus: 'NOT_SELECTED' })).toBe('NOT_SELECTED');
    expect(s({ competitionStatus: 'COMPLETED', currentStageOrder: 3 })).toBe('COMPLETED');
  });

  it('does not eliminate a creator just for missing a deadline', () => {
    expect(s({ currentStageStatus: 'UNDER_REVIEW' })).toBe('NO_SUBMISSION');
  });

  it('never calls a single-stage entrant a finalist', () => {
    expect(s({ stageCount: 1, currentStageStatus: 'UNDER_REVIEW', submittedToCurrentStage: true })).toBe('UNDER_REVIEW');
  });
});

describe('prizeSignature', () => {
  it('ignores ids and whitespace but catches real changes', () => {
    const a = [{ kind: 'PLACEMENT', title: 'Winner ', amount: 10000, recipientCount: 1 }];
    expect(prizeSignature(a)).toBe(prizeSignature([{ ...a[0], title: 'Winner', id: 'x' } as never]));
    expect(prizeSignature(a)).not.toBe(prizeSignature([{ ...a[0], amount: 12000 }]));
  });
});

describe('lifecycle', () => {
  it('only allows defined transitions', () => {
    // Nothing goes live without review.
    expect(canTransition('DRAFT', 'ACTIVE')).toBe(false);
    expect(canTransition('DRAFT', 'PENDING_REVIEW')).toBe(true);
    expect(canTransition('PENDING_REVIEW', 'ACTIVE')).toBe(true);
    expect(canTransition('CHANGES_REQUESTED', 'ACTIVE')).toBe(false);
    expect(canTransition('ACTIVE', 'PAUSED')).toBe(true);
    expect(canTransition('COMPLETED', 'ACTIVE')).toBe(false);
    expect(canTransition('CANCELLED', 'ACTIVE')).toBe(false);
  });

  it('registration is open only inside its window on an active, unsuspended competition', () => {
    const c = { status: 'ACTIVE', suspendedAt: null, registrationOpensAt: d(1), registrationDeadline: d(10) };
    expect(registrationOpen(c, d(5))).toBe(true);
    expect(registrationOpen(c, d(11))).toBe(false);
    expect(registrationOpen({ ...c, status: 'PAUSED' }, d(5))).toBe(false);
    expect(registrationOpen({ ...c, suspendedAt: d(2) }, d(5))).toBe(false);
  });
});

describe('validateSubmissionLink', () => {
  it('accepts Google Drive file links and normalises a bare domain', () => {
    const r = validateSubmissionLink('drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing');
    expect(r.ok && r.provider).toBe('Google Drive');
  });

  it('rejects Drive folders and unsupported hosts', () => {
    expect(validateSubmissionLink('https://drive.google.com/drive/folders/1AbCdEfGhIjKl').ok).toBe(false);
    expect(validateSubmissionLink('https://example.com/video.mp4').ok).toBe(false);
    expect(validateSubmissionLink('not a url at all').ok).toBe(false);
  });

  it('accepts YouTube and other supported video hosts', () => {
    expect(validateSubmissionLink('https://youtu.be/dQw4w9WgXcQ').ok).toBe(true);
    expect(validateSubmissionLink('https://vimeo.com/123456').ok).toBe(true);
  });
});
