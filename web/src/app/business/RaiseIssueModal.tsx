import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useT } from '../i18n';
import { reportIssue, type BusinessApplication } from '../api/business';
import { DELIVERABLE_REPORT_REASONS, submitReport } from '../api/report';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import { cn } from '../ui/cn';

type Category = 'PAYMENT' | (typeof DELIVERABLE_REPORT_REASONS)[number];

// Escrow states in which either party may open a payment dispute — mirrors
// mobile activity-timeline's DISPUTABLE_STATES + held-escrow check.
const DISPUTE_STATES = new Set(['ESCROW_FUNDED', 'IN_PROGRESS', 'REVISION_REQUESTED', 'CONTENT_OVERDUE', 'BUSINESS_REVIEW', 'PAYMENT_RELEASE_PENDING']);

export function canRaiseDispute(a: BusinessApplication): boolean {
  return !a.dispute && DISPUTE_STATES.has(a.engagementState);
}

/** The creator has submitted something the business can report as content. */
export function hasReportableDeliverable(a: BusinessApplication): boolean {
  if (a.deliverableHidden) return false;
  return (a.deliverableVideos?.length ?? 0) > 0 || (a.deliverableFiles?.length ?? 0) > 0 || !!a.deliverableUrls?.trim() || !!a.submittedAt;
}

export function canRaiseIssue(a: BusinessApplication): boolean {
  return canRaiseDispute(a) || hasReportableDeliverable(a);
}

/**
 * Business-side "Raise an issue". One sheet, two outcomes:
 *  - PAYMENT → the existing escrow dispute (report-issue endpoint, holds payment);
 *  - a content category → a DELIVERABLE moderation report for Kolab admins
 *    (no effect on approval, revision or payment).
 */
export function RaiseIssueModal({
  app,
  onClose,
  onDisputeRaised,
}: {
  app: BusinessApplication | null;
  onClose: () => void;
  /** Called after a payment dispute is opened (caller flashes + reloads). */
  onDisputeRaised: () => void;
}) {
  const t = useT();
  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const disputeAllowed = !!app && canRaiseDispute(app);
  const contentAllowed = !!app && hasReportableDeliverable(app);
  const isDispute = category === 'PAYMENT';

  function close() {
    if (busy) return;
    onClose();
    setCategory(null);
    setDescription('');
    setErr('');
    setSubmitted(false);
  }

  async function submit() {
    if (!app || !category) return;
    setBusy(true);
    setErr('');
    try {
      if (isDispute) {
        // The dispute API needs a reason — fall back to the category name.
        await reportIssue(app.id, description.trim() || t('raiseIssue.catPAYMENT'));
        setBusy(false);
        close();
        onDisputeRaised();
        return;
      }
      await submitReport('DELIVERABLE', app.id, category, description.trim());
      setSubmitted(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  }

  const pill = (c: Category) => (
    <button
      key={c}
      type="button"
      role="radio"
      aria-checked={category === c}
      onClick={() => setCategory(c)}
      className={cn(
        'rounded-full border px-3.5 py-1.5 text-left text-[13px] font-medium transition-colors',
        category === c ? 'border-danger bg-danger/10 text-danger' : 'border-line-strong text-ink hover:bg-surface-dim',
      )}
    >
      {t(`raiseIssue.cat${c}`)}
    </button>
  );

  return (
    <Modal
      open={!!app}
      onClose={close}
      title={t('raiseIssue.title')}
      footer={
        submitted ? (
          <div className="flex justify-end">
            <Button onClick={close}>{t('raiseIssue.done')}</Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" loading={busy} disabled={!category} onClick={submit}>
              {t('raiseIssue.submit')}
            </Button>
          </div>
        )
      }
    >
      {submitted ? (
        <div className="py-4 text-center">
          <CheckCircle2 size={30} className="mx-auto text-success" />
          <p className="mt-2 text-[15px] font-semibold text-ink">{t('raiseIssue.successTitle')}</p>
          <p className="mt-1 text-[13px] text-ink-soft">{t('raiseIssue.successSub')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {err && <Alert tone="error">{err}</Alert>}
          <p className="text-[13px] text-ink-soft">{t('raiseIssue.subtitle')}</p>

          <div role="radiogroup" aria-label={t('raiseIssue.title')} className="space-y-4">
            {disputeAllowed && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft/80">{t('raiseIssue.groupWork')}</p>
                <div className="flex flex-wrap gap-2">{pill('PAYMENT')}</div>
              </div>
            )}
            {contentAllowed && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft/80">{t('raiseIssue.groupContent')}</p>
                <div className="flex flex-wrap gap-2">{DELIVERABLE_REPORT_REASONS.map(pill)}</div>
              </div>
            )}
          </div>

          {category && (
            <p className="text-[12.5px] text-ink-soft">{isDispute ? t('workDetail.reportIssueHint') : t('raiseIssue.contentHint')}</p>
          )}

          <Textarea
            label={t('raiseIssue.descriptionLabel')}
            placeholder={t('raiseIssue.descriptionPlaceholder')}
            rows={4}
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      )}
    </Modal>
  );
}
