import { useState, type FormEvent } from 'react';
import { Sparkles } from 'lucide-react';
import { useT } from '../i18n';
import { rupees } from '../lib/format';
import { applyToCampaign, type CreatorApplication } from '../api/creator';
import { ApiError } from '../lib/apiClient';
import { generateCoverLetterTemplate } from '../lib/coverLetterTemplates';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { TextField } from '../ui/TextField';
import { Alert } from '../ui/Alert';
import type { EventCard as EventData } from '../api/publicMarketplace';

const MIN_COVER = 50;
// Sent to the backend (timeline is a required field there) without asking the
// creator to fill it in — same default the mobile app's proposal form uses.
const DEFAULT_TIMELINE = '2 weeks';

export function ApplyProposalModal({
  event,
  open,
  onClose,
  onApplied,
}: {
  event: EventData;
  open: boolean;
  onClose: () => void;
  onApplied: (application: CreatorApplication) => void;
}) {
  const t = useT();
  const isFree = event.campaignType === 'OPEN_EVENT';
  const isFixed = event.budgetMin === event.budgetMax;

  const [coverLetter, setCoverLetter] = useState(() =>
    generateCoverLetterTemplate(event.category, event.title, event.business?.businessName ?? ''),
  );
  const [rate, setRate] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ cover?: string; rate?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const regenerateCoverLetter = () => {
    setCoverLetter(generateCoverLetterTemplate(event.category, event.title, event.business?.businessName ?? ''));
  };

  const rateHint = isFree
    ? t('creatorEvents.proposedRateHintFree')
    : isFixed
      ? t('creatorEvents.proposedRateHintMax', { max: event.budgetMax.toLocaleString('en-IN') })
      : t('creatorEvents.proposedRateHintRange', {
          min: event.budgetMin.toLocaleString('en-IN'),
          max: event.budgetMax.toLocaleString('en-IN'),
        });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const fe: typeof fieldErrors = {};
    if (coverLetter.trim().length < MIN_COVER) fe.cover = t('creatorEvents.coverLetterTooShort');

    const numRate = isFree ? 0 : Number(rate);
    if (!isFree) {
      if (!rate.trim() || Number.isNaN(numRate)) {
        fe.rate = t('creatorEvents.rateRequired');
      } else if (isFixed && numRate > event.budgetMax) {
        fe.rate = t('creatorEvents.rateTooHigh', { max: event.budgetMax.toLocaleString('en-IN') });
      } else if (!isFixed && (numRate < event.budgetMin || numRate > event.budgetMax)) {
        fe.rate = t('creatorEvents.rateOutOfRange', {
          min: event.budgetMin.toLocaleString('en-IN'),
          max: event.budgetMax.toLocaleString('en-IN'),
        });
      } else if (numRate <= 0) {
        fe.rate = t('creatorEvents.rateRequired');
      }
    }

    setFieldErrors(fe);
    if (Object.keys(fe).length > 0) return;

    setSubmitting(true);
    try {
      const application = await applyToCampaign(event.id, {
        coverLetter: coverLetter.trim(),
        proposedRate: numRate,
        timeline: DEFAULT_TIMELINE,
        portfolioUrl: portfolioUrl.trim() || undefined,
      });
      onApplied(application);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t('creatorEvents.alreadyApplied'));
      } else {
        setError(err instanceof Error ? err.message : t('common.somethingWrong'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('creatorEvents.proposalTitle')}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button form="apply-form" type="submit" loading={submitting}>
            {t('creatorEvents.submitProposal')}
          </Button>
        </div>
      }
    >
      <form id="apply-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}

        <Textarea
          label={t('creatorEvents.coverLetter')}
          hint={t('creatorEvents.coverLetterAutoHint')}
          error={fieldErrors.cover}
          showCount
          rows={5}
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          labelAccessory={
            <button
              type="button"
              onClick={regenerateCoverLetter}
              className="inline-flex flex-shrink-0 items-center gap-1 text-[12.5px] font-semibold text-violet-dark hover:underline"
            >
              <Sparkles size={12} />
              {t('profile.regenerate')}
            </button>
          }
        />

        {!isFree && (
          <TextField
            label={t('creatorEvents.proposedRate')}
            type="number"
            inputMode="numeric"
            min={0}
            hint={rateHint}
            error={fieldErrors.rate}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        )}
        {isFree && <Alert tone="info">{rateHint}</Alert>}

        <TextField
          label={`${t('creatorEvents.portfolioUrl')} (${t('common.optional')})`}
          type="url"
          inputMode="url"
          placeholder="https://"
          value={portfolioUrl}
          onChange={(e) => setPortfolioUrl(e.target.value)}
        />

        <p className="text-[12px] text-ink-soft">
          {isFree ? '' : `${t('public.budgetPerCreatorLabel')}: ${rupees(event.budgetMin)}${
            isFixed ? '' : ` – ${rupees(event.budgetMax)}`
          }`}
        </p>
      </form>
    </Modal>
  );
}
