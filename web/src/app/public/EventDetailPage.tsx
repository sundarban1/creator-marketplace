import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useT } from '../i18n';
import { useAppAuth } from '../auth/AppAuthContext';
import { useAsync } from '../lib/useAsync';
import { fetchPublicEvent } from '../api/publicMarketplace';
import { ApiError } from '../lib/apiClient';
import { SEO } from '../../lib/seo/SEO';
import { absoluteUrl } from '../../lib/seo/config';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { EventDetailBody, EventDetailSkeleton } from '../events/EventDetailBody';
import { SignupGateModal } from './SignupGateModal';
import { ShareOpportunityButton } from '../events/ShareOpportunity';
import { recordShareVisit } from '../api/opportunityShare';
import { markShareReturnPending, rememberSharedOpportunity, shareTokenFor } from '../lib/shareContext';

// Share-link opens already recorded in this page load — StrictMode's double
// effect run (and re-renders) must not double-count a click.
const visitedShareTokens = new Set<string>();

export function EventDetailPage() {
  const t = useT();
  const { user } = useAppAuth();
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref');
  const { data: event, loading, error } = useAsync((s) => fetchPublicEvent(id, s), [id]);
  const [gateOpen, setGateOpen] = useState(false);

  // Share Opportunity: record the click and keep the attribution (and, for an
  // anonymous visitor, a signed click receipt) through any login/signup that
  // follows. Fire-and-forget — tracking never blocks or alters the page.
  useEffect(() => {
    if (!ref || visitedShareTokens.has(ref)) return;
    visitedShareTokens.add(ref);
    recordShareVisit(ref)
      .then((v) => {
        if (v.valid) rememberSharedOpportunity(ref, v.campaignId, v.receipt);
      })
      .catch(() => {});
  }, [ref]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
        <EventDetailSkeleton />
      </div>
    );
  }

  if (error || !event) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          variant={notFound ? 'not-found' : 'error'}
          title={t('public.eventNotFoundTitle')}
          description={t('public.eventNotFoundBody')}
          action={{ label: t('public.backToHome'), href: '/' }}
        />
      </div>
    );
  }

  const isOpen = event.status === 'ACTIVE';
  // The `?ref=` this visitor arrived with (or remembered from an earlier open
  // of the same link) rides along into the creator app so the proposal is
  // attributed to the share.
  const shareRef = ref ?? shareTokenFor(event.id);
  let cta: React.ReactNode = null;
  if (user?.role === 'CREATOR') {
    cta = (
      <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
        <Link to={`/creator/events/${event.id}${shareRef ? `?ref=${encodeURIComponent(shareRef)}` : ''}`}>
          <Button size="lg" fullWidth>{t('public.applyNow')}</Button>
        </Link>
        <ShareOpportunityButton campaignId={event.id} isOpen={isOpen} variant="button" />
      </div>
    );
  } else if (!user && isOpen) {
    cta = (
      <Button
        size="lg"
        onClick={() => {
          // Login/signup (and onboarding) return here instead of the dashboard.
          markShareReturnPending(event.id);
          setGateOpen(true);
        }}
      >
        {t('public.applyNow')}
      </Button>
    );
  }

  // See BusinessProfilePage's canonicalPath comment — same slug-preferred,
  // id-fallback pattern.
  const canonicalPath = `/events/${event.slug ?? event.id}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      <SEO
        title={event.title}
        description={event.description.slice(0, 155)}
        path={canonicalPath}
        image={event.featureImageUrl ?? undefined}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'JobPosting',
          title: event.title,
          description: event.description,
          datePosted: event.createdAt,
          validThrough: event.deadline,
          hiringOrganization: { '@type': 'Organization', name: event.business.businessName },
          jobLocationType: event.locationType === 'REMOTE' ? 'TELECOMMUTE' : undefined,
          url: absoluteUrl(canonicalPath),
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: 'NPR',
            value: {
              '@type': 'QuantitativeValue',
              minValue: event.budgetMin,
              maxValue: event.budgetMax,
              unitText: 'PER_CREATOR',
            },
          },
        }}
      />

      <EventDetailBody event={event} backTo="/" backLabel={t('public.backToHome')} cta={cta} />

      <SignupGateModal
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        title={t('shareOpportunity.gateTitle')}
        body={t('shareOpportunity.gateBody')}
        signupLabel={t('shareOpportunity.createAccount')}
        loginLabel={t('shareOpportunity.login')}
      />
    </div>
  );
}
