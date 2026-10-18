import type { BadgeTone } from '../ui/StatusBadge';
import type { TFn } from '../i18n';
import type { CompetitionStatus, CreatorCompetitionStatus, StageStatus } from '../api/competitions';

/*
 * Competition dates are stored as UTC instants and always SHOWN and ENTERED in
 * Nepal time (Asia/Kathmandu, UTC+05:45, no DST) regardless of the viewer's
 * own timezone — a deadline must read the same for every creator.
 */

const NPT_OFFSET_MIN = 5 * 60 + 45;

/** ISO instant → "YYYY-MM-DDTHH:mm" in Nepal time, for <input type="datetime-local">. */
export function toNptInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + NPT_OFFSET_MIN * 60_000);
  return d.toISOString().slice(0, 16);
}

/** "YYYY-MM-DDTHH:mm" entered as Nepal time → ISO instant. Empty → ''. */
export function fromNptInput(v: string): string {
  if (!v) return '';
  const d = new Date(`${v}:00+05:45`);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

/** Nepal-time input value N hours from now, rounded to the hour. */
export function nptInputIn(hours: number): string {
  const d = new Date(Date.now() + hours * 3_600_000);
  d.setUTCMinutes(0, 0, 0);
  return toNptInput(d.toISOString());
}

export function formatNpt(iso: string | null | undefined, opts: { time?: boolean } = { time: true }): string {
  if (!iso) return '—';
  const s = new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Asia/Kathmandu', day: 'numeric', month: 'short', year: 'numeric',
    ...(opts.time !== false ? { hour: 'numeric', minute: '2-digit', hour12: true } : {}),
  });
  return s;
}

/** "in 3 days" / "in 5 hours" / "ended" — coarse, for cards. */
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

export function competitionStatusBadge(s: CompetitionStatus, t: TFn): { label: string; tone: BadgeTone } {
  const tone: Record<CompetitionStatus, BadgeTone> = {
    DRAFT: 'neutral', PENDING_REVIEW: 'progress', CHANGES_REQUESTED: 'warning', REJECTED: 'danger', SCHEDULED: 'info', ACTIVE: 'success', PAUSED: 'warning',
    AWAITING_RESULTS: 'progress', COMPLETED: 'neutral', CANCELLED: 'danger',
  };
  return { label: t(`comp.status_${s}`), tone: tone[s] };
}

export function stageStatusBadge(s: StageStatus, t: TFn): { label: string; tone: BadgeTone } {
  const tone: Record<StageStatus, BadgeTone> = {
    UPCOMING: 'neutral', OPEN: 'success', UNDER_REVIEW: 'progress', SELECTION_PENDING: 'progress',
    RESULTS_PUBLISHED: 'info', CLOSED: 'neutral',
  };
  return { label: t(`comp.stage_${s}`), tone: tone[s] };
}

export function creatorStatusBadge(s: CreatorCompetitionStatus, t: TFn): { label: string; tone: BadgeTone; hint: string } {
  const tone: Record<CreatorCompetitionStatus, BadgeTone> = {
    JOINED: 'info', SUBMISSION_REQUIRED: 'warning', SUBMITTED: 'success', UNDER_REVIEW: 'progress',
    NO_SUBMISSION: 'neutral', ADVANCED: 'success', FINALIST: 'success', NOT_SELECTED: 'neutral',
    COMPLETED: 'neutral', CANCELLED: 'danger', WITHDRAWN: 'neutral',
  };
  return { label: t(`comp.my_${s}`), tone: tone[s], hint: t(`comp.myHint_${s}`) };
}

export function durationLabel(min: number | null, max: number | null, t: TFn): string | null {
  if (min && max) return t('comp.durationRange', { min, max });
  if (max) return t('comp.durationMax', { max });
  if (min) return t('comp.durationMin', { min });
  return null;
}

export function formatDuration(sec: number | null | undefined): string {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** "competition.stage_closed" + { stage: 'Round 1' } → "Round 1 submissions closed". */
export function activityLabel(action: string, metadata: Record<string, unknown> | null, t: TFn): string {
  const key = action.replace(/^competition\./, '');
  const stage = typeof metadata?.stage === 'string' ? metadata.stage : '';
  const label = t(`comp.act_${key}`, { stage, advanced: String(metadata?.advanced ?? ''), notSelected: String(metadata?.notSelected ?? '') });
  return label.startsWith('comp.') ? action : label;
}
