import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Clock, CheckCircle2, Circle, XCircle, Lock, PlayCircle, Link2, ExternalLink, Award, ArrowUpRight } from 'lucide-react';
import { useT } from '../i18n';
import { cn } from '../ui/cn';
import { MarkdownText } from '../ui/MarkdownText';
import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { TextField } from '../ui/TextField';
import { StatusBadge } from '../ui/StatusBadge';
import type { CompetitionCard as CardData, Prize, Stage, StageStatus, MySubmission, SubmissionMethod } from '../api/competitions';
import { formatNpt, fromNptInput, toNptInput, npr, timeLeft, stageStatusBadge, competitionStatusBadge, formatDuration, durationLabel } from './format';

/*
 * Shared competition building blocks — used by the creator, organizer and
 * admin screens so a stage, prize or entry looks the same everywhere.
 * Competition's accent is amber (brand-orange), distinct from Paid (violet)
 * and Open (green) events.
 */

export function CompetitionTypeBadge({ className }: { className?: string }) {
  const t = useT();
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full bg-brand-orange/10 px-2 py-0.5 text-[11px] font-semibold text-brand-orange', className)}>
      <Trophy size={11} aria-hidden />
      {t('comp.typeBadge')}
    </span>
  );
}

/** Multi-line organizer text (rules, briefs) — preserves their line breaks. */
/** Organizer text — Markdown from the rich-text editor, or older plain text. */
export function Prose({ children, className }: { children?: string | null; className?: string }) {
  if (!children) return null;
  return <MarkdownText className={cn('text-[14px] leading-relaxed text-ink-soft', className)}>{children}</MarkdownText>;
}

export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-line bg-surface p-5', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// ── Discovery card ──────────────────────────────────────────────────────────

export function CompetitionCard({ c, href }: { c: CardData; href: string }) {
  const t = useT();
  const status = competitionStatusBadge(c.status, t);
  const reg = timeLeft(c.registrationDeadline, t);
  const cta = c.joined
    ? c.status === 'COMPLETED' ? t('comp.ctaViewResults') : t('comp.ctaViewProgress')
    : c.status === 'COMPLETED' ? t('comp.ctaViewResults') : c.registrationOpen ? t('comp.ctaJoin') : t('comp.ctaView');

  return (
    <Link
      to={href}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface',
        'transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-orange/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40',
      )}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-brand-orange/15 via-surface-dim to-violet/10">
        {c.coverImageUrl ? (
          <img src={c.coverImageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-brand-orange/70"><Trophy size={40} aria-hidden /></div>
        )}
        <CompetitionTypeBadge className="absolute right-3 top-3 bg-white shadow-sm" />
        {c.joined && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink/75 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
            <CheckCircle2 size={11} aria-hidden /> {t('comp.joinedBadge')}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={status.label} tone={status.tone} dot />
          {c.currentStage && c.status === 'ACTIVE' && (
            <span className="text-[12px] text-ink-soft">{c.currentStage.name} · {stageStatusBadge(c.currentStage.status, t).label}</span>
          )}
        </div>
        <h3 className="mt-2.5 line-clamp-2 text-[16px] font-semibold leading-snug text-ink">{c.title}</h3>
        <div className="mt-2 flex items-center gap-2">
          <Avatar name={c.organizer.name ?? ''} src={c.organizer.logoUrl} size="xs" />
          <span className="truncate text-[13px] text-ink-soft">{c.organizer.name}</span>
        </div>
        {(c.prizePool || c.prizeHighlights.length > 0) && (
          <p className="mt-3 flex items-start gap-1.5 text-[14px] font-semibold text-ink">
            <Trophy size={14} className="mt-0.5 shrink-0 text-brand-orange" aria-hidden />
            <span className="line-clamp-2">
              {c.prizePool ? t('comp.prizePool', { amount: npr(c.prizePool.amount) }) : c.prizeHighlights.map((p) => p.title).join(' · ')}
            </span>
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-soft">
          <span className="inline-flex items-center gap-1"><Users size={13} aria-hidden />{t('comp.participants', { n: c.participantCount })}</span>
          {c.registrationOpen && (
            <span className={cn('inline-flex items-center gap-1', reg.urgent && 'font-semibold text-danger')}>
              <Clock size={13} aria-hidden />{t('comp.registrationCloses', { when: reg.label })}
            </span>
          )}
        </div>
        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[13px] font-semibold text-brand-orange">
          {cta} <ArrowUpRight size={14} aria-hidden />
        </span>
      </div>
    </Link>
  );
}

// ── Stage timeline ──────────────────────────────────────────────────────────

export interface TimelineStage {
  id: string;
  name: string;
  status: StageStatus;
  opensAt: string;
  deadline: string;
  advanceLimit?: number | null;
  /** Creator view only: their own published outcome / submission. */
  outcome?: 'ADVANCE' | 'NOT_SELECTED' | null;
  submitted?: boolean;
  locked?: boolean;
}

/** "Round 1 → Top 20 → Final" — vertical on mobile, compact chips on desktop. */
export function StageTimeline({ stages, currentId, onSelect, selectedId }: {
  stages: TimelineStage[];
  currentId?: string | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const t = useT();
  return (
    <ol className="space-y-2" aria-label={t('comp.stageProgress')}>
      {stages.map((s, i) => {
        const badge = stageStatusBadge(s.status, t);
        const done = s.status === 'RESULTS_PUBLISHED' || s.status === 'CLOSED';
        const Icon = s.outcome === 'NOT_SELECTED' ? XCircle : s.outcome === 'ADVANCE' || done ? CheckCircle2 : s.locked ? Lock : s.status === 'OPEN' ? PlayCircle : Circle;
        const isCurrent = s.id === currentId;
        const content = (
          <div className={cn(
            'flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
            isCurrent ? 'border-brand-orange/40 bg-brand-orange/[0.05]' : 'border-line',
            selectedId === s.id && 'ring-2 ring-brand-orange/40',
            onSelect && 'hover:bg-surface-dim',
          )}>
            <Icon size={18} aria-hidden className={cn('mt-0.5 shrink-0', s.outcome === 'NOT_SELECTED' ? 'text-ink-soft' : done || s.outcome === 'ADVANCE' ? 'text-success' : s.status === 'OPEN' ? 'text-brand-orange' : 'text-ink-soft')} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-semibold text-ink">{i + 1}. {s.name}</span>
                <StatusBadge label={badge.label} tone={badge.tone} />
                {s.advanceLimit ? <span className="text-[11.5px] text-ink-soft">{t('comp.topN', { n: s.advanceLimit })}</span> : null}
              </div>
              <p className="mt-0.5 text-[12px] text-ink-soft">
                {s.status === 'UPCOMING' ? t('comp.opensOn', { when: formatNpt(s.opensAt) }) : t('comp.deadlineOn', { when: formatNpt(s.deadline) })}
              </p>
              {s.outcome && (
                <p className={cn('mt-1 text-[12px] font-semibold', s.outcome === 'ADVANCE' ? 'text-success' : 'text-ink-soft')}>
                  {s.outcome === 'ADVANCE' ? t('comp.outcomeAdvanced') : t('comp.outcomeNotSelected')}
                </p>
              )}
              {s.submitted !== undefined && !s.outcome && s.status !== 'UPCOMING' && (
                <p className={cn('mt-1 text-[12px]', s.submitted ? 'text-success' : 'text-ink-soft')}>
                  {s.submitted ? t('comp.entrySubmitted') : t('comp.entryNotSubmitted')}
                </p>
              )}
            </div>
          </div>
        );
        return (
          <li key={s.id}>
            {onSelect ? <button type="button" className="w-full" onClick={() => onSelect(s.id)} aria-current={selectedId === s.id}>{content}</button> : content}
          </li>
        );
      })}
    </ol>
  );
}

// ── Prizes ──────────────────────────────────────────────────────────────────

export function PrizeList({ prizes, pool, compact }: { prizes: Prize[]; pool?: { amount: number } | null; compact?: boolean }) {
  const t = useT();
  if (!prizes.length) return <p className="text-[13px] text-ink-soft">{t('comp.noPrizes')}</p>;
  return (
    <div>
      <ul className="divide-y divide-line">
        {prizes.map((p, i) => (
          <li key={p.id ?? i} className="flex items-start justify-between gap-3 py-2.5">
            <div className="flex min-w-0 items-start gap-2.5">
              <Award size={16} aria-hidden className={cn('mt-0.5 shrink-0', p.kind === 'PLACEMENT' ? 'text-brand-orange' : 'text-violet')} />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-ink">
                  {p.title}{p.recipientCount > 1 ? <span className="font-normal text-ink-soft"> × {p.recipientCount}</span> : null}
                </p>
                {!compact && p.description && <p className="text-[12.5px] text-ink-soft">{p.description}</p>}
                {!compact && p.notes && <p className="text-[12px] italic text-ink-soft">{p.notes}</p>}
              </div>
            </div>
            {p.amount != null && <span className="shrink-0 text-[14px] font-semibold text-ink">{npr(p.amount)}{p.recipientCount > 1 ? <span className="text-[12px] font-normal text-ink-soft"> {t('comp.each')}</span> : null}</span>}
          </li>
        ))}
      </ul>
      {pool && (
        <p className="mt-2 flex items-center justify-between border-t border-line pt-2.5 text-[13px] text-ink-soft">
          <span>{t('comp.totalAdvertised')}</span>
          <span className="font-semibold text-ink">{npr(pool.amount)}</span>
        </p>
      )}
      <p className="mt-2 text-[11.5px] text-ink-soft">{t('comp.prizeDisclaimer')}</p>
    </div>
  );
}

// ── Entry preview ───────────────────────────────────────────────────────────

export function SubmissionPreview({ s, compact }: { s: Pick<MySubmission, 'method' | 'videoUrl' | 'thumbnailUrl' | 'externalUrl' | 'durationSec' | 'caption'>; compact?: boolean }) {
  const t = useT();
  if (s.method === 'VIDEO_UPLOAD' && s.videoUrl) {
    return (
      <div className="space-y-2">
        {/* preload="none": a 500-row participant list must not fetch 500 videos. */}
        <video
          controls
          preload="none"
          poster={s.thumbnailUrl ?? undefined}
          src={s.videoUrl}
          className={cn('w-full rounded-xl bg-ink/90', compact ? 'max-h-56' : 'max-h-[420px]')}
        >
          <track kind="captions" />
        </video>
        <div className="flex items-center justify-between text-[12px] text-ink-soft">
          <span>{s.durationSec ? t('comp.videoLength', { len: formatDuration(s.durationSec) }) : t('comp.uploadedVideo')}</span>
          <a href={s.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
            {t('comp.openInNewTab')} <ExternalLink size={12} aria-hidden />
          </a>
        </div>
        {s.caption && <p className="text-[13px] text-ink-soft">{s.caption}</p>}
      </div>
    );
  }
  if (s.externalUrl) {
    let host = s.externalUrl;
    try { host = new URL(s.externalUrl).hostname.replace(/^www\./, ''); } catch { /* keep raw */ }
    return (
      <div className="space-y-2">
        <a href={s.externalUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 hover:bg-surface-dim">
          <Link2 size={16} aria-hidden className="shrink-0 text-brand" />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-ink">{host}</span>
            <span className="block truncate text-[12px] text-ink-soft">{s.externalUrl}</span>
          </span>
          <ExternalLink size={14} aria-hidden className="shrink-0 text-ink-soft" />
        </a>
        {s.caption && <p className="text-[13px] text-ink-soft">{s.caption}</p>}
      </div>
    );
  }
  return null;
}

export function MethodsLabel({ methods }: { methods: SubmissionMethod[] }) {
  const t = useT();
  // Video upload is hidden for now — only the Drive-link method is ever shown.
  const visible = methods.filter((m) => m !== 'VIDEO_UPLOAD');
  return <>{visible.map(() => t('comp.methodLink')).join(' · ')}</>;
}

export function StageRequirements({ stage, fallbackMin, fallbackMax }: { stage: Pick<Stage, 'brief' | 'requirements' | 'allowedMethods' | 'videoMinSec' | 'videoMaxSec' | 'deadline'>; fallbackMin?: number | null; fallbackMax?: number | null }) {
  const t = useT();
  const dur = durationLabel(stage.videoMinSec ?? fallbackMin ?? null, stage.videoMaxSec ?? fallbackMax ?? null, t);
  return (
    <div className="space-y-2">
      <Prose>{stage.brief}</Prose>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2">
        <InfoRow label={t('comp.deadline')} value={formatNpt(stage.deadline)} />
        <InfoRow label={t('comp.submitAs')} value={<MethodsLabel methods={stage.allowedMethods} />} />
        {dur && <InfoRow label={t('comp.videoLengthLabel')} value={dur} />}
      </dl>
      <Prose>{stage.requirements}</Prose>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 gap-2">
      <dt className="shrink-0 text-ink-soft">{label}:</dt>
      <dd className="min-w-0 font-medium text-ink">{value}</dd>
    </div>
  );
}

export function CompetitionStatusBadge({ status }: { status: Parameters<typeof competitionStatusBadge>[0] }) {
  const t = useT();
  const b = competitionStatusBadge(status, t);
  return <StatusBadge label={b.label} tone={b.tone} dot />;
}

// ── Form + dialog helpers ───────────────────────────────────────────────────

/** datetime-local input that reads/writes ISO instants but is edited in Nepal time. */
export function NptDateTimeField({ label, value, onChange, error, hint, min, required }: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  error?: string;
  hint?: string;
  min?: string;
  required?: boolean;
}) {
  const t = useT();
  return (
    <TextField
      type="datetime-local"
      label={label}
      value={toNptInput(value)}
      min={min ? toNptInput(min) : undefined}
      onChange={(e) => onChange(fromNptInput(e.target.value))}
      hint={hint ?? t('comp.nepalTime')}
      error={error}
      required={required}
    />
  );
}

/** Modal asking for a reason (cancel, reopen results…). Resolves on confirm. */
export function ReasonDialog({ open, title, message, label, confirmLabel, tone = 'danger', optional, onClose, onConfirm }: {
  open: boolean;
  title: string;
  message?: string;
  label: string;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  optional?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<unknown>;
}) {
  const t = useT();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = optional || reason.trim().length >= 5;
  async function submit() {
    setBusy(true);
    setError('');
    try {
      await onConfirm(reason.trim());
      setReason('');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={submit} loading={busy} disabled={!valid}>{confirmLabel}</Button>
        </>
      )}
    >
      {message && <p className="mb-3 text-[14px] text-ink-soft">{message}</p>}
      <Textarea label={label} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} error={error || undefined} hint={optional ? undefined : t('comp.reasonHint')} maxLength={500} />
    </Modal>
  );
}

/** Modal asking for a new Nepal-time deadline. */
export function DeadlineDialog({ open, title, message, current, confirmLabel, onClose, onConfirm }: {
  open: boolean;
  title: string;
  message?: string;
  current?: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (iso: string) => Promise<unknown>;
}) {
  const t = useT();
  const [value, setValue] = useState(current ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit() {
    if (!value || new Date(value) <= new Date()) { setError(t('comp.deadlineFuture')); return; }
    setBusy(true);
    setError('');
    try {
      await onConfirm(value);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
          <Button onClick={submit} loading={busy}>{confirmLabel}</Button>
        </>
      )}
    >
      {message && <p className="mb-3 text-[14px] text-ink-soft">{message}</p>}
      {current && <p className="mb-3 text-[13px] text-ink-soft">{t('comp.currentDeadline', { when: formatNpt(current) })}</p>}
      <NptDateTimeField label={t('comp.newDeadline')} value={value} onChange={setValue} error={error || undefined} />
      <p className="mt-2 text-[12px] text-ink-soft">{t('comp.deadlineNotifyNote')}</p>
    </Modal>
  );
}


/** Avatar + name that opens the creator's profile (business side), in the same tab. */
export function CreatorProfileLink({ creatorId, children, className }: { creatorId: string; children: ReactNode; className?: string }) {
  return (
    <Link
      to={`/business/creators/${creatorId}`}
      className={cn('group/creator flex min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-violet/40', className)}
    >
      {children}
    </Link>
  );
}
