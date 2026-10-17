import { Clock, AlertTriangle, XCircle, FileClock, Info } from 'lucide-react';
import { useT } from '../i18n';
import { cn } from '../ui/cn';
import type { ManagedCompetition } from '../api/competitions';
import { formatNpt } from './format';

/**
 * Where the competition stands with Kolab review — launch review
 * (pending / changes requested / rejected) and any proposed edit to rules,
 * eligibility or prizes waiting for approval. Renders nothing when there's
 * nothing to say.
 */
export function ReviewBanner({ c }: { c: ManagedCompetition }) {
  const t = useT();
  const r = c.review;
  const items: Array<{ tone: 'info' | 'warning' | 'danger'; icon: typeof Clock; title: string; body: string; feedback?: string | null }> = [];

  if (c.status === 'PENDING_REVIEW') {
    items.push({ tone: 'info', icon: Clock, title: t('comp.reviewPendingTitle'), body: t('comp.reviewPendingBody', { when: formatNpt(r.submittedAt) }) });
  }
  if (c.status === 'CHANGES_REQUESTED') {
    items.push({ tone: 'warning', icon: AlertTriangle, title: t('comp.reviewChangesTitle'), body: t('comp.reviewChangesBody'), feedback: r.feedback });
  }
  if (c.status === 'REJECTED') {
    items.push({ tone: 'danger', icon: XCircle, title: t('comp.reviewRejectedTitle'), body: r.resubmissionAllowed ? t('comp.reviewRejectedBody') : t('comp.reviewRejectedFinal'), feedback: r.feedback });
  }
  if (r.pendingChanges) {
    const fields = Object.keys(r.pendingChanges).map((f) => t(`comp.field_${f}`)).join(', ');
    items.push({ tone: 'info', icon: FileClock, title: t('comp.editPendingTitle'), body: t('comp.editPendingBody', { fields }) });
  } else if (r.pendingChangesFeedback && !['DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED'].includes(c.status)) {
    items.push({ tone: 'warning', icon: Info, title: t('comp.editRejectedTitle'), body: t('comp.editRejectedBody'), feedback: r.pendingChangesFeedback });
  }

  if (!items.length) return null;
  const tones = {
    info: 'border-brand/25 bg-brand/[0.05] text-brand',
    warning: 'border-warning/30 bg-warning-soft/50 text-warning',
    danger: 'border-danger/30 bg-danger-soft/50 text-danger',
  };
  return (
    <div className="space-y-3" role="status">
      {items.map((it) => (
        <div key={it.title} className={cn('flex gap-3 rounded-2xl border px-4 py-3', tones[it.tone])}>
          <it.icon size={18} aria-hidden className="mt-0.5 shrink-0" />
          <div className="min-w-0 text-ink">
            <p className="text-[14px] font-semibold">{it.title}</p>
            <p className="mt-0.5 text-[13px] text-ink-soft">{it.body}</p>
            {it.feedback && (
              <blockquote className="mt-2 rounded-xl border border-line bg-surface px-3 py-2 text-[13px] text-ink">
                <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{t('comp.feedbackFromKolab')}</span>
                <span className="whitespace-pre-line">{it.feedback}</span>
              </blockquote>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
