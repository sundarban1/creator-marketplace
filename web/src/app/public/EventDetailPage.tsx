import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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

export function EventDetailPage() {
  const t = useT();
  const { user } = useAppAuth();
  const { id = '' } = useParams();
  const { data: event, loading, error } = useAsync((s) => fetchPublicEvent(id, s), [id]);
  const [gateOpen, setGateOpen] = useState(false);

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
  let cta: React.ReactNode = null;
  if (user?.role === 'CREATOR') {
    cta = (
      <Link to={`/creator/events/${event.id}`}>
        <Button size="lg">{t('public.applyNow')}</Button>
      </Link>
    );
  } else if (!user && isOpen) {
    cta = (
      <Button size="lg" onClick={() => setGateOpen(true)}>
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
        title={t('public.eventGateTitle')}
        body={t('public.eventGateBody')}
      />
    </div>
  );
}
