import { useState } from 'react';
import { CheckCircle2, Flag } from 'lucide-react';
import { useT } from '../i18n';
import { submitReport, type ReportReason, type ReportTargetType } from '../api/report';
import { Alert } from './Alert';
import { Button } from './Button';
import { Modal } from './Modal';
import { Textarea } from './Textarea';
import { cn } from './cn';

const REASONS: ReportReason[] = ['SPAM', 'SCAM', 'FRAUD', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'FAKE_PROFILE', 'PAYMENT_ISSUE', 'OTHER'];

/**
 * Flag button + report form — web twin of mobile's ReportModal. Caller passes
 * what's being reported; the modal owns its own open/submitted state.
 */
export function ReportButton({ targetType, targetId }: { targetType: ReportTargetType; targetId: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  function close() {
    setOpen(false);
    setReason(null);
    setDescription('');
    setSubmitted(false);
    setError('');
  }

  async function submit() {
    if (!reason) return;
    setSubmitting(true);
    setError('');
    try {
      await submitReport(targetType, targetId, reason, description.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reportModal.failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('reportModal.title')}
        title={t('reportModal.title')}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-line-strong text-ink-soft hover:text-danger"
      >
        <Flag size={15} />
      </button>

      <Modal
        open={open}
        onClose={() => (submitting ? null : close())}
        title={t('reportModal.title')}
        footer={
          submitted ? (
            <div className="flex justify-end">
              <Button onClick={close}>{t('reportModal.done')}</Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={close} disabled={submitting}>
                {t('common.cancel')}
              </Button>
              <Button variant="danger" onClick={submit} loading={submitting} disabled={!reason}>
                {t('reportModal.submitBtn')}
              </Button>
            </div>
          )
        }
      >
        {submitted ? (
          <div className="py-4 text-center">
            <CheckCircle2 size={30} className="mx-auto text-success" />
            <p className="mt-2 text-[15px] font-semibold text-ink">{t('reportModal.successTitle')}</p>
            <p className="mt-1 text-[13px] text-ink-soft">{t('reportModal.successSub')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[13px] text-ink-soft">{t('reportModal.subtitle')}</p>
            <div role="radiogroup" aria-label={t('reportModal.title')} className="flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={reason === r}
                  onClick={() => setReason(r)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                    reason === r ? 'border-danger bg-danger/10 text-danger' : 'border-line-strong text-ink hover:bg-surface-dim',
                  )}
                >
                  {t(`reportModal.reason${r}`)}
                </button>
              ))}
            </div>
            <Textarea
              label={t('reportModal.descriptionLabel')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('reportModal.descriptionPlaceholder')}
              maxLength={1000}
              rows={3}
            />
            {error && <Alert tone="error">{error}</Alert>}
          </div>
        )}
      </Modal>
    </>
  );
}
