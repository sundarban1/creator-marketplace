// Creator-side competition display helpers. Mirrors web/src/app/competitions/format.ts
// (same i18n keys under `comp.*`) so a status/countdown reads the same on both.
import type { TFn } from '@/context/LanguageContext';
import type { CompetitionStatus, CreatorCompetitionStatus, StageStatus } from '@/services/competition';
import { TabColors, type TabColorKey } from '@/utilities/tabColors';

export { formatNpt } from '@/features/business/competition/model';

export type Tone = TabColorKey;
export const toneColor = (tone: Tone) => TabColors[tone].color;

/** "in 3 days" / "in 5 h" / "ended" — coarse, for cards. */
export function timeLeft(iso: string, t: TFn): { label: string; urgent: boolean; past: boolean } {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { label: t('comp.timeEnded'), urgent: false, past: true };
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return { label: t('comp.timeMinutes', { n: Math.max(1, Math.floor(ms / 60_000)) }), urgent: true, past: false };
  if (h < 48) return { label: t('comp.timeHours', { n: h }), urgent: h < 24, past: false };
  return { label: t('comp.timeDays', { n: Math.floor(h / 24) }), urgent: false, past: false };
}

export function npr(amount: number | null | undefined): string {
  if (amount == null) return '';
  return `NPR ${Math.round(amount).toLocaleString('en-IN')}`;
}

export function competitionStatusBadge(s: CompetitionStatus, t: TFn): { label: string; tone: Tone } {
  const tone: Record<CompetitionStatus, Tone> = {
    DRAFT: 'neutral', PENDING_REVIEW: 'brand', CHANGES_REQUESTED: 'warning', REJECTED: 'danger', SCHEDULED: 'info', ACTIVE: 'positive', PAUSED: 'warning',
    AWAITING_RESULTS: 'brand', COMPLETED: 'closed', CANCELLED: 'danger',
  };
  return { label: t(`comp.status_${s}`), tone: tone[s] };
}

export function stageStatusBadge(s: StageStatus, t: TFn): { label: string; tone: Tone } {
  const tone: Record<StageStatus, Tone> = {
    UPCOMING: 'neutral', OPEN: 'positive', UNDER_REVIEW: 'brand', SELECTION_PENDING: 'brand', RESULTS_PUBLISHED: 'info', CLOSED: 'closed',
  };
  return { label: t(`comp.stage_${s}`), tone: tone[s] };
}

export function creatorStatusBadge(s: CreatorCompetitionStatus, t: TFn): { label: string; tone: Tone; hint: string } {
  const tone: Record<CreatorCompetitionStatus, Tone> = {
    JOINED: 'info', SUBMISSION_REQUIRED: 'warning', SUBMITTED: 'positive', UNDER_REVIEW: 'brand',
    NO_SUBMISSION: 'closed', ADVANCED: 'positive', FINALIST: 'positive', NOT_SELECTED: 'closed',
    COMPLETED: 'closed', CANCELLED: 'danger', WITHDRAWN: 'closed',
  };
  return { label: t(`comp.my_${s}`), tone: tone[s], hint: t(`comp.myHint_${s}`) };
}

/**
 * Badge label for the Applications → Competitions card: the status plus the
 * round it refers to, e.g. "Round 1 advanced", "Round 2 submitted". Single-round
 * competitions (and statuses that aren't about a round) keep the plain label.
 * Note: once a creator advances, `currentStage` is already the NEXT round, so
 * the round they advanced from is `order - 1`.
 */
export function joinedCardLabel(
  j: { status: CreatorCompetitionStatus; currentStage: { order: number; status: StageStatus } | null; competition: { stageCount: number } },
  t: TFn,
): string {
  const plain = t(`comp.my_${j.status}`);
  const round = j.currentStage?.order;
  if (!round || j.competition.stageCount <= 1) return plain;
  const prev = round - 1;
  switch (j.status) {
    case 'SUBMISSION_REQUIRED': return t('comp.card_SUBMISSION_REQUIRED', { n: round });
    case 'SUBMITTED':           return t('comp.card_SUBMITTED', { n: round });
    case 'UNDER_REVIEW':        return t('comp.card_UNDER_REVIEW', { n: round });
    case 'NO_SUBMISSION':       return t('comp.card_NO_SUBMISSION', { n: round });
    case 'NOT_SELECTED':        return t('comp.card_NOT_SELECTED', { n: round });
    case 'ADVANCED':            return prev >= 1 ? t('comp.card_ADVANCED', { n: prev }) : plain;
    case 'FINALIST':
      // Final round not started yet → they just advanced into it.
      // Final round running/under review → they're competing in the final.
      return j.currentStage!.status === 'UPCOMING' && prev >= 1
        ? t('comp.card_FINALIST_ADVANCED', { n: prev })
        : t('comp.card_FINALIST', { n: round });
    default:                    return plain;
  }
}

export function durationLabel(min: number | null, max: number | null, t: TFn): string | null {
  if (min && max) return t('comp.durationRange', { min, max });
  if (max) return t('comp.durationMax', { max });
  if (min) return t('comp.durationMin', { min });
  return null;
}

/** Only Google Drive share links are accepted for now (server re-validates). Same rule as web. */
export function isGoogleDriveLink(raw: string): boolean {
  const v = raw.trim();
  const m = /^(?:https?:\/\/)?(?:www\.)?([^/?#:]+)/i.exec(v);
  return !!m && m[1].toLowerCase() === 'drive.google.com';
}

/** "competition.stage_closed" + { stage: 'Round 1' } → "Round 1 submissions closed". Same as web. */
export function activityLabel(action: string, metadata: Record<string, unknown> | null, t: TFn): string {
  const key = action.replace(/^competition\./, '');
  const stage = typeof metadata?.stage === 'string' ? metadata.stage : '';
  const label = t(`comp.act_${key}`, { stage, advanced: String(metadata?.advanced ?? ''), notSelected: String(metadata?.notSelected ?? '') });
  return label.startsWith('comp.') ? action : label;
}
