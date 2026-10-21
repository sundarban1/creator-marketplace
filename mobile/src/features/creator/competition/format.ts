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
