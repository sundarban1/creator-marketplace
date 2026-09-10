import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchPublicEvent } from '../api/publicMarketplace';
import { fetchMyApplications, type CreatorApplication } from '../api/creator';
import { ApiError } from '../lib/apiClient';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { EmptyState } from '../ui/EmptyState';
import { EventDetailBody, EventDetailSkeleton } from '../events/EventDetailBody';
import { ApplyProposalModal } from './ApplyProposalModal';
import { EngagementBadge } from './EngagementBadge';

export function CreatorEventDetailPage() {
  const t = useT();
  const navigate = useNavigate();
  const { id = '' } = useParams();

  const event = useAsync((s) => fetchPublicEvent(id, s), [id]);
  const myApps = useAsync((s) => fetchMyApplications({ limit: 100 }, s), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [justApplied, setJustApplied] = useState<CreatorApplication | null>(null);

  if (event.loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <EventDetailSkeleton />
      </div>
    );
  }

  if (event.error || !event.data) {
    const notFound = event.error instanceof ApiError && event.error.status === 404;
    return (
      <div className="mx-auto max-w-3xl py-10">
        <EmptyState
          variant={notFound ? 'not-found' : 'error'}
          title={t('public.eventNotFoundTitle')}
          description={t('public.eventNotFoundBody')}
          action={{ label: t('public.backToEvents'), href: '/creator/events' }}
        />
      </div>
    );
  }

  const ev = event.data;
  const existing =
    justApplied ?? (myApps.data?.items ?? []).find((a) => a.campaignId === ev.id) ?? null;
  const isMultiRole = (ev.requirements?.length ?? 0) > 0;
  const isOpen = ev.status === 'ACTIVE';
  const isFree = ev.campaignType === 'OPEN_EVENT';

  let cta: React.ReactNode;
  if (existing) {
    cta = (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-success/30 bg-success-soft/50 px-4 py-3">
        <CheckCircle2 size={18} className="text-success" />
        <span className="text-[14px] font-semibold text-ink">{t('creatorEvents.alreadyApplied')}</span>
        <EngagementBadge state={existing.engagementState} />
        <Link
          to={`/creator/applications`}
          className="ml-auto text-[13px] font-semibold text-brand hover:underline"
        >
          {t('creatorEvents.viewApplication')}
        </Link>
      </div>
    );
  } else if (!isOpen) {
    cta = <Alert tone="info">{t('creatorEvents.notAccepting')}</Alert>;
  } else if (isMultiRole) {
    cta = (
      <a href="/" className="inline-block">
        <Button size="lg">{t('public.applyInApp')}</Button>
      </a>
    );
  } else {
    cta = (
      <Button size="lg" onClick={() => setModalOpen(true)}>
        {isFree ? t('creatorEvents.applyFree') : t('creatorEvents.apply')}
      </Button>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <EventDetailBody
        event={ev}
        backTo="/creator/events"
        backLabel={t('public.backToEvents')}
        cta={cta}
      />

      {justApplied && (
        <div className="mt-10 rounded-2xl border border-success/30 bg-success-soft/40 p-6 text-center">
          <CheckCircle2 size={28} className="mx-auto text-success" />
          <p className="mt-2 text-[15px] font-semibold text-ink">{t('creatorEvents.proposalSent')}</p>
        </div>
      )}

      <ApplyProposalModal
        event={ev}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onApplied={(application) => {
          setModalOpen(false);
          setJustApplied(application);
          myApps.reload();
          navigate(`/creator/events/${ev.id}`, { replace: true });
        }}
      />
    </div>
  );
}
