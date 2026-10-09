import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock3, CheckCircle2, PencilLine, XCircle, History, ChevronDown } from 'lucide-react';
import { useT, useAppLanguage } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchEventReviewHistory, resubmitCampaign, type MyCampaign } from '../api/business';
import { canResubmitEvent } from './eventReviewStatus';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';

// Banner on the business event page (and edit screens) explaining where an
// event stands in admin review and what to do next. Mirrors mobile's
// EventReviewBanner so web and mobile say the same thing.

export function EventReviewBanner({ campaign, onResubmitted, compact = false }: {
  campaign: MyCampaign;
  onResubmitted?: (updated: MyCampaign) => void;
  /** Edit page: no actions (the form is the action), just the feedback. */
  compact?: boolean;
}) {
  const t = useT();
  const lang = useAppLanguage().language;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const history = useAsync((s) => (showHistory ? fetchEventReviewHistory(campaign.id, s) : Promise.resolve(null)), [campaign.id, showHistory]);

  const { status, review } = campaign;
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(lang === 'ne' ? 'ne-NP' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  let tone: 'warning' | 'success' | 'danger';
  let Icon = Clock3;
  let title: string;
  let body: string;
  if (status === 'PENDING_APPROVAL') {
    tone = 'warning'; title = t('eventReview.pendingTitle'); body = t('eventReview.pendingBody');
  } else if (status === 'CHANGES_REQUESTED') {
    tone = 'warning'; Icon = PencilLine; title = t('eventReview.changesTitle'); body = t('eventReview.changesBody');
  } else if (status === 'REJECTED') {
    tone = 'danger'; Icon = XCircle; title = t('eventReview.rejectedTitle'); body = t('eventReview.rejectedBody');
  } else if (status === 'ACTIVE' && review?.reviewedAt) {
    tone = 'success'; Icon = CheckCircle2; title = t('eventReview.publishedTitle'); body = t('eventReview.publishedBody');
  } else {
    return null;
  }
  if (compact && status !== 'CHANGES_REQUESTED' && status !== 'REJECTED') return null;

  const resubmittable = canResubmitEvent(campaign);
  const permanent = status === 'REJECTED' && !resubmittable;

  async function resubmitAsIs() {
    if (busy || !window.confirm(t('eventReview.resubmitConfirm'))) return;
    setBusy(true);
    setErr('');
    try {
      const updated = await resubmitCampaign(campaign.id);
      onResubmitted?.(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  }

  const toneCls = {
    warning: 'border-warning/30 bg-warning-soft',
    success: 'border-success/30 bg-success-soft',
    danger: 'border-danger/30 bg-danger-soft',
  }[tone];
  const iconCls = { warning: 'text-warning', success: 'text-success', danger: 'text-danger' }[tone];

  return (
    <div className={cn('mb-5 rounded-2xl border p-4 sm:p-5', toneCls)} role="status">
      <div className="flex items-start gap-3">
        <Icon size={20} className={cn('mt-0.5 flex-shrink-0', iconCls)} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink">{title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{compact ? t('eventReview.editingFeedbackHint') : body}</p>

          {review?.feedback && (status === 'CHANGES_REQUESTED' || status === 'REJECTED' || status === 'PENDING_APPROVAL') && (
            <div className="mt-3 rounded-xl border border-line bg-surface p-3.5">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-soft">
                {status === 'REJECTED' ? t('eventReview.reasonLabel') : t('eventReview.feedbackLabel')}
              </p>
              <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-ink">{review.feedback}</p>
              {review.reviewedAt && (
                <p className="mt-2 text-[12px] text-ink-soft">{t('eventReview.reviewedOn', { date: fmtDate(review.reviewedAt) })}</p>
              )}
            </div>
          )}

          {permanent && <p className="mt-3 text-[13px] font-medium text-danger">{t('eventReview.permanent')}</p>}
          {err && <p className="mt-3 text-[13px] font-medium text-danger">{err}</p>}

          {!compact && resubmittable && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to={`/business/events/${campaign.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-[13px] font-semibold text-surface hover:opacity-90"
              >
                <PencilLine size={14} />
                {t('eventReview.editAndResubmit')}
              </Link>
              <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={resubmitAsIs}>
                {t('eventReview.resubmitAsIs')}
              </Button>
            </div>
          )}

          {!compact && (review?.revision ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-soft hover:text-ink"
            >
              <History size={13} />
              {t('eventReview.historyTitle')}
              <ChevronDown size={13} className={cn('transition-transform', showHistory && 'rotate-180')} />
            </button>
          )}
          {showHistory && history.data && (
            <ol className="mt-2 space-y-2 border-l border-line pl-3">
              {history.data.map((h) => (
                <li key={h.id} className="text-[13px]">
                  <span className="font-medium text-ink">{t(`eventReview.history${h.action}`)}</span>
                  <span className="text-ink-soft"> · {fmtDate(h.createdAt)}</span>
                  {h.feedback && <p className="mt-0.5 whitespace-pre-line text-ink-soft">{h.feedback}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
