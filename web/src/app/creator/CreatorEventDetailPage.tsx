import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Bookmark, CheckCircle2 } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useLiveRefresh } from '../lib/liveUpdates';
import { fetchPublicEvent } from '../api/publicMarketplace';
import { fetchMyApplications, type CreatorApplication } from '../api/creator';
import { ApiError } from '../lib/apiClient';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { EmptyState } from '../ui/EmptyState';
import { EventDetailBody, EventDetailSkeleton } from '../events/EventDetailBody';
import { ApplyProposalModal } from './ApplyProposalModal';
import { EngagementBadge } from './EngagementBadge';
import { ShareOpportunityButton } from '../events/ShareOpportunity';
import { shareTokenFor } from '../lib/shareContext';
import { useSavedEvents } from '../lib/useSavedEvents';
import { useToast } from '../ui/Toast';
import { EventQuestionsPanel } from '../events/EventQuestions';
import { EventInvitationButton } from '../events/EventInvitation';

export function CreatorEventDetailPage() {
  const t = useT();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref');

  const event = useAsync((s) => fetchPublicEvent(id, s), [id]);
  const myApps = useAsync((s) => fetchMyApplications({ limit: 100 }, s), []);
  // Live: admin edits/removes this event, or the creator's application moves.
  useLiveRefresh([`campaign:${id}`], event.refresh);
  useLiveRefresh(['applications'], myApps.refresh);

  const saved = useSavedEvents();
  const toast = useToast();
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
  // Free event + accepted = terminal (no workspace): the invitation card and
  // the organizer Q&A are this creator's whole post-acceptance surface.
  const acceptedFree = isFree && existing?.status === 'ACCEPTED';
  const isSaved = saved.isSaved(ev.id);

  async function toggleSave() {
    try {
      const nowSaved = await saved.toggle(ev.id);
      toast.success(nowSaved ? t('savedEvents.savedToast') : t('savedEvents.removedToast'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWrong'));
    }
  }

  let cta: React.ReactNode;
  if (existing) {
    cta = (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-success/30 bg-success-soft/50 px-4 py-3">
        <CheckCircle2 size={18} className="text-success" />
        <span className="text-[14px] font-semibold text-ink">{t('creatorEvents.alreadyApplied')}</span>
        <EngagementBadge state={existing.engagementState} />
        <Link
          to={`/creator/applications`}
          className="ml-auto text-[13px] font-semibold text-violet-dark hover:underline"
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

  // Submit Proposal stays primary; Share sits beside it (stacked on mobile).
  const ctaWithShare = (
    <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
      {cta}
      {acceptedFree && <EventInvitationButton campaignId={ev.id} campaignTitle={ev.title} />}
      <ShareOpportunityButton campaignId={ev.id} isOpen={isOpen} variant="button" />
      <Button
        variant="secondary"
        onClick={toggleSave}
        aria-pressed={isSaved}
        aria-label={isSaved ? t('savedEvents.unsave') : t('savedEvents.save')}
      >
        <Bookmark size={15} className={isSaved ? 'fill-violet text-violet' : ''} />
        {isSaved ? t('savedEvents.saved') : t('savedEvents.save')}
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <EventDetailBody
        event={ev}
        backTo="/creator/events"
        backLabel={t('public.backToEvents')}
        cta={ctaWithShare}
      />

      {acceptedFree && <EventQuestionsPanel campaignId={ev.id} variant="creator" celebrate />}

      {justApplied && (
        <div className="mt-10 rounded-2xl border border-success/30 bg-success-soft/40 p-6 text-center">
          <CheckCircle2 size={28} className="mx-auto text-success" />
          <p className="mt-2 text-[15px] font-semibold text-ink">{t('creatorEvents.proposalSent')}</p>
        </div>
      )}

      <ApplyProposalModal
        event={ev}
        // Share attribution — validated server-side; never affects eligibility.
        shareToken={ref ?? shareTokenFor(ev.id)}
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
